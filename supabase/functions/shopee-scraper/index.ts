import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOPEE_BASE = 'https://shopee.com.br';
const CACHE_HOURS = 12;

// ── Supabase client for caching ──────────────────────────────────────
function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

// ── Browser-like headers ─────────────────────────────────────────────
function getHeaders(refererPath = '/') {
  const chromeVersion = `${120 + Math.floor(Math.random() * 15)}`;
  return {
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`,
    'Accept': 'application/json',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': `${SHOPEE_BASE}${refererPath}`,
    'Origin': SHOPEE_BASE,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Ch-Ua': `"Chromium";v="${chromeVersion}", "Not_A Brand";v="24"`,
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'X-Shopee-Language': 'pt-BR',
    'X-Requested-With': 'XMLHttpRequest',
    'Cookie': `SPC_F=tmp_${Date.now()}; SPC_EC=-; SPC_U=-;`,
  };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function convertPrice(raw: number): number {
  return raw / 100000;
}

// ── Retry with exponential backoff ───────────────────────────────────
async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 3): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) return response;

      if (response.status === 403 && i < retries) {
        const wait = (1000 * Math.pow(2, i)) + Math.random() * 2000;
        console.log(`403 received, retry ${i + 1}/${retries} after ${Math.round(wait)}ms`);
        await delay(wait);
        continue;
      }
      return response;
    } catch (err) {
      if (i === retries) throw err;
      await delay(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}

// ── Parse product from API response ──────────────────────────────────
function parseProduct(item: any) {
  return {
    title: item.name || item.title || '',
    price: convertPrice(item.price || item.price_max || 0),
    priceMin: convertPrice(item.price_min || item.price || 0),
    priceMax: convertPrice(item.price_max || item.price || 0),
    historicalSold: item.historical_sold || item.sold || 0,
    stock: item.stock || 0,
    ratingCount: item.cmt_count || item.item_rating?.rating_count?.[0] || 0,
    ratingAvg: item.item_rating?.rating_star || 0,
    category: item.categories?.[item.categories.length - 1]?.display_name || item.catid?.toString() || '',
    shopName: item.shop_name || item.shop_location || '',
    shopid: item.shopid,
    itemid: item.itemid,
    image: item.image ? `https://down-br.img.susercontent.com/file/${item.image}` : '',
  };
}

// ── Parse product from HTML page (scraping fallback) ─────────────────
function parseProductFromHtml(html: string, shopid: string, itemid: string) {
  try {
    // Try extracting JSON-LD or embedded data
    const jsonMatch = html.match(/"item":\s*(\{[^}]{100,}?\})/s) 
      || html.match(/"itemData":\s*(\{[^}]{100,}?\})/s);
    
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        return parseProduct({ ...data, shopid: parseInt(shopid), itemid: parseInt(itemid) });
      } catch {}
    }

    // Fallback: parse meta tags and structured data
    const getMetaContent = (name: string) => {
      const m = html.match(new RegExp(`<meta[^>]*(?:property|name)="${name}"[^>]*content="([^"]*)"`, 'i'));
      return m?.[1] || '';
    };

    const title = getMetaContent('og:title') || getMetaContent('title') || '';
    const priceStr = getMetaContent('product:price:amount') || '0';
    const image = getMetaContent('og:image') || '';
    const description = getMetaContent('og:description') || '';

    // Extract price from description or page content
    const priceMatch = html.match(/R\$\s*([\d.,]+)/);
    const price = parseFloat(priceStr) || (priceMatch ? parseFloat(priceMatch[1].replace('.', '').replace(',', '.')) : 0);

    // Extract rating
    const ratingMatch = html.match(/"rating_star"\s*:\s*([\d.]+)/);
    const ratingAvg = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // Extract sales
    const soldMatch = html.match(/"historical_sold"\s*:\s*(\d+)/) || html.match(/"sold"\s*:\s*(\d+)/);
    const historicalSold = soldMatch ? parseInt(soldMatch[1]) : 0;

    // Extract stock
    const stockMatch = html.match(/"stock"\s*:\s*(\d+)/);
    const stock = stockMatch ? parseInt(stockMatch[1]) : 0;

    // Extract rating count
    const ratingCountMatch = html.match(/"cmt_count"\s*:\s*(\d+)/) || html.match(/"rating_count"\s*:\s*\[(\d+)/);
    const ratingCount = ratingCountMatch ? parseInt(ratingCountMatch[1]) : 0;

    if (!title && !price) {
      return null;
    }

    return {
      title: title.replace(' | Shopee Brasil', ''),
      price,
      priceMin: price,
      priceMax: price,
      historicalSold,
      stock,
      ratingCount,
      ratingAvg,
      category: '',
      shopName: '',
      shopid: parseInt(shopid),
      itemid: parseInt(itemid),
      image,
    };
  } catch (err) {
    console.error('HTML parsing failed:', err);
    return null;
  }
}

// ── Cache: check for recent data ─────────────────────────────────────
async function getCachedProduct(supabase: any, shopid: string, itemid: string) {
  const cutoff = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('produtos_analisados')
    .select('*')
    .eq('shopid', parseInt(shopid))
    .eq('itemid', parseInt(itemid))
    .gte('data_coleta', cutoff)
    .order('data_coleta', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const row = data[0];
    return {
      title: row.titulo,
      price: parseFloat(row.preco),
      priceMin: parseFloat(row.preco),
      priceMax: parseFloat(row.preco),
      historicalSold: row.vendas,
      stock: row.estoque || 0,
      ratingCount: row.avaliacoes,
      ratingAvg: parseFloat(row.avaliacao_media || '0'),
      category: row.categoria || '',
      shopName: row.nome_loja || '',
      shopid: row.shopid,
      itemid: row.itemid,
      image: '',
      _cached: true,
    };
  }
  return null;
}

// ── Save product to cache ────────────────────────────────────────────
async function saveToCache(supabase: any, product: any, score: number) {
  try {
    await supabase.from('produtos_analisados').insert({
      titulo: product.title,
      preco: product.price,
      vendas: product.historicalSold,
      avaliacoes: product.ratingCount,
      avaliacao_media: product.ratingAvg,
      categoria: product.category || null,
      plataforma: 'shopee',
      shopid: product.shopid,
      itemid: product.itemid,
      nome_loja: product.shopName || null,
      estoque: product.stock,
      score_oportunidade: score,
    });
  } catch (err) {
    console.error('Cache save failed:', err);
  }
}

// ── Fetch product details (API → HTML fallback) ──────────────────────
async function fetchProductDetails(shopid: string, itemid: string) {
  // Strategy 1: Shopee v4 API
  try {
    const v4Url = `${SHOPEE_BASE}/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;
    console.log('Strategy 1: v4 API');
    const response = await fetchWithRetry(v4Url, getHeaders(`/product-i.${shopid}.${itemid}`));
    
    if (response.ok) {
      const json = await response.json();
      const item = json.data || json.item;
      if (item) return parseProduct(item);
    }
  } catch (err) {
    console.log('v4 API failed:', err);
  }

  // Strategy 2: Shopee v2 API
  try {
    const v2Url = `${SHOPEE_BASE}/api/v2/item/get?itemid=${itemid}&shopid=${shopid}`;
    console.log('Strategy 2: v2 API');
    await delay(500 + Math.random() * 500);
    const response = await fetchWithRetry(v2Url, getHeaders(`/product-i.${shopid}.${itemid}`));
    
    if (response.ok) {
      const json = await response.json();
      const item = json.data || json.item;
      if (item) return parseProduct(item);
    }
  } catch (err) {
    console.log('v2 API failed:', err);
  }

  // Strategy 3: Scrape product page HTML
  try {
    const pageUrl = `${SHOPEE_BASE}/product-i.${shopid}.${itemid}`;
    console.log('Strategy 3: HTML scraping');
    await delay(800 + Math.random() * 700);
    const response = await fetchWithRetry(pageUrl, {
      ...getHeaders('/'),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });

    if (response.ok) {
      const html = await response.text();
      const parsed = parseProductFromHtml(html, shopid, itemid);
      if (parsed) return parsed;
    }
  } catch (err) {
    console.log('HTML scraping failed:', err);
  }

  throw new Error('Não foi possível obter dados do produto. A Shopee pode estar bloqueando requisições. Tente novamente em alguns minutos.');
}

// ── Search products ──────────────────────────────────────────────────
async function searchProducts(keyword: string, limit = 50) {
  const endpoints = [
    {
      label: 'v4 search',
      url: `${SHOPEE_BASE}/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`,
    },
    {
      label: 'v2 search',
      url: `${SHOPEE_BASE}/api/v2/search_items/?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search`,
    },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying ${endpoint.label}`);
      const response = await fetchWithRetry(
        endpoint.url,
        getHeaders(`/search?keyword=${encodeURIComponent(keyword)}`)
      );

      if (response.ok) {
        const json = await response.json();
        const items = json.items || json.data?.items || [];
        if (items.length > 0) {
          return items.map((entry: any) => {
            const item = entry.item_basic || entry;
            return parseProduct(item);
          });
        }
      }
    } catch (err) {
      console.log(`${endpoint.label} failed:`, err);
    }
    await delay(600 + Math.random() * 600);
  }

  // Strategy 3: scrape search page HTML
  try {
    console.log('Trying HTML search scrape');
    const searchUrl = `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(keyword)}`;
    const response = await fetchWithRetry(searchUrl, {
      ...getHeaders('/'),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });

    if (response.ok) {
      const html = await response.text();
      // Try to extract product data from embedded JSON
      const scriptMatch = html.match(/"listItems"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
      if (scriptMatch) {
        try {
          const items = JSON.parse(scriptMatch[1]);
          return items.slice(0, limit).map((item: any) => parseProduct(item));
        } catch {}
      }
    }
  } catch (err) {
    console.log('HTML search scrape failed:', err);
  }

  return [];
}

// ── Opportunity score calculation ────────────────────────────────────
function calculateOpportunityScore(
  avgSales: number,
  competitors: number,
  avgRating: number,
  priceVsAvg: number
): number {
  const demandScore = Math.min(avgSales / 50, 100);
  const competitionScore = Math.max(100 - (competitors * 2), 0);
  const ratingScore = (avgRating / 5) * 100;
  const priceScore = priceVsAvg <= 1
    ? (2 - priceVsAvg) * 100
    : Math.max(100 - (priceVsAvg - 1) * 200, 0);

  const score = Math.round(
    demandScore * 0.4 +
    competitionScore * 0.3 +
    ratingScore * 0.2 +
    Math.min(priceScore, 100) * 0.1
  );

  return Math.min(Math.max(score, 0), 100);
}

// ── Market metrics calculation ───────────────────────────────────────
function calculateMarketMetrics(products: any[], originalPrice?: number) {
  if (products.length === 0) {
    return { avgPrice: 0, minPrice: 0, maxPrice: 0, avgSales: 0, competitors: 0, estimatedRevenue: 0, opportunityScore: 0 };
  }

  const prices = products.map((p: any) => p.price).filter((p: number) => p > 0);
  const sales = products.map((p: any) => p.historicalSold);
  const ratings = products.map((p: any) => p.ratingAvg).filter((r: number) => r > 0);

  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgSales = Math.round(sales.reduce((a: number, b: number) => a + b, 0) / sales.length);
  const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
  const competitors = products.length;
  const estimatedRevenue = Math.round(avgPrice * avgSales);

  const priceVsAvg = originalPrice ? originalPrice / avgPrice : 1;
  const opportunityScore = calculateOpportunityScore(avgSales, competitors, avgRating, priceVsAvg);

  return { avgPrice, minPrice, maxPrice, avgSales, avgRating, competitors, estimatedRevenue, opportunityScore };
}

// ── Main handler ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, url, keyword, shopid, itemid, limit, filters } = await req.json();
    const supabase = getSupabaseClient();

    // ── ANALYZE LINK ──
    if (action === 'analyze_link') {
      const match = url?.match(/i\.(\d+)\.(\d+)/);
      if (!match) {
        return new Response(
          JSON.stringify({ success: false, error: 'Link inválido. Use um link de produto da Shopee (ex: https://shopee.com.br/produto-i.123.456)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const extractedShopid = match[1];
      const extractedItemid = match[2];

      // Check cache first
      const cached = await getCachedProduct(supabase, extractedShopid, extractedItemid);
      let product;
      let fromCache = false;

      if (cached) {
        console.log('Using cached product data');
        product = cached;
        fromCache = true;
      } else {
        product = await fetchProductDetails(extractedShopid, extractedItemid);
      }

      // Search competitors
      const keywords = product.title
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 4)
        .join(' ');

      await delay(600 + Math.random() * 600);
      const competitors = await searchProducts(keywords, 50);
      const metrics = calculateMarketMetrics(competitors, product.price);

      // Save to cache if not from cache
      if (!fromCache) {
        await saveToCache(supabase, product, metrics.opportunityScore);
      }

      return new Response(
        JSON.stringify({
          success: true,
          product,
          competitors: competitors.slice(0, 20),
          metrics,
          fromCache,
          dataSource: fromCache ? 'cache' : 'live',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── SEARCH ──
    if (action === 'search') {
      if (!keyword) {
        return new Response(
          JSON.stringify({ success: false, error: 'Palavra-chave é obrigatória' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const products = await searchProducts(keyword, limit || 50);

      let filtered = products;
      if (filters) {
        if (filters.minPrice) filtered = filtered.filter((p: any) => p.price >= filters.minPrice);
        if (filters.maxPrice) filtered = filtered.filter((p: any) => p.price <= filters.maxPrice);
        if (filters.minSales) filtered = filtered.filter((p: any) => p.historicalSold >= filters.minSales);
        if (filters.minRating) filtered = filtered.filter((p: any) => p.ratingAvg >= filters.minRating);
      }

      const metrics = calculateMarketMetrics(filtered);

      const withScores = filtered.map((p: any) => ({
        ...p,
        score: calculateOpportunityScore(
          p.historicalSold,
          filtered.length,
          p.ratingAvg,
          metrics.avgPrice > 0 ? p.price / metrics.avgPrice : 1
        ),
      }));

      // Save top results to cache
      for (const p of withScores.slice(0, 5)) {
        await saveToCache(supabase, p, p.score);
      }

      return new Response(
        JSON.stringify({ success: true, products: withScores, metrics, total: products.length, filtered: filtered.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── PRODUCT DETAILS ──
    if (action === 'product_details') {
      if (!shopid || !itemid) {
        return new Response(
          JSON.stringify({ success: false, error: 'shopid e itemid são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check cache
      const cached = await getCachedProduct(supabase, shopid, itemid);
      if (cached) {
        return new Response(
          JSON.stringify({ success: true, product: cached, fromCache: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const product = await fetchProductDetails(shopid, itemid);
      await saveToCache(supabase, product, 0);

      return new Response(
        JSON.stringify({ success: true, product, fromCache: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação inválida. Use: analyze_link, search, ou product_details' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in shopee-scraper:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
