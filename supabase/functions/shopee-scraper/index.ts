import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── STEP 1: URL PARSING ───────────────────────────────────────────────────────

function extractIds(url: string): { shopid: string; itemid: string } | null {
  const match = url.match(/i\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { shopid: match[1], itemid: match[2] };
}

// ─── STEP 2: FETCH FROM SHOPEE API ─────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
];

function getApiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  return {
    'User-Agent': userAgent,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://shopee.com.br/',
    'Origin': 'https://shopee.com.br',
    'X-Shopee-Language': 'pt-BR',
    'X-Requested-With': 'XMLHttpRequest',
    'X-API-SOURCE': 'pc',
    'af-ac-enc-dat': 'null',
    ...extra,
  };
}

async function fetchWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractItemFromEnvelope(payload: any): any | null {
  const item = payload?.data?.item || payload?.item || payload?.data || null;
  if (!item) return null;
  if (item.error === 90309999 || payload?.error === 90309999) return null;
  if (!item.name && !item.title && !item.itemid && !item.item_id) return null;
  return item;
}

function extractItemFromHtml(html: string): any | null {
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/,
    /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/,
    /"item"\s*:\s*(\{[\s\S]*?"name"[\s\S]*?\})\s*[,}]/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;

    try {
      const parsed = JSON.parse(match[1]);
      const item = extractItemFromEnvelope(parsed) || parsed?.props?.pageProps?.item || parsed;
      if (item && (item.name || item.title)) return item;
    } catch {
      // continue trying
    }
  }

  return null;
}

async function fetchViaScraperApi(targetUrl: string, mode: 'json' | 'html'): Promise<string | null> {
  const scraperApiKey = Deno.env.get('SCRAPER_API_KEY');
  if (!scraperApiKey) return null;

  const params = new URLSearchParams({
    api_key: scraperApiKey,
    url: targetUrl,
    country_code: 'br',
    keep_headers: 'true',
  });

  if (mode === 'html') {
    params.set('render', 'true');
    params.set('wait_for_selector', 'body');
  }

  const scraperUrl = `https://api.scraperapi.com/?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(scraperUrl, { 'Accept': mode === 'json' ? 'application/json,*/*' : 'text/html,*/*' }, 20000);
    if (!res.ok) {
      await res.text();
      return null;
    }
    return await res.text();
  } catch (err: any) {
    console.log(`ScraperAPI ${mode} failed: ${err.message}`);
    return null;
  }
}

async function fetchShopeeApi(shopid: string, itemid: string): Promise<any> {
  const endpoints = [
    `https://shopee.com.br/api/v4/item/get?shopid=${shopid}&itemid=${itemid}`,
    `https://shopee.com.br/api/v4/pdp/get_pc?shop_id=${shopid}&item_id=${itemid}`,
    `https://shopee.com.br/api/v2/item/get?shopid=${shopid}&itemid=${itemid}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying direct: ${endpoint}`);
      const res = await fetchWithTimeout(endpoint, getApiHeaders(), 9000);
      const text = await res.text();
      if (!res.ok) {
        console.log(`Direct returned ${res.status}`);
        continue;
      }

      const json = JSON.parse(text);
      const item = extractItemFromEnvelope(json);
      if (item) {
        console.log('Success: direct API call');
        return item;
      }

      if (json?.error === 90309999) {
        console.log('Direct API blocked with error 90309999');
      }
    } catch (e: any) {
      console.log(`Direct failed: ${e.message}`);
    }
  }

  for (const endpoint of endpoints) {
    try {
      const scraperJson = await fetchViaScraperApi(endpoint, 'json');
      if (!scraperJson) continue;

      const json = JSON.parse(scraperJson);
      const item = extractItemFromEnvelope(json);
      if (item) {
        console.log('Success: API via ScraperAPI');
        return item;
      }
    } catch {
      // continue
    }
  }

  const proxies = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  for (const makeProxy of proxies) {
    const endpoint = endpoints[0];
    try {
      const proxyUrl = makeProxy(endpoint);
      console.log(`Trying proxy: ${proxyUrl.substring(0, 60)}...`);
      const res = await fetchWithTimeout(proxyUrl, { 'Accept': 'application/json,*/*' }, 12000);
      if (!res.ok) {
        console.log(`Proxy returned ${res.status}`);
        await res.text();
        continue;
      }

      const text = await res.text();
      const json = JSON.parse(text);
      const item = extractItemFromEnvelope(json);
      if (item) {
        console.log('Success via proxy');
        return item;
      }
    } catch (e: any) {
      console.log(`Proxy failed: ${e.message}`);
    }
  }

  try {
    console.log('Trying HTML scrape for embedded JSON...');
    const htmlUrl = `https://shopee.com.br/product-i.${shopid}.${itemid}`;

    const directHtml = await fetchWithTimeout(
      htmlUrl,
      getApiHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }),
      12000,
    );

    if (directHtml.ok) {
      const html = await directHtml.text();
      const item = extractItemFromHtml(html);
      if (item) {
        console.log('Success: extracted from direct HTML');
        return item;
      }

      const metaItem = extractFromMetaTags(html, shopid, itemid);
      if (metaItem && metaItem.name) {
        console.log('Success: extracted from direct meta tags');
        return metaItem;
      }
    } else {
      await directHtml.text();
    }

    const scraperHtml = await fetchViaScraperApi(htmlUrl, 'html');
    if (scraperHtml) {
      const item = extractItemFromHtml(scraperHtml);
      if (item) {
        console.log('Success: extracted from ScraperAPI HTML');
        return item;
      }

      const metaItem = extractFromMetaTags(scraperHtml, shopid, itemid);
      if (metaItem && metaItem.name) {
        console.log('Success: extracted from ScraperAPI meta tags');
        return metaItem;
      }
    }

    for (const makeProxy of proxies) {
      try {
        const proxyUrl = makeProxy(htmlUrl);
        const res = await fetchWithTimeout(proxyUrl, { 'Accept': 'text/html,*/*' }, 12000);
        if (!res.ok) {
          await res.text();
          continue;
        }

        const html = await res.text();
        console.log(`HTML size: ${html.length} chars`);
        const item = extractItemFromHtml(html);
        if (item) {
          console.log('Success: extracted from HTML proxy');
          return item;
        }

        const metaItem = extractFromMetaTags(html, shopid, itemid);
        if (metaItem && metaItem.name) {
          console.log('Success: extracted from proxy meta tags');
          return metaItem;
        }
      } catch (e: any) {
        console.log(`HTML proxy failed: ${e.message}`);
      }
    }
  } catch (e: any) {
    console.log(`HTML scrape failed: ${e.message}`);
  }

  return null;
}

function extractFromMetaTags(html: string, shopid: string, itemid: string): any {
  const getMetaContent = (name: string): string => {
    const re = new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(re);
    return match?.[1] || '';
  };

  const title = getMetaContent('og:title') || getMetaContent('twitter:title');
  const image = getMetaContent('og:image') || getMetaContent('twitter:image');
  
  // Try JSON-LD
  const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  let ldData: any = null;
  if (ldMatch) {
    try { ldData = JSON.parse(ldMatch[1]); } catch { /* ignore */ }
  }

  // Extract price from visible text
  const priceMatch = html.match(/R\$\s*([\d.,]+)/);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

  // Extract sales from visible text
  const soldMatch = html.match(/([\d.,]+)\s*(mil)?\s*vendidos?/i);
  let sold = 0;
  if (soldMatch) {
    sold = parseFloat(soldMatch[1].replace(/\./g, '').replace(',', '.'));
    if (soldMatch[2]) sold *= 1000;
  }

  const cleanTitle = title
    .replace(/\s*[|–-]\s*Shopee\s*Brasil.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle || cleanTitle.length < 5) return null;

  return {
    name: cleanTitle,
    price: ldData?.offers?.price ? parseFloat(ldData.offers.price) * 100000 : price * 100000,
    price_min: ldData?.offers?.lowPrice ? parseFloat(ldData.offers.lowPrice) * 100000 : price * 100000,
    price_max: ldData?.offers?.highPrice ? parseFloat(ldData.offers.highPrice) * 100000 : price * 100000,
    historical_sold: sold,
    stock: 0,
    liked_count: 0,
    image: image || '',
    images: image ? [image.replace(/^https?:\/\/[^/]+\/file\//, '')] : [],
    shopid: parseInt(shopid),
    itemid: parseInt(itemid),
    item_rating: { rating_star: ldData?.aggregateRating?.ratingValue || 0, rating_count: [0,0,0,0,0,0] },
    _fromMeta: true,
  };
}

// ─── STEP 3-6: EXTRACT STRUCTURED DATA ─────────────────────────────────────────

function convertPrice(raw: number): number {
  if (!raw || raw <= 0) return 0;
  // Shopee stores prices in micro-units (×100000)
  if (raw >= 100000) return Math.round((raw / 100000) * 100) / 100;
  // Already in BRL
  if (raw < 100000) return Math.round(raw * 100) / 100;
  return 0;
}

function extractProductData(item: any, shopid: string, itemid: string) {
  // STEP 3: Product data
  const product_title = item.name || item.title || '';
  const current_price = convertPrice(item.price_min || item.price || 0);
  const max_price = convertPrice(item.price_max || item.price_min || item.price || 0);
  const original_price = convertPrice(item.price_before_discount || item.price_max || 0);
  const total_sales = item.historical_sold || item.sold || 0;
  
  // Stock: sum from models/variations if available
  let stock_available = item.stock || 0;
  if (Array.isArray(item.models) && item.models.length > 0) {
    const modelStock = item.models.reduce((sum: number, m: any) => sum + (m.stock || m.normal_stock || 0), 0);
    if (modelStock > 0) stock_available = modelStock;
  }
  
  const likes = item.liked_count || item.like_count || 0;
  const brand = item.brand || '';
  const category = item.catid || item.categories?.[0]?.display_name || '';

  // STEP 4: Seller data
  const shop_location = item.shop_location || '';
  const shop_rating = item.seller_info?.shop_rating || item.shop_rating || 0;
  
  let seller_status = 'Normal Seller';
  if (item.is_preferred_plus_seller || item.shopee_verified) {
    seller_status = 'Preferred Seller';
  } else if (item.is_official_shop) {
    seller_status = 'Official Store';
  }

  const shop_name = item.seller_info?.shop_name || item.shop_name || '';

  // STEP 5: Review data
  const rating = item.item_rating || {};
  const rating_average = rating.rating_star || 0;
  const ratingCounts = rating.rating_count || [];
  const review_count = Array.isArray(ratingCounts) && ratingCounts.length > 0
    ? ratingCounts[0] || ratingCounts.reduce((a: number, b: number) => a + b, 0)
    : (typeof ratingCounts === 'number' ? ratingCounts : 0);

  // STEP 6: Product image
  const imageId = item.image || (Array.isArray(item.images) && item.images[0]) || '';
  const product_image = imageId
    ? (imageId.startsWith('http') ? imageId : `https://cf.shopee.com.br/file/${imageId}`)
    : '';

  return {
    product_title,
    current_price,
    max_price,
    original_price,
    total_sales,
    stock_available,
    likes,
    brand,
    category: String(category),
    seller_status,
    shop_name,
    shop_location,
    shop_rating,
    rating_average,
    review_count,
    product_image,
    shopid: String(shopid),
    itemid: String(itemid),
  };
}

// ─── STEP 7: VALIDATION ────────────────────────────────────────────────────────

function validateData(data: any): boolean {
  return (
    typeof data.product_title === 'string' &&
    data.product_title.trim().length > 0 &&
    Number.isFinite(data.current_price) &&
    data.current_price > 0 &&
    Number.isFinite(data.stock_available) &&
    data.stock_available >= 0 &&
    Number.isFinite(data.total_sales) &&
    data.total_sales >= 0
  );
}

// ─── SEARCH FUNCTIONALITY ──────────────────────────────────────────────────────

async function searchProducts(keyword: string, limit: number, filters?: any) {
  const endpoints = [
    `https://shopee.com.br/api/v4/search/search_items?keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2&by=relevancy`,
    `https://shopee.com.br/api/v2/search_items/?keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&by=relevancy`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Search: trying ${endpoint.substring(0, 60)}...`);
      const res = await fetchWithTimeout(endpoint, API_HEADERS, 10000);
      if (res.ok) {
        const json = await res.json();
        const items = json?.items || json?.data?.items || [];
        if (items.length > 0) {
          console.log(`Search: found ${items.length} items`);
          return items.map((i: any) => {
            const item = i.item_basic || i;
            return extractProductData(item, String(item.shopid), String(item.itemid));
          });
        }
      } else {
        console.log(`Search returned ${res.status}`);
        await res.text();
      }
    } catch (e: any) {
      console.log(`Search failed: ${e.message}`);
    }
  }

  // Try via proxy
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(endpoints[0])}`;
  try {
    console.log('Search: trying via proxy...');
    const res = await fetchWithTimeout(proxyUrl, { 'Accept': 'application/json' }, 12000);
    if (res.ok) {
      const json = JSON.parse(await res.text());
      const items = json?.items || json?.data?.items || [];
      if (items.length > 0) {
        return items.map((i: any) => {
          const item = i.item_basic || i;
          return extractProductData(item, String(item.shopid), String(item.itemid));
        });
      }
    } else {
      await res.text();
    }
  } catch (e: any) {
    console.log(`Search proxy failed: ${e.message}`);
  }

  return [];
}

// ─── SUPABASE HELPERS ──────────────────────────────────────────────────────────

function getSupabaseClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function saveToDb(data: any) {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('produtos_analisados').upsert({
      titulo: data.product_title,
      preco: data.current_price,
      vendas: data.total_sales,
      avaliacoes: data.review_count,
      avaliacao_media: data.rating_average,
      estoque: data.stock_available,
      plataforma: 'Shopee',
      shopid: parseInt(data.shopid),
      itemid: parseInt(data.itemid),
      nome_loja: data.shop_name,
      score_oportunidade: null,
      data_coleta: new Date().toISOString(),
    }, { onConflict: 'itemid,shopid' });
  } catch (e) {
    console.log('DB save error (non-fatal):', e);
  }
}

async function getFromCache(shopid: string, itemid: string, maxAgeHours = 12) {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('produtos_analisados')
      .select('*')
      .eq('shopid', parseInt(shopid))
      .eq('itemid', parseInt(itemid))
      .order('data_coleta', { ascending: false })
      .limit(1);

    if (maxAgeHours > 0) {
      const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
      query = query.gte('data_coleta', cutoff);
    }

    const { data } = await query.maybeSingle();
    return data;
  } catch {
    return null;
  }
}

async function getHistory(shopid: string, itemid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('produtos_analisados')
      .select('preco, vendas, data_coleta')
      .eq('shopid', parseInt(shopid))
      .eq('itemid', parseInt(itemid))
      .order('data_coleta', { ascending: true })
      .limit(50);
    return (data || []).map((r: any) => ({ date: r.data_coleta, price: r.preco, sold: r.vendas }));
  } catch {
    return [];
  }
}

// ─── ANALYSIS COMPUTATION ──────────────────────────────────────────────────────

function computeAnalysis(product: any, competitors: any[]) {
  const price = product.current_price;
  const sold = product.total_sales;
  const rating = product.rating_average;
  const reviews = product.review_count;
  const stock = product.stock_available;
  const likes = product.likes;

  // Performance score (0-100)
  const salesScore = Math.min(sold / 10, 35);
  const ratingScore = rating >= 4.5 ? 25 : rating >= 4.0 ? 20 : rating >= 3.0 ? 10 : 0;
  const reviewScore = Math.min(reviews / 40, 25);
  const engagementScore = Math.min((stock + likes) / 200, 15);
  const performanceScore = Math.round(salesScore + ratingScore + reviewScore + engagementScore);

  // Classification
  let classification = { label: 'Produto Iniciante', level: 'low' };
  if (performanceScore >= 80) classification = { label: 'Produto Vencedor', level: 'winner' };
  else if (performanceScore >= 60) classification = { label: 'Boa Performance', level: 'high' };
  else if (performanceScore >= 35) classification = { label: 'Performance Média', level: 'medium' };

  // Sales metrics
  const listingAgeDays = sold > 0 ? Math.max(Math.round(sold / Math.max(sold / 180, 1)), 30) : 0;
  const salesPerDay = listingAgeDays > 0 ? Math.round((sold / listingAgeDays) * 10) / 10 : 0;
  const salesLast30 = Math.round(salesPerDay * 30);
  const salesLast7 = Math.round(salesPerDay * 7);

  // Sentiment from rating
  const positive = rating >= 4.0 ? Math.round(rating * 18) : Math.round(rating * 15);
  const negative = Math.round(Math.max(0, (5 - rating) * 10));
  const neutral = Math.max(0, 100 - positive - negative);

  // Revenue
  const totalEstimated = price * sold;
  const monthlyEstimated = price * salesLast30;
  const dailyEstimated = price * salesPerDay;

  // Demand score
  const demandScore = Math.min(100, Math.round(
    (salesPerDay >= 10 ? 40 : salesPerDay * 4) +
    (reviews >= 100 ? 30 : reviews * 0.3) +
    (rating >= 4.5 ? 30 : rating * 6)
  ));

  // Market metrics from competitors
  const allProducts = [product, ...competitors];
  const prices = allProducts.map((p: any) => p.current_price).filter((p: number) => p > 0);
  const sales = allProducts.map((p: any) => p.total_sales).filter((s: number) => s > 0);

  const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : price;
  const minPrice = prices.length > 0 ? Math.min(...prices) : price;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : price;
  const avgSales = sales.length > 0 ? Math.round(sales.reduce((a: number, b: number) => a + b, 0) / sales.length) : sold;
  const estimatedRevenue = avgPrice * avgSales;

  // Opportunity score
  const competitorCount = competitors.length;
  const compScore = competitorCount <= 10 ? 30 : competitorCount <= 30 ? 20 : 10;
  const demandPart = avgSales >= 200 ? 40 : avgSales >= 50 ? 25 : 10;
  const pricePart = price <= avgPrice ? 30 : 15;
  const opportunityScore = Math.min(100, compScore + demandPart + pricePart);

  return {
    analysis: {
      performanceScore,
      classification,
      salesMetrics: { listingAgeDays, salesPerDay, salesLast30, salesLast7 },
      sentiment: { positive: Math.min(100, positive), neutral: Math.max(0, neutral), negative: Math.max(0, negative) },
      sellerInfo: {
        name: product.shop_name,
        location: product.shop_location,
        rating: product.shop_rating,
        followers: 0,
        responseRate: 0,
        status: product.seller_status,
        isPreferred: product.seller_status === 'Preferred Seller',
      },
      revenue: { totalEstimated, monthlyEstimated, dailyEstimated },
      demandScore,
    },
    metrics: {
      avgPrice: Math.round(avgPrice * 100) / 100,
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      avgSales,
      competitors: competitorCount,
      estimatedRevenue: Math.round(estimatedRevenue),
      opportunityScore,
    },
  };
}

function buildAnalyzeResponseFromCache(cached: any, dataSource: 'cache' | 'cache_stale') {
  const product = {
    title: cached.titulo,
    price: cached.preco,
    priceMin: cached.preco,
    priceMax: cached.preco,
    originalPrice: cached.preco,
    historicalSold: cached.vendas,
    stock: cached.estoque || 0,
    ratingCount: cached.avaliacoes,
    ratingAvg: cached.avaliacao_media || 0,
    shopName: cached.nome_loja || '',
    shopid: cached.shopid,
    itemid: cached.itemid,
    image: '',
    score: cached.score_oportunidade || 0,
    liked: 0,
    brand: '',
    category: cached.categoria || '',
    isPreferredSeller: false,
    sellerStatus: 'Normal Seller',
  };

  const { analysis, metrics } = computeAnalysis({
    current_price: cached.preco,
    total_sales: cached.vendas,
    rating_average: cached.avaliacao_media || 0,
    review_count: cached.avaliacoes,
    stock_available: cached.estoque || 0,
    likes: 0,
    shop_name: cached.nome_loja || '',
    shop_location: '',
    shop_rating: 0,
    seller_status: 'Normal Seller',
  }, []);

  return {
    success: true,
    product,
    competitors: [],
    metrics,
    analysis,
    dataSource,
    fromCache: true,
  };
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, url, keyword, limit = 50, filters, shopid: rawShopid, itemid: rawItemid } = body;

    // ═══════════════════════════════════════════════════════════════
    // ACTION: analyze_link
    // ═══════════════════════════════════════════════════════════════
    if (action === 'analyze_link') {
      if (!url) {
        return new Response(JSON.stringify({ success: false, error: 'URL é obrigatória' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ids = extractIds(url);
      if (!ids) {
        return new Response(JSON.stringify({ success: false, error: 'URL inválida. Use um link de produto da Shopee (formato: i.SHOPID.ITEMID)' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Analyzing product: shopid=${ids.shopid}, itemid=${ids.itemid}`);

      // Fetch product data from API (STEP 2)
      let item = await fetchShopeeApi(ids.shopid, ids.itemid);
      
      // STEP 7: If first attempt fails, retry once
      if (!item) {
        console.log('First attempt failed, retrying...');
        await new Promise(r => setTimeout(r, 2000));
        item = await fetchShopeeApi(ids.shopid, ids.itemid);
      }

      // If API completely fails, try cache (fresh first, then stale)
      if (!item) {
        const freshCache = await getFromCache(ids.shopid, ids.itemid, 12);
        if (freshCache) {
          console.log('Using fresh cache data');
          const payload = buildAnalyzeResponseFromCache(freshCache, 'cache');
          const history = await getHistory(ids.shopid, ids.itemid);
          if (history.length > 0) payload.analysis.history = history;
          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const staleCache = await getFromCache(ids.shopid, ids.itemid, 0);
        if (staleCache) {
          console.log('Using stale cache data');
          const payload = buildAnalyzeResponseFromCache(staleCache, 'cache_stale');
          const history = await getHistory(ids.shopid, ids.itemid);
          if (history.length > 0) payload.analysis.history = history;
          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const hasScraperApi = Boolean(Deno.env.get('SCRAPER_API_KEY'));

        // Return structured non-500 payload so frontend can show message without runtime crash
        return new Response(JSON.stringify({
          success: false,
          error: hasScraperApi
            ? 'Não foi possível obter dados do produto no momento. Tente novamente em alguns minutos.'
            : 'Não foi possível obter dados do produto. Configure o secret SCRAPER_API_KEY para contornar o bloqueio da Shopee.',
          blockedByShopee: true,
          requiresScraperApi: !hasScraperApi,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // STEP 3-6: Extract structured data
      const productData = extractProductData(item, ids.shopid, ids.itemid);

      // STEP 7: Validate
      if (!validateData(productData)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Dados do produto estão inconsistentes (preço/estoque/vendas). Tente novamente.',
          blockedByShopee: true,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Save to DB
      await saveToDb(productData);

      // Search for competitors
      let competitors: any[] = [];
      const titleWords = productData.product_title.split(/\s+/).slice(0, 3).join(' ');
      if (titleWords.length > 3) {
        const rawCompetitors = await searchProducts(titleWords, 10);
        competitors = rawCompetitors
          .filter((c: any) => String(c.itemid) !== ids.itemid)
          .slice(0, 10);
      }

      // Compute analysis
      const { analysis, metrics } = computeAnalysis(productData, competitors);

      // Get history
      const history = await getHistory(ids.shopid, ids.itemid);
      if (history.length > 0) analysis.history = history;

      // STEP 8: Build response
      const product = {
        title: productData.product_title,
        price: productData.current_price,
        priceMin: productData.current_price,
        priceMax: productData.max_price,
        originalPrice: productData.original_price,
        historicalSold: productData.total_sales,
        stock: productData.stock_available,
        ratingCount: productData.review_count,
        ratingAvg: productData.rating_average,
        shopName: productData.shop_name,
        shopid: parseInt(ids.shopid),
        itemid: parseInt(ids.itemid),
        image: productData.product_image,
        score: analysis.performanceScore,
        liked: productData.likes,
        brand: productData.brand,
        category: productData.category,
        isPreferredSeller: productData.seller_status === 'Preferred Seller',
        sellerStatus: productData.seller_status,
        discount: productData.original_price > productData.current_price
          ? Math.round((1 - productData.current_price / productData.original_price) * 100)
          : 0,
      };

      const competitorProducts = competitors.map((c: any) => ({
        title: c.product_title,
        price: c.current_price,
        priceMin: c.current_price,
        priceMax: c.max_price,
        historicalSold: c.total_sales,
        stock: c.stock_available,
        ratingCount: c.review_count,
        ratingAvg: c.rating_average,
        shopName: c.shop_name,
        shopid: parseInt(c.shopid),
        itemid: parseInt(c.itemid),
        image: c.product_image,
        score: 0,
      }));

      return new Response(JSON.stringify({
        success: true,
        product,
        competitors: competitorProducts,
        metrics,
        analysis,
        dataSource: 'live',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: search
    // ═══════════════════════════════════════════════════════════════
    if (action === 'search') {
      if (!keyword) {
        return new Response(JSON.stringify({ success: false, error: 'Palavra-chave é obrigatória' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rawProducts = await searchProducts(keyword, limit || 50, filters);

      if (rawProducts.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Nenhum produto encontrado. A Shopee pode estar bloqueando requisições. Tente novamente.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Apply filters
      let filtered = rawProducts;
      if (filters) {
        if (filters.minPrice) filtered = filtered.filter((p: any) => p.current_price >= filters.minPrice);
        if (filters.maxPrice) filtered = filtered.filter((p: any) => p.current_price <= filters.maxPrice);
        if (filters.minSales) filtered = filtered.filter((p: any) => p.total_sales >= filters.minSales);
        if (filters.minRating) filtered = filtered.filter((p: any) => p.rating_average >= filters.minRating);
      }

      // Add scores
      const maxSales = Math.max(...filtered.map((p: any) => p.total_sales), 1);
      const products = filtered.map((p: any) => {
        const salesNorm = (p.total_sales / maxSales) * 40;
        const ratingNorm = (p.rating_average / 5) * 30;
        const reviewNorm = Math.min(p.review_count / 100, 1) * 30;
        const score = Math.round(salesNorm + ratingNorm + reviewNorm);

        return {
          title: p.product_title,
          price: p.current_price,
          priceMin: p.current_price,
          priceMax: p.max_price,
          historicalSold: p.total_sales,
          stock: p.stock_available,
          ratingCount: p.review_count,
          ratingAvg: p.rating_average,
          shopName: p.shop_name,
          shopid: parseInt(p.shopid),
          itemid: parseInt(p.itemid),
          image: p.product_image,
          score,
        };
      });

      const prices = products.map((p: any) => p.price).filter((p: number) => p > 0);
      const sales = products.map((p: any) => p.historicalSold);
      const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
      const avgSales = sales.length > 0 ? Math.round(sales.reduce((a: number, b: number) => a + b, 0) / sales.length) : 0;

      const metrics = {
        avgPrice: Math.round(avgPrice * 100) / 100,
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        avgSales,
        competitors: products.length,
        estimatedRevenue: Math.round(avgPrice * avgSales),
        opportunityScore: Math.min(100, Math.round(
          (products.length <= 15 ? 35 : products.length <= 30 ? 25 : 15) +
          (avgSales >= 200 ? 35 : avgSales >= 50 ? 25 : 10) +
          (avgPrice > 0 ? 30 : 0)
        )),
      };

      return new Response(JSON.stringify({
        success: true,
        products,
        metrics,
        total: rawProducts.length,
        filtered: products.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: product_details
    // ═══════════════════════════════════════════════════════════════
    if (action === 'product_details') {
      const sid = rawShopid || '';
      const iid = rawItemid || '';
      if (!sid || !iid) {
        return new Response(JSON.stringify({ success: false, error: 'shopid e itemid são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const item = await fetchShopeeApi(String(sid), String(iid));
      if (!item) {
        return new Response(JSON.stringify({ success: false, error: 'Não foi possível obter dados do produto.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = extractProductData(item, String(sid), String(iid));
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
