import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOPEE_BASE = 'https://shopee.com.br';
const CACHE_HOURS = 12;

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

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

function parseProduct(item: any) {
  const ctime = item.ctime || item.cmt_time || 0;
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
    ctime,
    shopRating: item.shop_rating || 0,
    shopFollowers: item.follower_count || 0,
    shopResponseRate: item.response_rate || 0,
    shopLocation: item.shop_location || '',
    liked: item.liked_count || item.liked || 0,
    viewCount: item.view_count || 0,
    ratingDetail: item.item_rating?.rating_count || [],
  };
}

function parseProductFromHtml(html: string, shopid: string, itemid: string) {
  try {
    const jsonMatch = html.match(/"item":\s*(\{[^}]{100,}?\})/s)
      || html.match(/"itemData":\s*(\{[^}]{100,}?\})/s);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        return parseProduct({ ...data, shopid: parseInt(shopid), itemid: parseInt(itemid) });
      } catch {}
    }
    const getMetaContent = (name: string) => {
      const m = html.match(new RegExp(`<meta[^>]*(?:property|name)="${name}"[^>]*content="([^"]*)"`, 'i'));
      return m?.[1] || '';
    };
    const title = getMetaContent('og:title') || getMetaContent('title') || '';
    const priceStr = getMetaContent('product:price:amount') || '0';
    const image = getMetaContent('og:image') || '';
    const priceMatch = html.match(/R\$\s*([\d.,]+)/);
    const price = parseFloat(priceStr) || (priceMatch ? parseFloat(priceMatch[1].replace('.', '').replace(',', '.')) : 0);
    const ratingMatch = html.match(/"rating_star"\s*:\s*([\d.]+)/);
    const ratingAvg = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    const soldMatch = html.match(/"historical_sold"\s*:\s*(\d+)/) || html.match(/"sold"\s*:\s*(\d+)/);
    const historicalSold = soldMatch ? parseInt(soldMatch[1]) : 0;
    const stockMatch = html.match(/"stock"\s*:\s*(\d+)/);
    const stock = stockMatch ? parseInt(stockMatch[1]) : 0;
    const ratingCountMatch = html.match(/"cmt_count"\s*:\s*(\d+)/) || html.match(/"rating_count"\s*:\s*\[(\d+)/);
    const ratingCount = ratingCountMatch ? parseInt(ratingCountMatch[1]) : 0;
    const ctimeMatch = html.match(/"ctime"\s*:\s*(\d+)/);
    const ctime = ctimeMatch ? parseInt(ctimeMatch[1]) : 0;
    if (!title && !price) return null;
    return {
      title: title.replace(' | Shopee Brasil', ''),
      price, priceMin: price, priceMax: price,
      historicalSold, stock, ratingCount, ratingAvg,
      category: '', shopName: '',
      shopid: parseInt(shopid), itemid: parseInt(itemid),
      image, ctime,
      shopRating: 0, shopFollowers: 0, shopResponseRate: 0, shopLocation: '',
      liked: 0, viewCount: 0, ratingDetail: [],
    };
  } catch (err) {
    console.error('HTML parsing failed:', err);
    return null;
  }
}

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
      title: row.titulo, price: parseFloat(row.preco), priceMin: parseFloat(row.preco), priceMax: parseFloat(row.preco),
      historicalSold: row.vendas, stock: row.estoque || 0, ratingCount: row.avaliacoes,
      ratingAvg: parseFloat(row.avaliacao_media || '0'), category: row.categoria || '',
      shopName: row.nome_loja || '', shopid: row.shopid, itemid: row.itemid, image: '',
      _cached: true, ctime: 0, shopRating: 0, shopFollowers: 0, shopResponseRate: 0,
      shopLocation: '', liked: 0, viewCount: 0, ratingDetail: [],
    };
  }
  return null;
}

async function saveToCache(supabase: any, product: any, score: number) {
  try {
    await supabase.from('produtos_analisados').insert({
      titulo: product.title, preco: product.price, vendas: product.historicalSold,
      avaliacoes: product.ratingCount, avaliacao_media: product.ratingAvg,
      categoria: product.category || null, plataforma: 'shopee',
      shopid: product.shopid, itemid: product.itemid,
      nome_loja: product.shopName || null, estoque: product.stock,
      score_oportunidade: score,
    });
  } catch (err) { console.error('Cache save failed:', err); }
}

async function fetchProductDetails(shopid: string, itemid: string) {
  try {
    const v4Url = `${SHOPEE_BASE}/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;
    console.log('Strategy 1: v4 API');
    const response = await fetchWithRetry(v4Url, getHeaders(`/product-i.${shopid}.${itemid}`));
    if (response.ok) { const json = await response.json(); const item = json.data || json.item; if (item) return parseProduct(item); }
  } catch (err) { console.log('v4 API failed:', err); }

  try {
    const v2Url = `${SHOPEE_BASE}/api/v2/item/get?itemid=${itemid}&shopid=${shopid}`;
    console.log('Strategy 2: v2 API'); await delay(500 + Math.random() * 500);
    const response = await fetchWithRetry(v2Url, getHeaders(`/product-i.${shopid}.${itemid}`));
    if (response.ok) { const json = await response.json(); const item = json.data || json.item; if (item) return parseProduct(item); }
  } catch (err) { console.log('v2 API failed:', err); }

  try {
    const pageUrl = `${SHOPEE_BASE}/product-i.${shopid}.${itemid}`;
    console.log('Strategy 3: HTML scraping'); await delay(800 + Math.random() * 700);
    const response = await fetchWithRetry(pageUrl, { ...getHeaders('/'), 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' });
    if (response.ok) { const html = await response.text(); const parsed = parseProductFromHtml(html, shopid, itemid); if (parsed) return parsed; }
  } catch (err) { console.log('HTML scraping failed:', err); }

  throw new Error('Não foi possível obter dados do produto. A Shopee pode estar bloqueando requisições. Tente novamente em alguns minutos.');
}

async function searchProducts(keyword: string, limit = 50) {
  const endpoints = [
    { label: 'v4 search', url: `${SHOPEE_BASE}/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2` },
    { label: 'v2 search', url: `${SHOPEE_BASE}/api/v2/search_items/?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search` },
  ];
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying ${endpoint.label}`);
      const response = await fetchWithRetry(endpoint.url, getHeaders(`/search?keyword=${encodeURIComponent(keyword)}`));
      if (response.ok) {
        const json = await response.json();
        const items = json.items || json.data?.items || [];
        if (items.length > 0) return items.map((entry: any) => parseProduct(entry.item_basic || entry));
      }
    } catch (err) { console.log(`${endpoint.label} failed:`, err); }
    await delay(600 + Math.random() * 600);
  }
  try {
    console.log('Trying HTML search scrape');
    const searchUrl = `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(keyword)}`;
    const response = await fetchWithRetry(searchUrl, { ...getHeaders('/'), 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' });
    if (response.ok) {
      const html = await response.text();
      const scriptMatch = html.match(/"listItems"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
      if (scriptMatch) { try { return JSON.parse(scriptMatch[1]).slice(0, limit).map((item: any) => parseProduct(item)); } catch {} }
    }
  } catch (err) { console.log('HTML search scrape failed:', err); }
  return [];
}

function calculateOpportunityScore(avgSales: number, competitors: number, avgRating: number, priceVsAvg: number): number {
  const demandScore = Math.min(avgSales / 50, 100);
  const competitionScore = Math.max(100 - (competitors * 2), 0);
  const ratingScore = (avgRating / 5) * 100;
  const priceScore = priceVsAvg <= 1 ? (2 - priceVsAvg) * 100 : Math.max(100 - (priceVsAvg - 1) * 200, 0);
  const score = Math.round(demandScore * 0.4 + competitionScore * 0.3 + ratingScore * 0.2 + Math.min(priceScore, 100) * 0.1);
  return Math.min(Math.max(score, 0), 100);
}

// ── Performance score for individual product ──
function calculatePerformanceScore(product: any, competitors: any[]): number {
  const maxSales = Math.max(...competitors.map((c: any) => c.historicalSold), product.historicalSold, 1);
  const maxReviews = Math.max(...competitors.map((c: any) => c.ratingCount), product.ratingCount, 1);
  const salesScore = (product.historicalSold / maxSales) * 100;
  const ratingScore = (product.ratingAvg / 5) * 100;
  const reviewScore = (product.ratingCount / maxReviews) * 100;
  const stockHealthy = product.stock > 0 ? 10 : 0;
  const score = Math.round(salesScore * 0.35 + ratingScore * 0.25 + reviewScore * 0.25 + stockHealthy + (product.liked > 0 ? 5 : 0));
  return Math.min(Math.max(score, 0), 100);
}

// ── Winner classification ──
function classifyProduct(score: number): { label: string; level: string } {
  if (score >= 80) return { label: 'Produto Vencedor', level: 'winner' };
  if (score >= 60) return { label: 'Alto Potencial', level: 'high' };
  if (score >= 40) return { label: 'Potencial Médio', level: 'medium' };
  return { label: 'Baixo Potencial', level: 'low' };
}

// ── Estimate listing age and sales velocity ──
function estimateSalesMetrics(product: any) {
  let listingAgeDays = 0;
  if (product.ctime && product.ctime > 0) {
    listingAgeDays = Math.max(1, Math.floor((Date.now() / 1000 - product.ctime) / 86400));
  } else {
    // Estimate from sales volume
    listingAgeDays = Math.max(30, Math.round(product.historicalSold / 3));
  }
  const salesPerDay = listingAgeDays > 0 ? Math.round((product.historicalSold / listingAgeDays) * 100) / 100 : 0;
  const salesLast30 = Math.round(salesPerDay * 30);
  const salesLast7 = Math.round(salesPerDay * 7);
  return { listingAgeDays, salesPerDay, salesLast30, salesLast7 };
}

function calculateMarketMetrics(products: any[], originalPrice?: number) {
  if (products.length === 0) return { avgPrice: 0, minPrice: 0, maxPrice: 0, avgSales: 0, competitors: 0, estimatedRevenue: 0, opportunityScore: 0 };
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

      const keywords = product.title.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4).join(' ');
      await delay(600 + Math.random() * 600);
      const competitors = await searchProducts(keywords, 50);
      const metrics = calculateMarketMetrics(competitors, product.price);

      // Extended analysis
      const performanceScore = calculatePerformanceScore(product, competitors);
      const classification = classifyProduct(performanceScore);
      const salesMetrics = estimateSalesMetrics(product);

      // Sentiment from rating distribution
      const rd = product.ratingDetail || [];
      const total = rd[0] || product.ratingCount || 1;
      const sentiment = {
        positive: rd[5] ? Math.round(((rd[5] + (rd[4] || 0)) / total) * 100) : (product.ratingAvg >= 4 ? 80 : 50),
        neutral: rd[3] ? Math.round((rd[3] / total) * 100) : 15,
        negative: rd[1] ? Math.round(((rd[1] + (rd[2] || 0)) / total) * 100) : (product.ratingAvg < 3 ? 40 : 5),
      };

      if (!fromCache) await saveToCache(supabase, product, performanceScore);

      return new Response(
        JSON.stringify({
          success: true,
          product,
          competitors: competitors.slice(0, 20),
          metrics,
          analysis: {
            performanceScore,
            classification,
            salesMetrics,
            sentiment,
            sellerInfo: {
              name: product.shopName,
              location: product.shopLocation,
              rating: product.shopRating,
              followers: product.shopFollowers,
              responseRate: product.shopResponseRate,
            },
          },
          fromCache,
          dataSource: fromCache ? 'cache' : 'live',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── SEARCH ──
    if (action === 'search') {
      if (!keyword) {
        return new Response(JSON.stringify({ success: false, error: 'Palavra-chave é obrigatória' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const products = await searchProducts(keyword, limit || 50);
      let filtered = products;
      if (filters) {
        if (filters.minPrice) filtered = filtered.filter((p: any) => p.price >= filters.minPrice);
        if (filters.maxPrice) filtered = filtered.filter((p: any) => p.price <= filters.maxPrice);
        if (filters.minSales) filtered = filtered.filter((p: any) => p.historicalSold >= filters.minSales);
        if (filters.minRating) filtered = filtered.filter((p: any) => p.ratingAvg >= filters.minRating);
      }
      const mets = calculateMarketMetrics(filtered);
      const withScores = filtered.map((p: any) => ({
        ...p,
        score: calculateOpportunityScore(p.historicalSold, filtered.length, p.ratingAvg, mets.avgPrice > 0 ? p.price / mets.avgPrice : 1),
      }));
      for (const p of withScores.slice(0, 5)) await saveToCache(supabase, p, p.score);
      return new Response(JSON.stringify({ success: true, products: withScores, metrics: mets, total: products.length, filtered: filtered.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── PRODUCT DETAILS ──
    if (action === 'product_details') {
      if (!shopid || !itemid) {
        return new Response(JSON.stringify({ success: false, error: 'shopid e itemid são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const cached2 = await getCachedProduct(supabase, shopid, itemid);
      if (cached2) return new Response(JSON.stringify({ success: true, product: cached2, fromCache: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const product = await fetchProductDetails(shopid, itemid);
      await saveToCache(supabase, product, 0);
      return new Response(JSON.stringify({ success: true, product, fromCache: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'Ação inválida. Use: analyze_link, search, ou product_details' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in shopee-scraper:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
