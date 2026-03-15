import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── URL PARSING ───────────────────────────────────────────────────────────────

function extractIds(url: string): { shopid: string; itemid: string } | null {
  const match = url.match(/i\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { shopid: match[1], itemid: match[2] };
}

// ─── HTTP HELPERS ──────────────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getApiHeaders(): Record<string, string> {
  return {
    'User-Agent': randomUA(),
    'Accept': 'application/json',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
    'Referer': 'https://shopee.com.br/',
    'X-Shopee-Language': 'pt-BR',
    'X-Requested-With': 'XMLHttpRequest',
    'X-API-SOURCE': 'pc',
    'Cache-Control': 'no-cache',
    'sec-ch-ua': '"Chromium";v="134", "Google Chrome";v="134", "Not:A-Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  };
}

function getHtmlHeaders(): Record<string, string> {
  return {
    'User-Agent': randomUA(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'sec-ch-ua': '"Chromium";v="134", "Google Chrome";v="134"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
  };
}

async function fetchSafe(url: string, headers: Record<string, string>, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

// ─── PRICE CONVERSION ──────────────────────────────────────────────────────────

function convertPrice(raw: number): number {
  if (!raw || raw <= 0) return 0;
  // Shopee stores prices in micro-units (price / 100000)
  if (raw >= 100000) return Math.round((raw / 100000) * 100) / 100;
  return Math.round(raw * 100) / 100;
}

// ─── PROXY HELPERS ─────────────────────────────────────────────────────────────

// Wrap URL through a public CORS proxy. allorigins wraps in JSON {contents:...}
const PROXIES = [
  {
    name: 'allorigins',
    wrap: (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    isJson: true, // returns {contents: "..."}
  },
  {
    name: 'allorigins-raw',
    wrap: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    isJson: false,
  },
  {
    name: 'corsproxy',
    wrap: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    isJson: false,
  },
  {
    name: 'codetabs',
    wrap: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    isJson: false,
  },
];

async function fetchViaProxy(targetUrl: string, expectJson: boolean, timeoutMs = 12000): Promise<string | null> {
  for (const proxy of PROXIES) {
    try {
      const proxyUrl = proxy.wrap(targetUrl);
      console.log(`Proxy[${proxy.name}]: ${proxyUrl.substring(0, 70)}...`);
      const res = await fetchSafe(proxyUrl, { 'Accept': '*/*', 'User-Agent': randomUA() }, timeoutMs);
      if (!res.ok) { await res.text(); continue; }
      const text = await res.text();
      if (!text || text.length < 50) continue;

      // allorigins /get wraps in {contents: "..."} 
      if (proxy.isJson) {
        try {
          const wrapper = JSON.parse(text);
          if (wrapper.contents) return wrapper.contents;
        } catch {
          // maybe it returned raw anyway
          return text;
        }
      }
      return text;
    } catch (e: any) {
      console.log(`✗ Proxy[${proxy.name}]: ${e.message}`);
    }
  }
  return null;
}

// ─── DATA EXTRACTION FROM API JSON ─────────────────────────────────────────────

function extractItemFromApiResponse(payload: any): any | null {
  // v4/item/get → {data: {item: {...}}}
  // v4/pdp/get_pc → {data: {item: {...}}}
  // v2/item/get → {item: {...}}
  // v4/recommend → {data: {sections: [{data: {item: [...]}}]}}
  const item = payload?.data?.item || payload?.item || payload?.data || null;
  if (!item) return null;
  if (item.error === 90309999 || payload?.error === 90309999) return null;
  if (!item.name && !item.title && !item.itemid) return null;
  return item;
}

// ─── DATA EXTRACTION FROM HTML ─────────────────────────────────────────────────

function extractFromEmbeddedJson(html: string): any | null {
  // Shopee embeds product data in several patterns. Try all.
  const patterns = [
    // Standard Next.js hydration
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i,
    // window.__INITIAL_STATE__ 
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
    // window.__NEXT_DATA__
    /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
    // Inline script with item data
    /"item"\s*:\s*(\{"itemid":\d+[\s\S]*?"name":"[^"]+?"[\s\S]*?\})\s*[,}]/,
    // pdp data
    /"pdp"\s*:\s*(\{[\s\S]*?"item"[\s\S]*?\})\s*[,}]/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const parsed = JSON.parse(match[1]);
      // Navigate through possible nesting structures
      const candidates = [
        parsed?.props?.pageProps?.initialState?.pdp?.item,
        parsed?.props?.pageProps?.item,
        parsed?.pdp?.item,
        parsed?.item,
        extractItemFromApiResponse(parsed),
        parsed,
      ];
      for (const candidate of candidates) {
        if (candidate && (candidate.name || candidate.title) && (candidate.itemid || candidate.price || candidate.price_min)) {
          console.log('✓ Found item in embedded JSON');
          return candidate;
        }
      }
    } catch { /* JSON parse failed, continue */ }
  }

  // Try to find any JSON blob with product data patterns
  const itemJsonMatch = html.match(/\{"itemid":\d+[^<]{50,5000}"name":"[^"]+"/);
  if (itemJsonMatch) {
    // Try to find the closing brace
    let jsonStr = itemJsonMatch[0];
    let depth = 0;
    const startIdx = html.indexOf(jsonStr);
    for (let i = startIdx; i < Math.min(startIdx + 20000, html.length); i++) {
      if (html[i] === '{') depth++;
      if (html[i] === '}') { depth--; if (depth === 0) { jsonStr = html.substring(startIdx, i + 1); break; } }
    }
    try {
      const item = JSON.parse(jsonStr);
      if (item.name && item.itemid) {
        console.log('✓ Found item via raw JSON blob');
        return item;
      }
    } catch { /* not valid JSON */ }
  }

  return null;
}

function extractFromMetaAndStructuredData(html: string, shopid: string, itemid: string): any | null {
  const getMetaContent = (name: string): string => {
    const re = new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const alt = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i');
    return html.match(re)?.[1] || html.match(alt)?.[1] || '';
  };

  // Title
  const ogTitle = getMetaContent('og:title') || getMetaContent('twitter:title');
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '';
  const rawTitle = ogTitle || titleTag;
  const title = rawTitle
    .replace(/\s*[|–-]\s*Shopee\s*Brasil.*$/i, '')
    .replace(/\s*-\s*Shopee.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title || title.length < 3) return null;

  // Image
  const image = getMetaContent('og:image') || getMetaContent('twitter:image');

  // JSON-LD structured data
  let ldPrice = 0, ldPriceLow = 0, ldPriceHigh = 0;
  let ldRating = 0, ldReviewCount = 0;
  let ldAvailability = '', ldName = '';

  const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const ldMatch of ldMatches) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const product = ld['@type'] === 'Product' ? ld : (Array.isArray(ld['@graph']) ? ld['@graph'].find((g: any) => g['@type'] === 'Product') : null);
      if (product) {
        ldName = product.name || '';
        const offers = product.offers || {};
        ldPrice = parseFloat(offers.price) || 0;
        ldPriceLow = parseFloat(offers.lowPrice) || ldPrice;
        ldPriceHigh = parseFloat(offers.highPrice) || ldPrice;
        ldAvailability = offers.availability || '';
        if (product.aggregateRating) {
          ldRating = parseFloat(product.aggregateRating.ratingValue) || 0;
          ldReviewCount = parseInt(product.aggregateRating.reviewCount || product.aggregateRating.ratingCount) || 0;
        }
      }
    } catch { /* continue */ }
  }

  // Visible text: price
  let textPrice = 0;
  const pricePatterns = [
    /R\$\s*([\d]+[.,][\d]{2})/g,
    /"price":\s*"?([\d.]+)"?/gi,
  ];
  for (const pattern of pricePatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      textPrice = parseFloat(matches[0][1].replace(/\./g, '').replace(',', '.'));
      if (textPrice > 0) break;
    }
  }

  // Visible text: sales
  let sold = 0;
  const soldPatterns = [
    /([\d.,]+)\s*mil\s*vendidos?/i,
    /([\d.,]+)\s*vendidos?/i,
    /"historical_sold"\s*:\s*(\d+)/i,
    /"sold"\s*:\s*(\d+)/i,
  ];
  for (const pattern of soldPatterns) {
    const match = html.match(pattern);
    if (match) {
      const raw = match[1].replace(/\./g, '').replace(',', '.');
      sold = parseFloat(raw);
      if (match[0].toLowerCase().includes('mil')) sold *= 1000;
      if (sold > 0) break;
    }
  }

  // Rating
  let textRating = ldRating;
  if (!textRating) {
    const ratingMatch = html.match(/(\d[.,]\d)\s*(?:de\s*5|\/\s*5|estrelas?)/i) ||
      html.match(/"rating_star"\s*:\s*([\d.]+)/);
    if (ratingMatch) textRating = parseFloat(ratingMatch[1].replace(',', '.'));
  }

  // Reviews
  let textReviews = ldReviewCount;
  if (!textReviews) {
    const reviewMatch = html.match(/([\d.,]+)\s*(?:avaliações?|reviews?|comentários?)/i) ||
      html.match(/"rcount_with_context"\s*:\s*(\d+)/) ||
      html.match(/"rating_count"\s*:\s*\[(\d+)/);
    if (reviewMatch) textReviews = parseInt(reviewMatch[1].replace(/\./g, '').replace(',', ''));
  }

  // Stock from HTML
  let stock = 0;
  const stockMatch = html.match(/"stock"\s*:\s*(\d+)/);
  if (stockMatch) stock = parseInt(stockMatch[1]);
  if (!stock && ldAvailability.includes('InStock')) stock = 1;

  // Shop name
  const shopMatch = html.match(/"shop_name"\s*:\s*"([^"]+)"/) ||
    html.match(/class="[^"]*shop-name[^"]*"[^>]*>([^<]+)/i);
  const shopName = shopMatch?.[1]?.trim() || '';

  // Seller status
  let sellerStatus = 'Normal Seller';
  if (html.includes('is_preferred_plus_seller":true') || html.includes('shopee_verified":true')) sellerStatus = 'Preferred Seller';
  else if (html.includes('is_official_shop":true')) sellerStatus = 'Official Store';

  // Shop location
  const locationMatch = html.match(/"shop_location"\s*:\s*"([^"]+)"/);
  const shopLocation = locationMatch?.[1] || '';

  // Use best available data
  const finalPrice = ldPriceLow || ldPrice || textPrice;
  const finalRating = Math.min(5, Math.max(0, textRating));

  // Build item-like structure matching API format
  return {
    name: ldName || title,
    price: finalPrice * 100000,
    price_min: (ldPriceLow || finalPrice) * 100000,
    price_max: (ldPriceHigh || finalPrice) * 100000,
    historical_sold: sold,
    stock: stock,
    liked_count: 0,
    image: image || '',
    images: image ? [image.replace(/^https?:\/\/[^/]+\/file\//, '')] : [],
    shopid: parseInt(shopid),
    itemid: parseInt(itemid),
    item_rating: {
      rating_star: finalRating,
      rating_count: [textReviews, 0, 0, 0, 0, 0],
    },
    shop_name: shopName,
    shop_location: shopLocation,
    is_preferred_plus_seller: sellerStatus === 'Preferred Seller',
    is_official_shop: sellerStatus === 'Official Store',
    _source: 'html',
    _hasJsonLd: ldPrice > 0,
    _dataQuality: finalPrice > 0 ? (sold > 0 ? 'good' : 'partial') : 'minimal',
  };
}

// ─── STRUCTURED PRODUCT DATA ───────────────────────────────────────────────────

function buildProductData(item: any, shopid: string, itemid: string) {
  const product_title = item.name || item.title || '';
  const current_price = convertPrice(item.price_min || item.price || 0);
  const max_price = convertPrice(item.price_max || item.price_min || item.price || 0);
  const original_price = convertPrice(item.price_before_discount || item.price_max || 0);
  const total_sales = item.historical_sold || item.sold || 0;

  let stock_available = item.stock || 0;
  if (Array.isArray(item.models) && item.models.length > 0) {
    const modelStock = item.models.reduce((sum: number, m: any) => sum + (m.stock || m.normal_stock || 0), 0);
    if (modelStock > 0) stock_available = modelStock;
  }

  const likes = item.liked_count || item.like_count || 0;
  const brand = item.brand || '';
  const category = item.catid || item.categories?.[0]?.display_name || '';

  const shop_location = item.shop_location || '';
  const shop_rating = item.seller_info?.shop_rating || item.shop_rating || 0;
  const shop_name = item.seller_info?.shop_name || item.shop_name || '';

  let seller_status = 'Normal Seller';
  if (item.is_preferred_plus_seller || item.shopee_verified) seller_status = 'Preferred Seller';
  else if (item.is_official_shop) seller_status = 'Official Store';

  const rating = item.item_rating || {};
  const rating_average = Math.min(5, Math.max(0, rating.rating_star || 0));
  const ratingCounts = rating.rating_count || [];
  const review_count = Array.isArray(ratingCounts) && ratingCounts.length > 0
    ? ratingCounts[0] || ratingCounts.reduce((a: number, b: number) => a + b, 0)
    : (typeof ratingCounts === 'number' ? ratingCounts : 0);

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
    _source: item._source || 'api',
    _hasJsonLd: item._hasJsonLd || false,
    _dataQuality: item._dataQuality || 'full',
  };
}

// ─── FETCH CHAIN ───────────────────────────────────────────────────────────────

async function tryDirectApi(shopid: string, itemid: string): Promise<any | null> {
  const endpoints = [
    `https://shopee.com.br/api/v4/item/get?shopid=${shopid}&itemid=${itemid}`,
    `https://shopee.com.br/api/v4/pdp/get_pc?shop_id=${shopid}&item_id=${itemid}`,
    `https://shopee.com.br/api/v2/item/get?shopid=${shopid}&itemid=${itemid}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`API: ${endpoint.substring(0, 75)}...`);
      const res = await fetchSafe(endpoint, getApiHeaders(), 8000);
      if (!res.ok) { await res.text(); continue; }
      const text = await res.text();
      const json = JSON.parse(text);
      const item = extractItemFromApiResponse(json);
      if (item) {
        console.log('✓ Direct API success');
        item._source = 'api';
        item._dataQuality = 'full';
        return item;
      }
      if (json?.error === 90309999) console.log('✗ API blocked (90309999)');
    } catch (e: any) {
      console.log(`✗ API: ${e.message}`);
    }
  }
  return null;
}

async function tryProxiedApi(shopid: string, itemid: string): Promise<any | null> {
  // Try multiple API endpoints via proxies
  const apiUrls = [
    `https://shopee.com.br/api/v4/item/get?shopid=${shopid}&itemid=${itemid}`,
    `https://shopee.com.br/api/v2/item/get?shopid=${shopid}&itemid=${itemid}`,
  ];

  for (const apiUrl of apiUrls) {
    const text = await fetchViaProxy(apiUrl, true);
    if (!text) continue;
    try {
      const json = JSON.parse(text);
      const item = extractItemFromApiResponse(json);
      if (item) {
        console.log('✓ Proxied API success');
        item._source = 'proxy_api';
        item._dataQuality = 'full';
        return item;
      }
    } catch { /* not JSON */ }
  }
  return null;
}

async function tryHtmlExtraction(shopid: string, itemid: string): Promise<any | null> {
  // Build possible page URLs
  const pageUrls = [
    `https://shopee.com.br/product-i.${shopid}.${itemid}`,
    `https://shopee.com.br/-i.${shopid}.${itemid}`,
  ];

  for (const pageUrl of pageUrls) {
    // Try direct fetch first
    try {
      console.log(`HTML direct: ${pageUrl}`);
      const res = await fetchSafe(pageUrl, getHtmlHeaders(), 12000);
      if (res.ok) {
        const html = await res.text();
        console.log(`HTML loaded: ${html.length} chars`);
        const item = processHtml(html, shopid, itemid);
        if (item) return item;
      } else {
        await res.text();
        console.log(`✗ HTML direct: status ${res.status}`);
      }
    } catch (e: any) {
      console.log(`✗ HTML direct: ${e.message}`);
    }

    // Try via proxies
    const html = await fetchViaProxy(pageUrl, false);
    if (html && html.length > 500) {
      console.log(`Proxy HTML: ${html.length} chars`);
      const item = processHtml(html, shopid, itemid);
      if (item) return item;
    }
  }
  return null;
}

function processHtml(html: string, shopid: string, itemid: string): any | null {
  // 1. Try embedded JSON (most complete data)
  const embeddedItem = extractFromEmbeddedJson(html);
  if (embeddedItem) {
    embeddedItem._source = 'embedded_json';
    embeddedItem._dataQuality = 'full';
    return embeddedItem;
  }

  // 2. Try meta tags + JSON-LD + visible text patterns
  const metaItem = extractFromMetaAndStructuredData(html, shopid, itemid);
  if (metaItem) {
    console.log(`✓ Meta/JSON-LD extraction (quality: ${metaItem._dataQuality})`);
    return metaItem;
  }

  return null;
}

async function fetchProductData(shopid: string, itemid: string): Promise<any | null> {
  // STAGE 1: Direct Shopee API
  const directItem = await tryDirectApi(shopid, itemid);
  if (directItem) return directItem;

  // Small delay before next stage
  await new Promise(r => setTimeout(r, 500 + Math.random() * 500));

  // STAGE 2: API via CORS proxies
  const proxiedItem = await tryProxiedApi(shopid, itemid);
  if (proxiedItem) return proxiedItem;

  // STAGE 3: HTML page extraction (embedded JSON, meta tags, JSON-LD)
  const htmlItem = await tryHtmlExtraction(shopid, itemid);
  if (htmlItem) return htmlItem;

  return null;
}

// ─── VALIDATION ────────────────────────────────────────────────────────────────

function isDataUsable(data: any): boolean {
  return (
    typeof data.product_title === 'string' &&
    data.product_title.length >= 3 &&
    Number.isFinite(data.current_price) &&
    data.current_price > 0
  );
}

// ─── SEARCH ────────────────────────────────────────────────────────────────────

async function searchProducts(keyword: string, limit: number, filters?: any) {
  const endpoints = [
    `https://shopee.com.br/api/v4/search/search_items?keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2&by=relevancy`,
    `https://shopee.com.br/api/v2/search_items/?keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&by=relevancy`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Search: ${endpoint.substring(0, 60)}...`);
      const res = await fetchSafe(endpoint, getApiHeaders(), 10000);
      if (res.ok) {
        const json = await res.json();
        const items = json?.items || json?.data?.items || [];
        if (items.length > 0) {
          console.log(`Search: ${items.length} items`);
          return items.map((i: any) => {
            const item = i.item_basic || i;
            return buildProductData(item, String(item.shopid), String(item.itemid));
          });
        }
      } else {
        await res.text();
      }
    } catch (e: any) {
      console.log(`Search error: ${e.message}`);
    }
  }

  // Proxy fallback for search
  const text = await fetchViaProxy(endpoints[0], true);
  if (text) {
    try {
      const json = JSON.parse(text);
      const items = json?.items || json?.data?.items || [];
      if (items.length > 0) {
        return items.map((i: any) => {
          const item = i.item_basic || i;
          return buildProductData(item, String(item.shopid), String(item.itemid));
        });
      }
    } catch { /* not json */ }
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
    console.log('DB save (non-fatal):', e);
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
  } catch { return null; }
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
  } catch { return []; }
}

// ─── ANALYSIS ──────────────────────────────────────────────────────────────────

function computeAnalysis(product: any, competitors: any[]) {
  const price = product.current_price;
  const sold = product.total_sales;
  const rating = product.rating_average;
  const reviews = product.review_count;
  const stock = product.stock_available;
  const likes = product.likes;

  const salesScore = Math.min(sold / 10, 35);
  const ratingScore = rating >= 4.5 ? 25 : rating >= 4.0 ? 20 : rating >= 3.0 ? 10 : 0;
  const reviewScore = Math.min(reviews / 40, 25);
  const engagementScore = Math.min((stock + likes) / 200, 15);
  const performanceScore = Math.round(salesScore + ratingScore + reviewScore + engagementScore);

  let classification = { label: 'Produto Iniciante', level: 'low' };
  if (performanceScore >= 80) classification = { label: 'Produto Vencedor', level: 'winner' };
  else if (performanceScore >= 60) classification = { label: 'Boa Performance', level: 'high' };
  else if (performanceScore >= 35) classification = { label: 'Performance Média', level: 'medium' };

  const listingAgeDays = sold > 0 ? Math.max(Math.round(sold / Math.max(sold / 180, 1)), 30) : 0;
  const salesPerDay = listingAgeDays > 0 ? Math.round((sold / listingAgeDays) * 10) / 10 : 0;
  const salesLast30 = Math.round(salesPerDay * 30);
  const salesLast7 = Math.round(salesPerDay * 7);

  const positive = rating >= 4.0 ? Math.round(rating * 18) : Math.round(rating * 15);
  const negative = Math.round(Math.max(0, (5 - rating) * 10));
  const neutral = Math.max(0, 100 - positive - negative);

  const totalEstimated = price * sold;
  const monthlyEstimated = price * salesLast30;
  const dailyEstimated = price * salesPerDay;

  const demandScore = Math.min(100, Math.round(
    (salesPerDay >= 10 ? 40 : salesPerDay * 4) +
    (reviews >= 100 ? 30 : reviews * 0.3) +
    (rating >= 4.5 ? 30 : rating * 6)
  ));

  const allProducts = [product, ...competitors];
  const prices = allProducts.map((p: any) => p.current_price).filter((p: number) => p > 0);
  const sales = allProducts.map((p: any) => p.total_sales).filter((s: number) => s > 0);

  const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : price;
  const minPrice = prices.length > 0 ? Math.min(...prices) : price;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : price;
  const avgSales = sales.length > 0 ? Math.round(sales.reduce((a: number, b: number) => a + b, 0) / sales.length) : sold;
  const estimatedRevenue = avgPrice * avgSales;

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

function buildCacheResponse(cached: any, source: string) {
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

  return { success: true, product, competitors: [], metrics, analysis, dataSource: source, fromCache: true };
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, url, keyword, limit = 50, filters, shopid: rawShopid, itemid: rawItemid } = body;

    // ═══ ANALYZE LINK ═══
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

      console.log(`Analyzing: shopid=${ids.shopid}, itemid=${ids.itemid}`);

      // Attempt 1
      let item = await fetchProductData(ids.shopid, ids.itemid);

      // Retry once with delay if failed
      if (!item) {
        const delay = 1500 + Math.random() * 1500;
        console.log(`Retrying after ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        item = await fetchProductData(ids.shopid, ids.itemid);
      }

      // All extraction failed — check cache
      if (!item) {
        console.log('All extraction failed, checking cache...');
        const fresh = await getFromCache(ids.shopid, ids.itemid, 12);
        if (fresh) {
          const payload = buildCacheResponse(fresh, 'cache_12h');
          const history = await getHistory(ids.shopid, ids.itemid);
          if (history.length > 0) (payload.analysis as any).history = history;
          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const stale = await getFromCache(ids.shopid, ids.itemid, 0);
        if (stale) {
          const payload = buildCacheResponse(stale, 'cache_stale');
          const history = await getHistory(ids.shopid, ids.itemid);
          if (history.length > 0) (payload.analysis as any).history = history;
          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          success: false,
          error: 'Não foi possível obter dados do produto. A Shopee está bloqueando requisições do servidor. Tente novamente em alguns minutos.',
          blockedByShopee: true,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Build structured data
      const productData = buildProductData(item, ids.shopid, ids.itemid);

      // Validate
      if (!isDataUsable(productData)) {
        console.log('Data not usable, checking cache...');
        const cached = await getFromCache(ids.shopid, ids.itemid, 0);
        if (cached) {
          return new Response(JSON.stringify(buildCacheResponse(cached, 'cache_fallback')), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({
          success: false,
          error: 'Dados do produto incompletos. Tente novamente.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Save to cache
      await saveToDb(productData);

      // Search competitors
      let competitors: any[] = [];
      const titleWords = productData.product_title.split(/\s+/).slice(0, 3).join(' ');
      if (titleWords.length > 3) {
        const rawComp = await searchProducts(titleWords, 10);
        competitors = rawComp.filter((c: any) => String(c.itemid) !== ids.itemid).slice(0, 10);
      }

      const { analysis, metrics } = computeAnalysis(productData, competitors);
      const history = await getHistory(ids.shopid, ids.itemid);
      if (history.length > 0) (analysis as any).history = history;

      const dataFields: string[] = [];
      if (productData.current_price > 0) dataFields.push('price');
      if (productData.total_sales > 0) dataFields.push('sales');
      if (productData.stock_available > 0) dataFields.push('stock');
      if (productData.rating_average > 0) dataFields.push('rating');
      if (productData.review_count > 0) dataFields.push('reviews');

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
        score: (analysis as any).performanceScore,
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
        title: c.product_title, price: c.current_price, priceMin: c.current_price,
        priceMax: c.max_price, historicalSold: c.total_sales, stock: c.stock_available,
        ratingCount: c.review_count, ratingAvg: c.rating_average, shopName: c.shop_name,
        shopid: parseInt(c.shopid), itemid: parseInt(c.itemid), image: c.product_image, score: 0,
      }));

      return new Response(JSON.stringify({
        success: true,
        product,
        competitors: competitorProducts,
        metrics,
        analysis,
        dataSource: productData._source,
        dataFields,
        dataQuality: productData._dataQuality,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══ SEARCH ═══
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
          error: 'Nenhum produto encontrado. A Shopee pode estar bloqueando requisições.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let filtered = rawProducts;
      if (filters) {
        if (filters.minPrice) filtered = filtered.filter((p: any) => p.current_price >= filters.minPrice);
        if (filters.maxPrice) filtered = filtered.filter((p: any) => p.current_price <= filters.maxPrice);
        if (filters.minSales) filtered = filtered.filter((p: any) => p.total_sales >= filters.minSales);
        if (filters.minRating) filtered = filtered.filter((p: any) => p.rating_average >= filters.minRating);
      }

      const maxSales = Math.max(...filtered.map((p: any) => p.total_sales), 1);
      const products = filtered.map((p: any) => {
        const salesNorm = (p.total_sales / maxSales) * 40;
        const ratingNorm = (p.rating_average / 5) * 30;
        const reviewNorm = Math.min(p.review_count / 100, 1) * 30;
        const score = Math.round(salesNorm + ratingNorm + reviewNorm);
        return {
          title: p.product_title, price: p.current_price, priceMin: p.current_price,
          priceMax: p.max_price, historicalSold: p.total_sales, stock: p.stock_available,
          ratingCount: p.review_count, ratingAvg: p.rating_average, shopName: p.shop_name,
          shopid: parseInt(p.shopid), itemid: parseInt(p.itemid), image: p.product_image, score,
        };
      });

      const prices = products.map((p: any) => p.price).filter((p: number) => p > 0);
      const sales = products.map((p: any) => p.historicalSold);
      const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
      const avgSales = sales.length > 0 ? Math.round(sales.reduce((a: number, b: number) => a + b, 0) / sales.length) : 0;

      return new Response(JSON.stringify({
        success: true, products,
        metrics: {
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
        },
        total: rawProducts.length, filtered: products.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══ PRODUCT DETAILS ═══
    if (action === 'product_details') {
      const sid = rawShopid || '';
      const iid = rawItemid || '';
      if (!sid || !iid) {
        return new Response(JSON.stringify({ success: false, error: 'shopid e itemid são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const item = await fetchProductData(String(sid), String(iid));
      if (!item) {
        return new Response(JSON.stringify({ success: false, error: 'Não foi possível obter dados do produto.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = buildProductData(item, String(sid), String(iid));
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('Fatal error:', e);
    return new Response(JSON.stringify({ success: false, error: e.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
