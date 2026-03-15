import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ═══ LAYER 1 — URL PARSING ═══

function extractIds(url: string): { shopid: string; itemid: string } | null {
  const match = url.match(/i\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { shopid: match[1], itemid: match[2] };
}

// ═══ HTTP UTILITIES ═══

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

function getApiHeaders(): Record<string, string> {
  return {
    'User-Agent': UA,
    'Accept': 'application/json',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Referer': 'https://shopee.com.br/',
    'X-Shopee-Language': 'pt-BR',
    'X-Requested-With': 'XMLHttpRequest',
    'X-API-SOURCE': 'pc',
  };
}

function getHtmlHeaders(): Record<string, string> {
  return {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Upgrade-Insecure-Requests': '1',
  };
}

async function fetchSafe(url: string, headers: Record<string, string>, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

// ═══ PRICE CONVERSION ═══

function convertPrice(raw: number): number {
  if (!raw || raw <= 0) return 0;
  if (raw >= 100000) return Math.round((raw / 100000) * 100) / 100;
  return Math.round(raw * 100) / 100;
}

// ═══ LAYER 2 — INTERNAL API ENDPOINTS ═══

function extractItemFromApi(payload: any): any | null {
  const item = payload?.data?.item || payload?.item || payload?.data || null;
  if (!item) return null;
  if (item.error === 90309999 || payload?.error === 90309999) return null;
  if (!item.name && !item.title && !item.itemid) return null;
  return item;
}

async function layer2_Api(shopid: string, itemid: string): Promise<any | null> {
  const endpoints = [
    `https://shopee.com.br/api/v4/item/get?shopid=${shopid}&itemid=${itemid}`,
    `https://shopee.com.br/api/v4/pdp/get_pc?shop_id=${shopid}&item_id=${itemid}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetchSafe(endpoint, getApiHeaders(), 6000);
      if (!res.ok) { await res.body?.cancel(); continue; }
      const json = await res.json();
      const item = extractItemFromApi(json);
      if (item) { item._source = 'api'; item._dataQuality = 'full'; return item; }
    } catch { /* continue */ }
  }

  // Try one proxy (allorigins only — lightweight)
  try {
    const apiUrl = `https://shopee.com.br/api/v4/item/get?shopid=${shopid}&itemid=${itemid}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
    const res = await fetchSafe(proxyUrl, { 'Accept': '*/*', 'User-Agent': UA }, 8000);
    if (res.ok) {
      const text = await res.text();
      if (text.length > 100) {
        const json = JSON.parse(text);
        const item = extractItemFromApi(json);
        if (item) { item._source = 'proxy_api'; item._dataQuality = 'full'; return item; }
      }
    }
  } catch { /* continue */ }

  return null;
}

// ═══ LAYER 3 — HTML SCRAPING ═══

function extractFromEmbeddedJson(html: string): any | null {
  const patterns = [
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i,
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
    /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const parsed = JSON.parse(match[1]);
      const candidates = [
        parsed?.props?.pageProps?.initialState?.pdp?.item,
        parsed?.props?.pageProps?.item,
        parsed?.pdp?.item,
        parsed?.item,
        parsed?.data?.item,
        parsed,
      ];
      for (const c of candidates) {
        if (c && (c.name || c.title) && (c.itemid || c.price || c.price_min)) return c;
      }
    } catch { /* continue */ }
  }
  return null;
}

function extractFromMeta(html: string, shopid: string, itemid: string): any | null {
  const getMeta = (name: string): string => {
    const re = new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const alt = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i');
    return html.match(re)?.[1] || html.match(alt)?.[1] || '';
  };

  const ogTitle = getMeta('og:title') || getMeta('twitter:title');
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '';
  const title = (ogTitle || titleTag).replace(/\s*[|–-]\s*Shopee\s*Brasil.*$/i, '').replace(/\s*-\s*Shopee.*$/i, '').trim();
  if (!title || title.length < 3) return null;

  const image = getMeta('og:image') || getMeta('twitter:image');

  // JSON-LD
  let ldPrice = 0, ldRating = 0, ldReviews = 0;
  const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const product = ld['@type'] === 'Product' ? ld : null;
      if (product) {
        ldPrice = parseFloat(product.offers?.lowPrice || product.offers?.price) || 0;
        ldRating = parseFloat(product.aggregateRating?.ratingValue) || 0;
        ldReviews = parseInt(product.aggregateRating?.reviewCount || product.aggregateRating?.ratingCount) || 0;
      }
    } catch { /* continue */ }
  }

  // Text patterns
  let textPrice = 0;
  const pm = html.match(/R\$\s*([\d]+[.,][\d]{2})/);
  if (pm) textPrice = parseFloat(pm[1].replace(/\./g, '').replace(',', '.'));

  let sold = 0;
  const sm = html.match(/([\d.,]+)\s*mil\s*vendidos?/i) || html.match(/([\d.,]+)\s*vendidos?/i);
  if (sm) { sold = parseFloat(sm[1].replace(/\./g, '').replace(',', '.')); if (sm[0].includes('mil')) sold *= 1000; }

  const finalPrice = ldPrice || textPrice;

  let sellerStatus = 'Normal Seller';
  if (html.includes('is_preferred_plus_seller":true') || html.includes('shopee_verified":true')) sellerStatus = 'Preferred Seller';
  else if (html.includes('is_official_shop":true')) sellerStatus = 'Official Store';

  const shopMatch = html.match(/"shop_name"\s*:\s*"([^"]+)"/);
  const locMatch = html.match(/"shop_location"\s*:\s*"([^"]+)"/);
  const stockMatch = html.match(/"stock"\s*:\s*(\d+)/);

  return {
    name: title,
    price: finalPrice * 100000,
    price_min: finalPrice * 100000,
    price_max: finalPrice * 100000,
    historical_sold: sold,
    stock: stockMatch ? parseInt(stockMatch[1]) : 0,
    liked_count: 0,
    image: image || '',
    images: [],
    shopid: parseInt(shopid),
    itemid: parseInt(itemid),
    item_rating: { rating_star: Math.min(5, Math.max(0, ldRating)), rating_count: [ldReviews] },
    shop_name: shopMatch?.[1] || '',
    shop_location: locMatch?.[1] || '',
    is_preferred_plus_seller: sellerStatus === 'Preferred Seller',
    is_official_shop: sellerStatus === 'Official Store',
    _source: 'html',
    _dataQuality: finalPrice > 0 ? (sold > 0 ? 'good' : 'partial') : 'minimal',
  };
}

async function layer3_Html(shopid: string, itemid: string): Promise<any | null> {
  const pageUrl = `https://shopee.com.br/-i.${shopid}.${itemid}`;

  // Direct fetch
  try {
    const res = await fetchSafe(pageUrl, getHtmlHeaders(), 8000);
    if (res.ok) {
      const html = await res.text();
      const embedded = extractFromEmbeddedJson(html);
      if (embedded) { embedded._source = 'embedded_json'; embedded._dataQuality = 'full'; return embedded; }
      const meta = extractFromMeta(html, shopid, itemid);
      if (meta) return meta;
    } else { await res.body?.cancel(); }
  } catch { /* continue */ }

  // One proxy attempt
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(pageUrl)}`;
    const res = await fetchSafe(proxyUrl, { 'Accept': '*/*', 'User-Agent': UA }, 10000);
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) {
        const embedded = extractFromEmbeddedJson(html);
        if (embedded) { embedded._source = 'proxy_html'; embedded._dataQuality = 'full'; return embedded; }
        const meta = extractFromMeta(html, shopid, itemid);
        if (meta) return meta;
      }
    }
  } catch { /* continue */ }

  return null;
}

// ═══ LAYER 5 — DATA STRUCTURING ═══

function buildProductData(item: any, shopid: string, itemid: string) {
  const product_title = item.name || item.title || '';
  const current_price = convertPrice(item.price_min || item.price || 0);
  const max_price = convertPrice(item.price_max || item.price_min || item.price || 0);
  const original_price = convertPrice(item.price_before_discount || item.price_max || 0);
  const discount = original_price > current_price ? Math.round((1 - current_price / original_price) * 100) : 0;
  const total_sales = item.historical_sold || item.sold || 0;

  let stock_available = item.stock || 0;
  if (Array.isArray(item.models) && item.models.length > 0) {
    const ms = item.models.reduce((s: number, m: any) => s + (m.stock || m.normal_stock || 0), 0);
    if (ms > 0) stock_available = ms;
  }

  let seller_status = 'Normal Seller';
  if (item.is_preferred_plus_seller || item.shopee_verified) seller_status = 'Preferred Seller';
  else if (item.is_official_shop) seller_status = 'Official Store';

  const rating = item.item_rating || {};
  const rating_average = Math.min(5, Math.max(0, rating.rating_star || 0));
  const rc = rating.rating_count || [];
  const review_count = Array.isArray(rc) && rc.length > 0 ? rc[0] || rc.reduce((a: number, b: number) => a + b, 0) : (typeof rc === 'number' ? rc : 0);

  const imageId = item.image || (Array.isArray(item.images) && item.images[0]) || '';
  const product_image = imageId ? (imageId.startsWith('http') ? imageId : `https://cf.shopee.com.br/file/${imageId}`) : '';

  return {
    product_title, current_price, max_price, original_price, discount,
    total_sales, stock_available,
    likes: item.liked_count || item.like_count || 0,
    brand: item.brand || '',
    category: String(item.catid || item.categories?.[0]?.display_name || ''),
    seller_status,
    shop_name: item.seller_info?.shop_name || item.shop_name || '',
    shop_location: item.shop_location || '',
    shop_rating: item.seller_info?.shop_rating || item.shop_rating || 0,
    rating_average, review_count, product_image,
    shopid: String(shopid), itemid: String(itemid),
    _source: item._source || 'api',
    _dataQuality: item._dataQuality || 'full',
  };
}

// ═══ LAYER 6 — MARKET INTELLIGENCE ═══

function computeMarketIntelligence(product: any, competitors: any[]) {
  const { current_price: price, total_sales: sold, rating_average: rating, review_count: reviews, stock_available: stock, likes } = product;

  const salesScore = Math.min(sold / 10, 35);
  const ratingScore = rating >= 4.5 ? 25 : rating >= 4.0 ? 20 : rating >= 3.0 ? 10 : 0;
  const reviewScore = Math.min(reviews / 40, 25);
  const engagementScore = Math.min((stock + (likes || 0)) / 200, 15);
  const performanceScore = Math.round(salesScore + ratingScore + reviewScore + engagementScore);

  let classification = { label: 'Produto Iniciante', level: 'low' };
  if (performanceScore >= 80) classification = { label: 'Produto Vencedor', level: 'winner' };
  else if (performanceScore >= 60) classification = { label: 'Boa Performance', level: 'high' };
  else if (performanceScore >= 35) classification = { label: 'Performance Média', level: 'medium' };

  const listingAgeDays = sold > 0 ? Math.max(Math.round(sold / Math.max(sold / 180, 1)), 30) : 0;
  const estimated_daily_sales = listingAgeDays > 0 ? Math.round((sold / listingAgeDays) * 10) / 10 : 0;
  const sales_last_7_days = Math.round(estimated_daily_sales * 7);
  const sales_last_30_days = Math.round(estimated_daily_sales * 30);
  const estimated_monthly_revenue = Math.round(price * sales_last_30_days);

  const positive = rating >= 4.0 ? Math.round(rating * 18) : Math.round(rating * 15);
  const negative = Math.round(Math.max(0, (5 - rating) * 10));
  const neutral = Math.max(0, 100 - positive - negative);

  const demandScore = Math.min(100, Math.round(
    (estimated_daily_sales >= 10 ? 40 : estimated_daily_sales * 4) +
    (reviews >= 100 ? 30 : reviews * 0.3) +
    (rating >= 4.5 ? 30 : rating * 6)
  ));

  const allProducts = [product, ...competitors];
  const prices = allProducts.map((p: any) => p.current_price).filter((p: number) => p > 0);
  const sales = allProducts.map((p: any) => p.total_sales).filter((s: number) => s > 0);

  const average_market_price = prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length * 100) / 100 : price;
  const minPrice = prices.length > 0 ? Math.min(...prices) : price;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : price;
  const avgSales = sales.length > 0 ? Math.round(sales.reduce((a: number, b: number) => a + b, 0) / sales.length) : sold;
  const competitor_count = competitors.length;

  const compScore = competitor_count <= 10 ? 30 : competitor_count <= 30 ? 20 : 10;
  const demandPart = avgSales >= 200 ? 40 : avgSales >= 50 ? 25 : 10;
  const pricePart = price <= average_market_price ? 30 : 15;
  const opportunityScore = Math.min(100, compScore + demandPart + pricePart);

  return {
    analysis: {
      performanceScore, classification,
      salesMetrics: { listingAgeDays, estimated_daily_sales, sales_last_7_days, sales_last_30_days, estimated_monthly_revenue },
      sentiment: { positive: Math.min(100, positive), neutral: Math.max(0, neutral), negative: Math.max(0, negative) },
      sellerInfo: { name: product.shop_name, location: product.shop_location, rating: product.shop_rating, status: product.seller_status, isPreferred: product.seller_status === 'Preferred Seller' },
      revenue: { totalEstimated: price * sold, monthlyEstimated: estimated_monthly_revenue, dailyEstimated: price * estimated_daily_sales },
      demandScore,
    },
    metrics: {
      avgPrice: average_market_price, minPrice: Math.round(minPrice * 100) / 100, maxPrice: Math.round(maxPrice * 100) / 100,
      avgSales, competitors: competitor_count, estimatedRevenue: Math.round(average_market_price * avgSales),
      opportunityScore, average_market_price, competitor_count,
    },
    marketIntelligence: { estimated_daily_sales, sales_last_7_days, sales_last_30_days, estimated_monthly_revenue, competitor_count, average_market_price },
  };
}

// ═══ LAYER 7 — CACHE ═══

function getSupabaseClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function saveToCache(data: any) {
  try {
    const sb = getSupabaseClient();
    await sb.from('produtos_analisados').upsert({
      titulo: data.product_title, preco: data.current_price, vendas: data.total_sales,
      avaliacoes: data.review_count, avaliacao_media: data.rating_average,
      estoque: data.stock_available, plataforma: 'Shopee',
      shopid: parseInt(data.shopid), itemid: parseInt(data.itemid),
      nome_loja: data.shop_name, score_oportunidade: null, data_coleta: new Date().toISOString(),
    }, { onConflict: 'itemid,shopid' });
  } catch { /* non-fatal */ }
}

async function getFromCache(shopid: string, itemid: string, maxAgeHours = 12) {
  try {
    const sb = getSupabaseClient();
    let query = sb.from('produtos_analisados').select('*')
      .eq('shopid', parseInt(shopid)).eq('itemid', parseInt(itemid))
      .order('data_coleta', { ascending: false }).limit(1);
    if (maxAgeHours > 0) {
      query = query.gte('data_coleta', new Date(Date.now() - maxAgeHours * 3600000).toISOString());
    }
    const { data } = await query.maybeSingle();
    return data;
  } catch { return null; }
}

async function getHistory(shopid: string, itemid: string) {
  try {
    const sb = getSupabaseClient();
    const { data } = await sb.from('produtos_analisados').select('preco, vendas, data_coleta')
      .eq('shopid', parseInt(shopid)).eq('itemid', parseInt(itemid))
      .order('data_coleta', { ascending: true }).limit(50);
    return (data || []).map((r: any) => ({ date: r.data_coleta, price: r.preco, sold: r.vendas }));
  } catch { return []; }
}

// ═══ LAYER 8 — VALIDATION ═══

function isDataValid(data: any): boolean {
  return data.product_title?.length >= 3 && data.current_price > 0 && data.total_sales >= 0 && data.rating_average >= 0 && data.rating_average <= 5;
}

// ═══ ORCHESTRATOR ═══

async function fetchProduct(shopid: string, itemid: string): Promise<any | null> {
  const apiItem = await layer2_Api(shopid, itemid);
  if (apiItem) return apiItem;
  const htmlItem = await layer3_Html(shopid, itemid);
  if (htmlItem) return htmlItem;
  return null;
}

// ═══ SEARCH ═══

async function searchProducts(keyword: string, limit: number) {
  const endpoint = `https://shopee.com.br/api/v4/search/search_items?keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2&by=relevancy`;
  try {
    const res = await fetchSafe(endpoint, getApiHeaders(), 8000);
    if (res.ok) {
      const json = await res.json();
      const items = json?.items || json?.data?.items || [];
      if (items.length > 0) return items.map((i: any) => buildProductData(i.item_basic || i, String((i.item_basic || i).shopid), String((i.item_basic || i).itemid)));
    } else { await res.body?.cancel(); }
  } catch { /* continue */ }

  // One proxy attempt
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(endpoint)}`;
    const res = await fetchSafe(proxyUrl, { 'Accept': '*/*', 'User-Agent': UA }, 10000);
    if (res.ok) {
      const text = await res.text();
      const json = JSON.parse(text);
      const items = json?.items || json?.data?.items || [];
      if (items.length > 0) return items.map((i: any) => buildProductData(i.item_basic || i, String((i.item_basic || i).shopid), String((i.item_basic || i).itemid)));
    }
  } catch { /* continue */ }

  return [];
}

// ═══ CACHE RESPONSE BUILDER ═══

function buildCacheResponse(cached: any, source: string) {
  const product = {
    title: cached.titulo, price: cached.preco, priceMin: cached.preco, priceMax: cached.preco,
    originalPrice: cached.preco, historicalSold: cached.vendas, stock: cached.estoque || 0,
    ratingCount: cached.avaliacoes, ratingAvg: cached.avaliacao_media || 0,
    shopName: cached.nome_loja || '', shopid: cached.shopid, itemid: cached.itemid,
    image: '', score: cached.score_oportunidade || 0, liked: 0, brand: '', category: cached.categoria || '',
    isPreferredSeller: false, sellerStatus: 'Normal Seller', discount: 0,
  };
  const { analysis, metrics, marketIntelligence } = computeMarketIntelligence({
    current_price: cached.preco, total_sales: cached.vendas, rating_average: cached.avaliacao_media || 0,
    review_count: cached.avaliacoes, stock_available: cached.estoque || 0, likes: 0,
    shop_name: cached.nome_loja || '', shop_location: '', shop_rating: 0, seller_status: 'Normal Seller',
  }, []);
  return { success: true, product, competitors: [], metrics, analysis, marketIntelligence, dataSource: source, fromCache: true };
}

// ═══ LAYER 9 — RESPONSE HANDLER ═══

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, url, keyword, limit = 50, filters, shopid: rawShopid, itemid: rawItemid } = body;

    if (action === 'analyze_link') {
      if (!url) return new Response(JSON.stringify({ success: false, error: 'URL é obrigatória' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const ids = extractIds(url);
      if (!ids) return new Response(JSON.stringify({ success: false, error: 'URL inválida. Use um link de produto da Shopee (formato: i.SHOPID.ITEMID)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      console.log(`Analyzing: shopid=${ids.shopid}, itemid=${ids.itemid}`);

      let item = await fetchProduct(ids.shopid, ids.itemid);

      // Cache fallback if extraction failed
      if (!item) {
        const fresh = await getFromCache(ids.shopid, ids.itemid, 12);
        if (fresh && fresh.preco > 0) {
          const payload = buildCacheResponse(fresh, 'cache_12h');
          const history = await getHistory(ids.shopid, ids.itemid);
          if (history.length > 0) (payload.analysis as any).history = history;
          return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const stale = await getFromCache(ids.shopid, ids.itemid, 0);
        if (stale && stale.preco > 0) {
          const payload = buildCacheResponse(stale, 'cache_stale');
          return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: false, error: 'Não foi possível obter dados do produto. A Shopee está bloqueando requisições do servidor. Tente novamente em alguns minutos.', blockedByShopee: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const productData = buildProductData(item, ids.shopid, ids.itemid);

      if (!isDataValid(productData)) {
        const cached = await getFromCache(ids.shopid, ids.itemid, 0);
        if (cached && cached.preco > 0) return new Response(JSON.stringify(buildCacheResponse(cached, 'cache_fallback')), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: false, error: 'Dados do produto incompletos. Tente novamente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await saveToCache(productData);

      // Search competitors (limited to reduce compute)
      let competitors: any[] = [];
      const titleWords = productData.product_title.split(/\s+/).slice(0, 3).join(' ');
      if (titleWords.length > 3) {
        const rawComp = await searchProducts(titleWords, 8);
        competitors = rawComp.filter((c: any) => String(c.itemid) !== ids.itemid).slice(0, 8);
      }

      const { analysis, metrics, marketIntelligence } = computeMarketIntelligence(productData, competitors);
      const history = await getHistory(ids.shopid, ids.itemid);
      if (history.length > 0) (analysis as any).history = history;

      const dataFields: string[] = [];
      if (productData.current_price > 0) dataFields.push('price');
      if (productData.total_sales > 0) dataFields.push('sales');
      if (productData.stock_available > 0) dataFields.push('stock');
      if (productData.rating_average > 0) dataFields.push('rating');
      if (productData.review_count > 0) dataFields.push('reviews');

      const product = {
        title: productData.product_title, price: productData.current_price, priceMin: productData.current_price,
        priceMax: productData.max_price, originalPrice: productData.original_price,
        historicalSold: productData.total_sales, stock: productData.stock_available,
        ratingCount: productData.review_count, ratingAvg: productData.rating_average,
        shopName: productData.shop_name, shopid: parseInt(ids.shopid), itemid: parseInt(ids.itemid),
        image: productData.product_image, score: (analysis as any).performanceScore,
        liked: productData.likes, brand: productData.brand, category: productData.category,
        isPreferredSeller: productData.seller_status === 'Preferred Seller',
        sellerStatus: productData.seller_status, discount: productData.discount,
      };

      const competitorProducts = competitors.map((c: any) => ({
        title: c.product_title, price: c.current_price, priceMin: c.current_price,
        priceMax: c.max_price, historicalSold: c.total_sales, stock: c.stock_available,
        ratingCount: c.review_count, ratingAvg: c.rating_average, shopName: c.shop_name,
        shopid: parseInt(c.shopid), itemid: parseInt(c.itemid), image: c.product_image, score: 0,
      }));

      return new Response(JSON.stringify({
        success: true, product, competitors: competitorProducts, metrics, analysis, marketIntelligence,
        dataSource: productData._source, dataFields, dataQuality: productData._dataQuality,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'search') {
      if (!keyword) return new Response(JSON.stringify({ success: false, error: 'Palavra-chave é obrigatória' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const rawProducts = await searchProducts(keyword, limit || 50);
      if (rawProducts.length === 0) return new Response(JSON.stringify({ success: false, error: 'Nenhum produto encontrado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      let filtered = rawProducts;
      if (filters) {
        if (filters.minPrice) filtered = filtered.filter((p: any) => p.current_price >= filters.minPrice);
        if (filters.maxPrice) filtered = filtered.filter((p: any) => p.current_price <= filters.maxPrice);
        if (filters.minSales) filtered = filtered.filter((p: any) => p.total_sales >= filters.minSales);
        if (filters.minRating) filtered = filtered.filter((p: any) => p.rating_average >= filters.minRating);
      }

      const maxSales = Math.max(...filtered.map((p: any) => p.total_sales), 1);
      const products = filtered.map((p: any) => {
        const score = Math.round((p.total_sales / maxSales) * 40 + (p.rating_average / 5) * 30 + Math.min(p.review_count / 100, 1) * 30);
        return { title: p.product_title, price: p.current_price, priceMin: p.current_price, priceMax: p.max_price, historicalSold: p.total_sales, stock: p.stock_available, ratingCount: p.review_count, ratingAvg: p.rating_average, shopName: p.shop_name, shopid: parseInt(p.shopid), itemid: parseInt(p.itemid), image: p.product_image, score };
      });

      const prices = products.map((p: any) => p.price).filter((p: number) => p > 0);
      const sales = products.map((p: any) => p.historicalSold);
      const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
      const avgSales = sales.length > 0 ? Math.round(sales.reduce((a: number, b: number) => a + b, 0) / sales.length) : 0;

      return new Response(JSON.stringify({
        success: true, products,
        metrics: { avgPrice: Math.round(avgPrice * 100) / 100, minPrice: prices.length > 0 ? Math.min(...prices) : 0, maxPrice: prices.length > 0 ? Math.max(...prices) : 0, avgSales, competitors: products.length, estimatedRevenue: Math.round(avgPrice * avgSales), opportunityScore: Math.min(100, Math.round((products.length <= 15 ? 35 : products.length <= 30 ? 25 : 15) + (avgSales >= 200 ? 35 : avgSales >= 50 ? 25 : 10) + (avgPrice > 0 ? 30 : 0))) },
        total: rawProducts.length, filtered: products.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'product_details') {
      if (!rawShopid || !rawItemid) return new Response(JSON.stringify({ success: false, error: 'shopid e itemid são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const item = await fetchProduct(String(rawShopid), String(rawItemid));
      if (!item) return new Response(JSON.stringify({ success: false, error: 'Não foi possível obter dados do produto.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, data: buildProductData(item, String(rawShopid), String(rawItemid)) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Fatal:', e);
    return new Response(JSON.stringify({ success: false, error: e.message || 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
