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

function convertPrice(rawValue: unknown): number {
  const raw = typeof rawValue === 'string' ? Number(rawValue) : Number(rawValue || 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;

  // Shopee usually stores BRL prices in micro-units (×100000)
  if (raw >= 100000) return Math.round((raw / 100000) * 100) / 100;

  // Some responses use cents (×100)
  if (Number.isInteger(raw) && raw >= 100) return Math.round((raw / 100) * 100) / 100;

  // Already normalized
  return Math.round(raw * 100) / 100;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function firstPositiveNumber(...values: unknown[]): number {
  for (const value of values) {
    const num = toNumber(value);
    if (num > 0) return num;
  }
  return 0;
}

function sumVariationStock(models: any[] | undefined): number {
  if (!Array.isArray(models) || models.length === 0) return 0;
  return models.reduce((acc, model) => {
    const value = firstPositiveNumber(model?.stock, model?.normal_stock, model?.current_stock, model?.extinfo?.stock);
    return acc + value;
  }, 0);
}

function normalizeImage(image: unknown): string {
  if (typeof image !== 'string' || !image) return '';
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return `https://down-br.img.susercontent.com/file/${image}`;
}

function getSellerStatus(item: any): 'Preferred Seller' | 'Official Store' | 'Normal Seller' {
  const isOfficial = Boolean(
    item?.is_official_shop ||
    item?.official_shop ||
    item?.shop_info?.is_official_shop ||
    item?.shop_detailed?.is_official_shop ||
    item?.shop_is_official
  );

  if (isOfficial) return 'Official Store';

  const isPreferred = Boolean(
    item?.is_preferred_plus_seller ||
    item?.is_preferred_seller ||
    item?.shop_info?.is_preferred_shop ||
    item?.shop_detailed?.is_preferred_plus_seller ||
    item?.badge_icon_type === 1 ||
    item?.shopee_verified
  );

  return isPreferred ? 'Preferred Seller' : 'Normal Seller';
}

function extractCategory(item: any): string {
  if (Array.isArray(item?.categories) && item.categories.length > 0) {
    const names = item.categories
      .map((cat: any) => firstNonEmptyString(cat?.display_name, cat?.name))
      .filter(Boolean);
    if (names.length > 0) return names.join(' > ');
  }

  return firstNonEmptyString(
    item?.catid?.toString(),
    item?.category,
    item?.category_name,
    item?.item_category?.display_name,
  );
}

// Validate a price looks reasonable (BRL)
function isReasonablePrice(price: number): boolean {
  return price > 0.01 && price < 1000000;
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
  const ctime = firstPositiveNumber(item?.ctime, item?.cmt_time, item?.create_time);

  const rawPrice = firstPositiveNumber(item?.price, item?.price_min, item?.price_max, item?.current_price);
  const rawPriceMin = firstPositiveNumber(item?.price_min, item?.price, item?.price_max);
  const rawPriceMax = firstPositiveNumber(item?.price_max, item?.price, item?.price_min);
  const rawOriginalPrice = firstPositiveNumber(item?.price_before_discount, item?.original_price, item?.price_before_discount_min);

  const price = convertPrice(rawPrice);
  const priceMin = convertPrice(rawPriceMin || rawPrice);
  const priceMax = convertPrice(rawPriceMax || rawPrice);
  const originalPrice = convertPrice(rawOriginalPrice);

  const ratingCountArray = Array.isArray(item?.item_rating?.rating_count)
    ? item.item_rating.rating_count
    : (Array.isArray(item?.rating_count) ? item.rating_count : []);

  const reviewCount = Math.max(
    firstPositiveNumber(item?.cmt_count, item?.review_count, item?.comment_count, item?.rating_count),
    toNumber(ratingCountArray[0])
  );

  const ratingAvg = firstPositiveNumber(item?.item_rating?.rating_star, item?.rating_star, item?.rating_average, item?.rating_avg);

  const variationsStock = sumVariationStock(item?.models || item?.variations || item?.model_list);
  const stockAvailable = Math.max(firstPositiveNumber(item?.stock, item?.normal_stock, item?.current_stock), variationsStock);

  const historicalSold = firstPositiveNumber(item?.historical_sold, item?.sold, item?.sold_count, item?.item_sold, item?.sold_quantity);
  const likedCount = firstPositiveNumber(item?.liked_count, item?.liked, item?.favorite_count);

  const shopName = firstNonEmptyString(item?.shop_name, item?.shop_info?.shop_name, item?.shop_detailed?.name, item?.shop_info?.name);
  const shopLocation = firstNonEmptyString(item?.shop_location, item?.shop_info?.shop_location, item?.shop_detailed?.shop_location, item?.shop?.location);
  const sellerStatus = getSellerStatus(item);

  const normalizedTitle = firstNonEmptyString(item?.name, item?.title, item?.item_name);
  const normalizedImage = normalizeImage(firstNonEmptyString(item?.image, item?.images?.[0], item?.thumbnail));
  const category = extractCategory(item);
  const currency = firstNonEmptyString(item?.currency, item?.currency_code, item?.item_currency, 'BRL');

  const safePrice = isReasonablePrice(price) ? price : 0;
  const safeOriginalPrice = isReasonablePrice(originalPrice) ? originalPrice : safePrice;

  const discount = safeOriginalPrice > 0 && safePrice > 0 && safeOriginalPrice > safePrice
    ? Math.round(((safeOriginalPrice - safePrice) / safeOriginalPrice) * 100)
    : toNumber(item?.raw_discount || item?.discount || 0);

  return {
    title: normalizedTitle,
    product_title: normalizedTitle,
    price: safePrice,
    current_price: safePrice,
    priceMin: priceMin || safePrice,
    priceMax: priceMax || safePrice,
    originalPrice: safeOriginalPrice || safePrice,
    original_price: safeOriginalPrice || safePrice,
    currency,
    discount,
    historicalSold,
    historical_sold: historicalSold,
    stock: stockAvailable,
    stock_available: stockAvailable,
    variationsStock,
    variations_stock: variationsStock,
    ratingCount: reviewCount,
    review_count: reviewCount,
    ratingAvg,
    rating_star: ratingAvg,
    category,
    product_category: category,
    shopName,
    shop_name: shopName,
    shopLocation,
    shop_location: shopLocation,
    sellerStatus,
    seller_status: sellerStatus,
    preferred_seller: sellerStatus === 'Preferred Seller',
    shopid: toNumber(item?.shopid),
    itemid: toNumber(item?.itemid),
    image: normalizedImage,
    product_image: normalizedImage,
    ctime,
    shopRating: firstPositiveNumber(item?.shop_rating, item?.shop_info?.rating_star, item?.shop_detailed?.rating_star),
    shopFollowers: firstPositiveNumber(item?.follower_count, item?.shop_info?.follower_count, item?.shop_detailed?.follower_count),
    shopResponseRate: firstPositiveNumber(item?.response_rate, item?.shop_info?.response_rate, item?.shop_detailed?.response_rate),
    liked: likedCount,
    liked_count: likedCount,
    viewCount: firstPositiveNumber(item?.view_count, item?.click_count),
    ratingDetail: ratingCountArray,
    isPreferredSeller: sellerStatus === 'Preferred Seller',
    brand: firstNonEmptyString(item?.brand, item?.brand_name),
  };
}

function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  try {
    const clean = raw
      .trim()
      .replace(/^window\.[A-Z0-9_]+\s*=\s*/i, '')
      .replace(/;\s*$/, '')
      .replace(/<\/script>$/i, '');
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function extractBalancedJson(source: string, startIndex: number): string | null {
  if (startIndex < 0 || source[startIndex] !== '{') return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

// Deep search for a product object by itemid in a nested structure
function deepFindProduct(obj: any, targetItemid: number, targetShopid?: number, depth = 0): any | null {
  if (depth > 10 || !obj || typeof obj !== 'object') return null;

  const itemIdCandidate = toNumber(obj?.itemid);
  const shopIdCandidate = toNumber(obj?.shopid);
  const looksLikeProduct = Boolean(obj?.name || obj?.title || obj?.price || obj?.historical_sold || obj?.stock);

  if (itemIdCandidate === targetItemid && looksLikeProduct) {
    if (!targetShopid || !shopIdCandidate || shopIdCandidate === targetShopid) {
      return obj;
    }
  }

  for (const key of Object.keys(obj)) {
    const result = deepFindProduct(obj[key], targetItemid, targetShopid, depth + 1);
    if (result) return result;
  }

  return null;
}

function extractObjectContainingItemId(script: string, itemid: number, shopid: number): any | null {
  const itemRegex = new RegExp(`"itemid"\\s*:\\s*${itemid}`, 'g');
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(script)) !== null) {
    let start = script.lastIndexOf('{', match.index);

    while (start >= 0) {
      const candidateText = extractBalancedJson(script, start);
      if (!candidateText) break;

      const candidate = tryParseJson(candidateText);
      if (candidate) {
        const found = deepFindProduct(candidate, itemid, shopid) || candidate;
        if (toNumber(found?.itemid) === itemid && (toNumber(found?.shopid) === shopid || toNumber(found?.shopid) === 0)) {
          return found;
        }
      }

      start = script.lastIndexOf('{', start - 1);
      if (match.index - start > 12000) break;
    }
  }

  return null;
}

// Deep JSON extraction from HTML — prioritizes __INITIAL_STATE__ and __NEXT_DATA__
function extractProductFromPageJson(html: string, shopid: string, itemid: string): any | null {
  const parsedShopid = Number(shopid);
  const parsedItemid = Number(itemid);

  const jsonBlocks: any[] = [];

  // 1) Script tag __NEXT_DATA__
  for (const match of html.matchAll(/<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const parsed = tryParseJson(match[1]);
    if (parsed) jsonBlocks.push(parsed);
  }

  // 2) window.__NEXT_DATA__ assignment
  for (const match of html.matchAll(/window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\})\s*;?/g)) {
    const parsed = tryParseJson(match[1]);
    if (parsed) jsonBlocks.push(parsed);
  }

  // 3) window.__INITIAL_STATE__ assignment
  for (const match of html.matchAll(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?/g)) {
    const parsed = tryParseJson(match[1]);
    if (parsed) jsonBlocks.push(parsed);
  }

  // 4) Common preload payload objects
  for (const match of html.matchAll(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?/g)) {
    const parsed = tryParseJson(match[1]);
    if (parsed) jsonBlocks.push(parsed);
  }

  for (const block of jsonBlocks) {
    const commonPaths = [
      block?.props?.pageProps?.initialState,
      block?.props?.pageProps?.item,
      block?.props?.pageProps?.itemData,
      block?.props?.pageProps?.itemDetail,
      block?.props?.pageProps?.product,
      block?.itemDetail,
      block?.item,
      block?.data,
    ];

    for (const path of commonPaths) {
      const found = deepFindProduct(path, parsedItemid, parsedShopid);
      if (found) {
        console.log('Extracted product from embedded page JSON');
        return found;
      }
    }

    const deepFound = deepFindProduct(block, parsedItemid, parsedShopid);
    if (deepFound) {
      console.log('Extracted product via deep JSON traversal');
      return deepFound;
    }
  }

  // 5) JSON-LD fallback (for price/title/image/rating)
  for (const match of html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const ld = tryParseJson(match[1]);
    if (!ld) continue;

    const productNode = Array.isArray(ld)
      ? ld.find((node: any) => node?.['@type'] === 'Product' || node?.name)
      : (ld?.['@type'] === 'Product' || ld?.name ? ld : null);

    if (productNode) {
      return {
        itemid: parsedItemid,
        shopid: parsedShopid,
        name: productNode.name || '',
        image: Array.isArray(productNode.image) ? productNode.image[0] : productNode.image,
        price: productNode.offers?.price ? Number(productNode.offers.price) : 0,
        original_price: productNode.offers?.highPrice ? Number(productNode.offers.highPrice) : 0,
        currency: productNode.offers?.priceCurrency || 'BRL',
        rating_star: productNode.aggregateRating?.ratingValue ? Number(productNode.aggregateRating.ratingValue) : 0,
        review_count: productNode.aggregateRating?.reviewCount ? Number(productNode.aggregateRating.reviewCount) : 0,
        _fromLd: true,
      };
    }
  }

  // 6) Inline script extraction by itemid token + balanced JSON parsing
  for (const scriptMatch of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const content = scriptMatch[1];
    if (!content.includes('itemid')) continue;
    const extracted = extractObjectContainingItemId(content, parsedItemid, parsedShopid);
    if (extracted) {
      console.log('Extracted product from inline script object');
      return extracted;
    }
  }

  return null;
}

function parseProductFromHtml(html: string, shopid: string, itemid: string) {
  try {
    // Try structured JSON extraction first
    const jsonItem = extractProductFromPageJson(html, shopid, itemid);
    if (jsonItem) {
      if (jsonItem._fromLd) {
        // JSON-LD data has different structure, prices already converted
        return {
          title: jsonItem.name || '',
          price: jsonItem.price,
          priceMin: jsonItem.price,
          priceMax: jsonItem.price,
          originalPrice: jsonItem.price,
          discount: 0,
          historicalSold: 0,
          stock: 0,
          ratingCount: jsonItem.ratingCount || 0,
          ratingAvg: jsonItem.ratingAvg || 0,
          category: '',
          shopName: '',
          shopid: parseInt(shopid),
          itemid: parseInt(itemid),
          image: jsonItem.image || '',
          ctime: 0,
          shopRating: 0,
          shopFollowers: 0,
          shopResponseRate: 0,
          shopLocation: '',
          liked: 0,
          viewCount: 0,
          ratingDetail: [],
          isPreferredSeller: false,
          brand: '',
        };
      }
      const product = parseProduct({ ...jsonItem, shopid: parseInt(shopid), itemid: parseInt(itemid) });
      if (product.title || product.price > 0 || product.historicalSold > 0) {
        console.log(`JSON extraction successful: title="${product.title}", price=${product.price}, sold=${product.historicalSold}`);
        return product;
      }
    }

    // Fallback: regex-based extraction from embedded JSON fragments
    console.log('Falling back to regex extraction from HTML');
    const extract = (patterns: RegExp[]): string => {
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1];
      }
      return '';
    };

    const extractNum = (patterns: RegExp[]): number => {
      const v = extract(patterns);
      return v ? parseFloat(v) : 0;
    };

    const getMetaContent = (name: string) => {
      const m = html.match(new RegExp(`<meta[^>]*(?:property|name)="${name}"[^>]*content="([^"]*)"`, 'i'));
      return m?.[1] || '';
    };

    const title = extract([
      /"name"\s*:\s*"([^"]{10,})"/,
      /"title"\s*:\s*"([^"]{10,})"/,
    ]) || getMetaContent('og:title')?.replace(/\s*\|\s*Shopee Brasil.*$/, '') || '';

    // Price extraction with multiple strategies
    const rawPrice = extractNum([
      /"price"\s*:\s*(\d+)/,
      /"price_max"\s*:\s*(\d+)/,
    ]);
    const metaPrice = parseFloat(getMetaContent('product:price:amount') || '0');
    const priceFromText = (() => {
      const m = html.match(/R\$\s*([\d.,]+)/);
      return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : 0;
    })();

    const price = rawPrice > 0 ? convertPrice(rawPrice) : (metaPrice || priceFromText);

    const originalPrice = convertPrice(extractNum([
      /"price_before_discount"\s*:\s*(\d+)/,
      /"original_price"\s*:\s*(\d+)/,
    ]));

    const historicalSold = extractNum([
      /"historical_sold"\s*:\s*(\d+)/,
      /"sold"\s*:\s*(\d+)/,
    ]);

    const stock = extractNum([/"stock"\s*:\s*(\d+)/]);

    const ratingAvg = extractNum([
      /"rating_star"\s*:\s*([\d.]+)/,
      /"rating"\s*:\s*([\d.]+)/,
    ]);

    const ratingCount = extractNum([
      /"cmt_count"\s*:\s*(\d+)/,
      /"rating_count"\s*:\s*\[(\d+)/,
    ]);

    const ctime = extractNum([/"ctime"\s*:\s*(\d+)/]);
    const liked = extractNum([/"liked_count"\s*:\s*(\d+)/, /"liked"\s*:\s*(\d+)/]);
    const viewCount = extractNum([/"view_count"\s*:\s*(\d+)/]);

    const shopName = extract([/"shop_name"\s*:\s*"([^"]+)"/]) || '';
    const shopLocation = extract([/"shop_location"\s*:\s*"([^"]+)"/]) || '';
    const shopRating = extractNum([/"shop_rating"\s*:\s*([\d.]+)/]);
    const shopFollowers = extractNum([/"follower_count"\s*:\s*(\d+)/]);
    const shopResponseRate = extractNum([/"response_rate"\s*:\s*(\d+)/]);

    const image = getMetaContent('og:image') || '';
    const brand = extract([/"brand"\s*:\s*"([^"]+)"/]) || '';
    const category = extract([/"display_name"\s*:\s*"([^"]+)"/]) || '';

    const isPreferred = html.includes('preferred_plus') || html.includes('shopee_verified') || html.includes('"badge_icon_type":1');
    const discount = extractNum([/"raw_discount"\s*:\s*(\d+)/, /"discount"\s*:\s*(\d+)/]);

    if (!title && price <= 0 && historicalSold <= 0) return null;

    return {
      title,
      price,
      priceMin: price,
      priceMax: price,
      originalPrice: originalPrice > 0 ? originalPrice : price,
      discount,
      historicalSold,
      stock,
      ratingCount,
      ratingAvg,
      category,
      shopName,
      shopid: parseInt(shopid),
      itemid: parseInt(itemid),
      image,
      ctime,
      shopRating,
      shopFollowers,
      shopResponseRate,
      shopLocation,
      liked,
      viewCount,
      ratingDetail: [],
      isPreferredSeller: isPreferred,
      brand,
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
    const price = parseFloat(row.preco);
    const vendas = row.vendas || 0;
    const avaliacoes = row.avaliacoes || 0;
    
    // Only use cache if it has meaningful data
    if (price <= 0 && vendas <= 0 && avaliacoes <= 0) {
      console.log('Cached data has all zeros — skipping cache');
      return null;
    }
    
    return {
      title: row.titulo, price, priceMin: price, priceMax: price,
      originalPrice: price,
      discount: 0,
      historicalSold: vendas, stock: row.estoque || 0, ratingCount: avaliacoes,
      ratingAvg: parseFloat(row.avaliacao_media || '0'), category: row.categoria || '',
      shopName: row.nome_loja || '', shopid: row.shopid, itemid: row.itemid, image: '',
      _cached: true, ctime: 0, shopRating: 0, shopFollowers: 0, shopResponseRate: 0,
      shopLocation: '', liked: 0, viewCount: 0, ratingDetail: [],
      isPreferredSeller: false, brand: '',
    };
  }
  return null;
}

// Get historical records for trend analysis
async function getHistoricalRecords(supabase: any, shopid: string, itemid: string) {
  const { data } = await supabase
    .from('produtos_analisados')
    .select('preco, vendas, data_coleta')
    .eq('shopid', parseInt(shopid))
    .eq('itemid', parseInt(itemid))
    .order('data_coleta', { ascending: true })
    .limit(100);
  return data || [];
}

async function saveToCache(supabase: any, product: any, score: number) {
  // Don't cache products with all zero values
  if (product.price <= 0 && product.historicalSold <= 0 && product.ratingCount <= 0) {
    console.log('Skipping cache save — all values are zero');
    return;
  }
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
  const htmlHeaders = {
    ...getHeaders('/'),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const strategies: { label: string; fn: () => Promise<any> }[] = [
    {
      label: 'v4 API',
      fn: async () => {
        const url = `${SHOPEE_BASE}/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;
        const response = await fetchWithRetry(url, getHeaders(`/product-i.${shopid}.${itemid}`));
        if (!response.ok) return null;
        const json = await response.json();
        const item = json.data || json.item;
        return item ? parseProduct(item) : null;
      }
    },
    {
      label: 'v2 API',
      fn: async () => {
        await delay(500 + Math.random() * 500);
        const url = `${SHOPEE_BASE}/api/v2/item/get?itemid=${itemid}&shopid=${shopid}`;
        const response = await fetchWithRetry(url, getHeaders(`/product-i.${shopid}.${itemid}`));
        if (!response.ok) return null;
        const json = await response.json();
        const item = json.data || json.item;
        return item ? parseProduct(item) : null;
      }
    },
    {
      label: 'HTML scraping (product page)',
      fn: async () => {
        await delay(800 + Math.random() * 700);
        const url = `${SHOPEE_BASE}/product-i.${shopid}.${itemid}`;
        const response = await fetchWithRetry(url, htmlHeaders);
        if (!response.ok) return null;
        const html = await response.text();
        console.log(`HTML page size: ${html.length} chars`);
        console.log(`Contains __NEXT_DATA__: ${html.includes('__NEXT_DATA__')}`);
        console.log(`Contains __INITIAL_STATE__: ${html.includes('__INITIAL_STATE__')}`);
        console.log(`Contains ld+json: ${html.includes('application/ld+json')}`);
        return parseProductFromHtml(html, shopid, itemid);
      }
    },
    {
      label: 'HTML scraping (alternate URL)',
      fn: async () => {
        await delay(600 + Math.random() * 500);
        const url = `${SHOPEE_BASE}/-i.${shopid}.${itemid}`;
        const response = await fetchWithRetry(url, htmlHeaders);
        if (!response.ok) return null;
        const html = await response.text();
        return parseProductFromHtml(html, shopid, itemid);
      }
    },
    {
      label: 'Mobile web API',
      fn: async () => {
        await delay(500 + Math.random() * 500);
        const mobileHeaders = {
          ...getHeaders('/'),
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        };
        const url = `https://shopee.com.br/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;
        const response = await fetchWithRetry(url, mobileHeaders, 2);
        if (!response.ok) return null;
        const json = await response.json();
        const item = json.data || json.item;
        return item ? parseProduct(item) : null;
      }
    },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`Trying: ${strategy.label}`);
      const result = await strategy.fn();
      if (result && (result.price > 0 || result.historicalSold > 0 || result.ratingCount > 0)) {
        console.log(`Success: ${strategy.label} — price=${result.price}, sold=${result.historicalSold}`);
        return result;
      }
      console.log(`${strategy.label}: returned but with no useful data`);
    } catch (err) {
      console.log(`${strategy.label} failed:`, err);
    }
  }

  throw new Error('Não foi possível obter dados do produto. A Shopee pode estar bloqueando requisições externas. Tente novamente em alguns minutos.');
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

function classifyProduct(score: number): { label: string; level: string } {
  if (score >= 80) return { label: 'Produto Vencedor', level: 'winner' };
  if (score >= 60) return { label: 'Alto Potencial', level: 'high' };
  if (score >= 40) return { label: 'Potencial Médio', level: 'medium' };
  return { label: 'Baixo Potencial', level: 'low' };
}

function estimateSalesMetrics(product: any) {
  let listingAgeDays = 0;
  if (product.ctime && product.ctime > 0) {
    listingAgeDays = Math.max(1, Math.floor((Date.now() / 1000 - product.ctime) / 86400));
  } else {
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
  const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgSales = Math.round(sales.reduce((a: number, b: number) => a + b, 0) / sales.length);
  const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
  const competitors = products.length;
  const estimatedRevenue = Math.round(avgPrice * avgSales);
  const priceVsAvg = originalPrice && avgPrice > 0 ? originalPrice / avgPrice : 1;
  const opportunityScore = calculateOpportunityScore(avgSales, competitors, avgRating, priceVsAvg);
  return { avgPrice, minPrice, maxPrice, avgSales, avgRating, competitors, estimatedRevenue, opportunityScore };
}

// Calculate market demand score based on multiple signals
function calculateMarketDemandScore(product: any, metrics: any, salesMetrics: any): number {
  let score = 0;
  // Sales velocity weight
  if (salesMetrics.salesPerDay >= 10) score += 30;
  else if (salesMetrics.salesPerDay >= 3) score += 20;
  else if (salesMetrics.salesPerDay >= 1) score += 10;
  // Total sales volume
  if (product.historicalSold >= 5000) score += 25;
  else if (product.historicalSold >= 1000) score += 20;
  else if (product.historicalSold >= 100) score += 10;
  // Rating quality
  if (product.ratingAvg >= 4.5 && product.ratingCount >= 50) score += 20;
  else if (product.ratingAvg >= 4.0) score += 10;
  // View/engagement
  if (product.viewCount > 0) score += 10;
  if (product.liked > 100) score += 15;
  else if (product.liked > 10) score += 5;
  return Math.min(score, 100);
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

      // Validate we have meaningful data
      const hasData = product.price > 0 || product.historicalSold > 0 || product.ratingCount > 0;
      if (!hasData && !product.title) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Não foi possível extrair dados deste produto. A Shopee pode ter bloqueado a requisição. Tente novamente em alguns minutos.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const keywords = product.title.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4).join(' ');
      await delay(600 + Math.random() * 600);
      const competitors = await searchProducts(keywords, 50);
      const metrics = calculateMarketMetrics(competitors, product.price);

      // Extended analysis
      const performanceScore = calculatePerformanceScore(product, competitors);
      const classification = classifyProduct(performanceScore);
      const salesMetrics = estimateSalesMetrics(product);

      // Revenue estimation
      const estimatedRevenue = Math.round(product.price * product.historicalSold);
      const monthlyRevenue = Math.round(product.price * salesMetrics.salesLast30);

      // Market demand score
      const demandScore = calculateMarketDemandScore(product, metrics, salesMetrics);

      // Sentiment from rating distribution
      const rd = product.ratingDetail || [];
      const total = rd[0] || product.ratingCount || 1;
      const sentiment = {
        positive: rd[5] ? Math.round(((rd[5] + (rd[4] || 0)) / total) * 100) : (product.ratingAvg >= 4 ? 80 : 50),
        neutral: rd[3] ? Math.round((rd[3] / total) * 100) : 15,
        negative: rd[1] ? Math.round(((rd[1] + (rd[2] || 0)) / total) * 100) : (product.ratingAvg < 3 ? 40 : 5),
      };

      // Historical records for trend
      const history = await getHistoricalRecords(supabase, extractedShopid, extractedItemid);

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
              isPreferred: product.isPreferredSeller,
            },
            revenue: {
              totalEstimated: estimatedRevenue,
              monthlyEstimated: monthlyRevenue,
              dailyEstimated: Math.round(product.price * salesMetrics.salesPerDay),
            },
            demandScore,
            history: history.map((h: any) => ({
              date: h.data_coleta,
              price: parseFloat(h.preco),
              sold: h.vendas,
            })),
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
