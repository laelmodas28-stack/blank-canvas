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

function sanitizeProductTitle(value: unknown): string {
  const cleaned = firstNonEmptyString(value)
    .replace(/\s*([|–\-])\s*Shopee\s*Brasil.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  if (/^shopee\s*brasil\b/i.test(cleaned)) return '';
  if (/^ofertas\s+incr[íi]veis/i.test(cleaned)) return '';

  return cleaned;
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

function getShopeeHtmlHeaders(refererPath = '/') {
  return {
    ...getHeaders(refererPath),
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'text/html',
  };
}

async function fetchHtmlWithSingleRetry(url: string, refererPath = '/'): Promise<string | null> {
  const headers = getShopeeHtmlHeaders(refererPath);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        return html || null;
      }

      if (attempt === 0) {
        await delay(450 + Math.random() * 450);
        continue;
      }

      console.log(`HTML fetch failed (${response.status}) for ${url}`);
      return null;
    } catch (error) {
      if (attempt === 0) {
        await delay(450 + Math.random() * 450);
        continue;
      }

      console.log(`HTML fetch error for ${url}:`, error);
      return null;
    }
  }

  return null;
}

function parseProduct(item: any) {
  const ctime = firstPositiveNumber(item?.ctime, item?.cmt_time, item?.create_time);
  const isFromLd = Boolean(item?._fromLd);

  const rawPrice = firstPositiveNumber(item?.price, item?.price_min, item?.price_max, item?.current_price);
  const rawPriceMin = firstPositiveNumber(item?.price_min, item?.price, item?.price_max);
  const rawPriceMax = firstPositiveNumber(item?.price_max, item?.price, item?.price_min);
  const rawOriginalPrice = firstPositiveNumber(item?.price_before_discount, item?.original_price, item?.price_before_discount_min);

  // JSON-LD and meta tag prices are already in BRL — skip conversion
  const price = isFromLd ? Math.round(toNumber(rawPrice) * 100) / 100 : convertPrice(rawPrice);
  const priceMin = isFromLd ? Math.round(toNumber(rawPriceMin || rawPrice) * 100) / 100 : convertPrice(rawPriceMin || rawPrice);
  const priceMax = isFromLd ? Math.round(toNumber(rawPriceMax || rawPrice) * 100) / 100 : convertPrice(rawPriceMax || rawPrice);
  const originalPrice = isFromLd ? Math.round(toNumber(rawOriginalPrice) * 100) / 100 : convertPrice(rawOriginalPrice);

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

  const normalizedTitle = sanitizeProductTitle(firstNonEmptyString(item?.name, item?.title, item?.item_name));
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

function scoreProductCandidate(candidate: any, targetItemid: number, targetShopid?: number): number {
  if (!candidate || typeof candidate !== 'object') return 0;

  const itemId = toNumber(candidate?.itemid);
  const shopId = toNumber(candidate?.shopid);
  const title = sanitizeProductTitle(firstNonEmptyString(candidate?.name, candidate?.title, candidate?.item_name));

  const itemMatchScore = itemId === targetItemid ? 10 : 0;
  const shopMatchScore = !targetShopid ? 3 : (shopId === targetShopid ? 6 : (!shopId ? 2 : 0));
  const titleScore = title.length >= 8 ? 4 : 0;
  const priceScore = firstPositiveNumber(candidate?.price, candidate?.price_min, candidate?.price_max, candidate?.current_price, candidate?.price_before_discount) > 0 ? 6 : 0;
  const soldScore = firstPositiveNumber(candidate?.historical_sold, candidate?.sold, candidate?.sold_count, candidate?.item_sold) > 0 ? 4 : 0;
  const ratingScore = firstPositiveNumber(candidate?.item_rating?.rating_star, candidate?.rating_star, candidate?.rating_avg, candidate?.rating_average) > 0 ? 3 : 0;
  const reviewScore = firstPositiveNumber(candidate?.cmt_count, candidate?.review_count, candidate?.rating_count) > 0 ? 2 : 0;
  const stockScore = firstPositiveNumber(candidate?.stock, candidate?.normal_stock, candidate?.current_stock) > 0 ? 2 : 0;
  const imageScore = firstNonEmptyString(candidate?.image, candidate?.images?.[0], candidate?.thumbnail) ? 1 : 0;

  return itemMatchScore + shopMatchScore + titleScore + priceScore + soldScore + ratingScore + reviewScore + stockScore + imageScore;
}

type CandidateTraversalState = {
  visited: number;
  maxVisited: number;
  maxDepth: number;
  maxCandidates: number;
};

function collectProductCandidates(
  obj: any,
  targetItemid: number,
  targetShopid?: number,
  depth = 0,
  seen = new WeakSet<object>(),
  out: any[] = [],
  state: CandidateTraversalState = { visited: 0, maxVisited: 3500, maxDepth: 10, maxCandidates: 120 },
): any[] {
  if (!obj || typeof obj !== 'object') return out;
  if (depth > state.maxDepth || seen.has(obj)) return out;
  if (state.visited >= state.maxVisited || out.length >= state.maxCandidates) return out;

  seen.add(obj);
  state.visited += 1;

  const itemIdCandidate = toNumber(obj?.itemid);
  const shopIdCandidate = toNumber(obj?.shopid);

  if (itemIdCandidate === targetItemid) {
    if (!targetShopid || !shopIdCandidate || shopIdCandidate === targetShopid) {
      out.push(obj);
      if (out.length >= state.maxCandidates) return out;
    }
  }

  const embeddedNodes = [obj?.item, obj?.item_basic, obj?.itemDetail, obj?.item_data, obj?.data?.item, obj?.item_info];
  for (const node of embeddedNodes) {
    if (out.length >= state.maxCandidates) return out;
    if (node && typeof node === 'object' && toNumber(node?.itemid) === targetItemid) {
      const nodeShopId = toNumber(node?.shopid);
      if (!targetShopid || !nodeShopId || nodeShopId === targetShopid) {
        out.push(node);
      }
    }
  }

  if (Array.isArray(obj)) {
    for (const entry of obj) {
      if (state.visited >= state.maxVisited || out.length >= state.maxCandidates) break;
      collectProductCandidates(entry, targetItemid, targetShopid, depth + 1, seen, out, state);
    }
    return out;
  }

  for (const key of Object.keys(obj)) {
    if (state.visited >= state.maxVisited || out.length >= state.maxCandidates) break;
    collectProductCandidates(obj[key], targetItemid, targetShopid, depth + 1, seen, out, state);
  }

  return out;
}

// Deep search for the best product object by itemid in a nested structure
function deepFindProduct(obj: any, targetItemid: number, targetShopid?: number): any | null {
  const candidates = collectProductCandidates(obj, targetItemid, targetShopid);
  if (candidates.length === 0) return null;

  let bestCandidate: any | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = scoreProductCandidate(candidate, targetItemid, targetShopid);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function extractObjectContainingItemId(script: string, itemid: number, shopid: number): any | null {
  const itemRegex = new RegExp(`"itemid"\\s*:\\s*${itemid}`, 'g');
  let match: RegExpExecArray | null;
  let bestCandidate: any | null = null;
  let bestScore = -1;

  while ((match = itemRegex.exec(script)) !== null) {
    let start = script.lastIndexOf('{', match.index);

    while (start >= 0) {
      const candidateText = extractBalancedJson(script, start);
      if (!candidateText) break;

      const candidate = tryParseJson(candidateText);
      if (candidate) {
        const resolvedCandidate = deepFindProduct(candidate, itemid, shopid) || candidate;
        if (toNumber(resolvedCandidate?.itemid) === itemid && (toNumber(resolvedCandidate?.shopid) === shopid || toNumber(resolvedCandidate?.shopid) === 0)) {
          const score = scoreProductCandidate(resolvedCandidate, itemid, shopid);
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = resolvedCandidate;
          }
        }
      }

      start = script.lastIndexOf('{', start - 1);
      if (match.index - start > 12000) break;
    }
  }

  return bestCandidate;
}

// Extract meta tag content from HTML
function getMetaContent(html: string, name: string): string {
  const match = html.match(new RegExp(`<meta[^>]*(?:property|name)="${name}"[^>]*content="([^"]*)"`, 'i'));
  return match?.[1] || '';
}

function extractJsonObjectsAfterAssignments(source: string, assignmentRegexes: RegExp[]): any[] {
  const blocks: any[] = [];
  const seen = new Set<string>();

  for (const assignmentRegex of assignmentRegexes) {
    const regex = assignmentRegex.global ? assignmentRegex : new RegExp(assignmentRegex.source, `${assignmentRegex.flags}g`);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const assignmentEnd = match.index + match[0].length;
      const objectStart = source.indexOf('{', assignmentEnd);
      if (objectStart < 0) continue;

      const jsonText = extractBalancedJson(source, objectStart);
      if (!jsonText || seen.has(jsonText)) continue;

      const parsed = tryParseJson(jsonText);
      if (parsed) {
        seen.add(jsonText);
        blocks.push(parsed);
      }
    }
  }

  return blocks;
}

// Deep JSON extraction from HTML — prioritizes INITIAL_STATE/NEXT_DATA payloads
function extractProductFromPageJson(html: string, shopid: string, itemid: string): any | null {
  const parsedShopid = Number(shopid);
  const parsedItemid = Number(itemid);

  const jsonBlocks: any[] = [];

  // 1) Script tag payloads
  for (const match of html.matchAll(/<script\s+id="(?:__NEXT_DATA__|NEXT_DATA)"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const parsed = tryParseJson(match[1]);
    if (parsed) jsonBlocks.push(parsed);
  }

  // 2) window.* JSON assignments with balanced-brace extraction
  jsonBlocks.push(
    ...extractJsonObjectsAfterAssignments(html, [
      /window\.__NEXT_DATA__\s*=/g,
      /window\.NEXT_DATA\s*=/g,
      /window\.__INITIAL_STATE__\s*=/g,
      /window\.INITIAL_STATE\s*=/g,
      /window\.__PRELOADED_STATE__\s*=/g,
      /window\.PRELOADED_STATE\s*=/g,
    ])
  );

  for (const block of jsonBlocks.slice(0, 6)) {
    const commonPaths = [
      block?.props?.pageProps?.initialState,
      block?.props?.pageProps?.item,
      block?.props?.pageProps?.itemData,
      block?.props?.pageProps?.itemDetail,
      block?.props?.pageProps?.product,
      block?.itemDetail,
      block?.item,
      block?.item_basic,
      block?.data,
      block,
    ];

    let bestCandidate: any | null = null;
    let bestScore = -1;

    for (const path of commonPaths) {
      const found = deepFindProduct(path, parsedItemid, parsedShopid);
      if (!found) continue;

      const score = scoreProductCandidate(found, parsedItemid, parsedShopid);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = found;
      }
    }

    if (bestCandidate) {
      console.log(`Extracted product from embedded page JSON (score=${bestScore})`);
      return bestCandidate;
    }
  }

  // 3) JSON-LD fallback (price/title/image/rating)
  for (const match of html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const ld = tryParseJson(match[1]);
    if (!ld) continue;

    const productNode = Array.isArray(ld)
      ? ld.find((node: any) => node?.['@type'] === 'Product' || node?.name)
      : (ld?.['@type'] === 'Product' || ld?.name ? ld : null);

    if (!productNode) continue;

    let ldPrice = 0;
    let ldOriginalPrice = 0;
    let ldCurrency = 'BRL';

    const offers = productNode.offers;
    if (offers) {
      if (Array.isArray(offers)) {
        const firstOffer = offers[0];
        ldPrice = firstPositiveNumber(firstOffer?.price, firstOffer?.lowPrice);
        ldOriginalPrice = firstPositiveNumber(firstOffer?.highPrice, firstOffer?.price);
        ldCurrency = firstNonEmptyString(firstOffer?.priceCurrency, 'BRL');
      } else {
        ldPrice = firstPositiveNumber(offers?.price, offers?.lowPrice);
        ldOriginalPrice = firstPositiveNumber(offers?.highPrice, offers?.price);
        ldCurrency = firstNonEmptyString(offers?.priceCurrency, 'BRL');
      }
    }

    const metaTitle = sanitizeProductTitle(getMetaContent(html, 'og:title'));
    const metaImage = getMetaContent(html, 'og:image');
    const metaPrice = toNumber(getMetaContent(html, 'product:price:amount'));
    const metaCurrency = firstNonEmptyString(getMetaContent(html, 'product:price:currency'), ldCurrency);

    const ldName = sanitizeProductTitle(productNode.name || '');
    const isVariationName = ldName.length < 20 && (/[,\/]/.test(ldName) || !ldName.includes(' '));
    const finalTitle = isVariationName && metaTitle ? metaTitle : firstNonEmptyString(ldName, metaTitle);
    const finalPrice = firstPositiveNumber(ldPrice, metaPrice);
    const finalImage = firstNonEmptyString(
      Array.isArray(productNode.image) ? productNode.image[0] : productNode.image,
      metaImage,
    );

    console.log(`JSON-LD extracted: title="${finalTitle}", price=${finalPrice}, ldPrice=${ldPrice}, metaPrice=${metaPrice}`);

    return {
      itemid: parsedItemid,
      shopid: parsedShopid,
      name: finalTitle,
      image: finalImage,
      price: finalPrice,
      original_price: firstPositiveNumber(ldOriginalPrice, finalPrice),
      currency: metaCurrency,
      rating_star: productNode.aggregateRating?.ratingValue ? Number(productNode.aggregateRating.ratingValue) : 0,
      review_count: productNode.aggregateRating?.reviewCount ? Number(productNode.aggregateRating.reviewCount) : 0,
      _fromLd: true,
    };
  }

  // 4) Inline script extraction by itemid token + balanced JSON parsing (bounded to avoid CPU exhaustion)
  const inlineScriptMatches = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)).slice(0, 24);
  for (const scriptMatch of inlineScriptMatches) {
    const content = scriptMatch[1];
    if (!content || content.length > 250000 || !content.includes('itemid')) continue;

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
    // 0) Always extract meta tags first — they're the most reliable on Shopee
    const metaTitle = sanitizeProductTitle(getMetaContent(html, 'og:title'));
    const metaImage = getMetaContent(html, 'og:image');
    const metaPrice = toNumber(getMetaContent(html, 'product:price:amount'));
    const metaCurrency = firstNonEmptyString(getMetaContent(html, 'product:price:currency'), 'BRL');
    const metaDescription = getMetaContent(html, 'og:description');
    const titleTag = sanitizeProductTitle(html.match(/<title>([^<]+)<\/title>/i)?.[1] || '');

    console.log(`Meta tags: title="${metaTitle}", price=${metaPrice}, image=${metaImage ? 'yes' : 'no'}`);

    // 1) JSON-first extraction from embedded objects
    const jsonItem = extractProductFromPageJson(html, shopid, itemid);
    if (jsonItem) {
      // Supplement JSON data with meta tags
      if (!jsonItem.name || (jsonItem.name.length < 20 && /[,\/]/.test(jsonItem.name))) {
        jsonItem.name = metaTitle || titleTag || jsonItem.name;
      }
      if (!jsonItem.image) jsonItem.image = metaImage;
      if (toNumber(jsonItem.price) <= 0 && metaPrice > 0) jsonItem.price = metaPrice;

      const parsed = parseProduct({ ...jsonItem, shopid: Number(shopid), itemid: Number(itemid) });
      
      // Even if JSON extraction got partial data, supplement with meta
      if (parsed.price <= 0 && metaPrice > 0) {
        parsed.price = metaPrice;
        parsed.current_price = metaPrice;
        parsed.priceMin = metaPrice;
        parsed.priceMax = metaPrice;
      }
      if (!parsed.title && metaTitle) {
        parsed.title = metaTitle;
        parsed.product_title = metaTitle;
      }
      if (!parsed.image && metaImage) {
        parsed.image = metaImage;
        parsed.product_image = metaImage;
      }

      if (parsed.title || parsed.price > 0 || parsed.historicalSold > 0 || parsed.ratingCount > 0) {
        console.log(`JSON extraction successful: title="${parsed.title}", price=${parsed.price}, sold=${parsed.historicalSold}`);
        return parsed;
      }
    }

    // 2) Meta-tag-first fallback with regex supplementation
    console.log('Falling back to meta tags + regex selectors');

    const extract = (patterns: RegExp[]): string => {
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return match[1];
      }
      return '';
    };

    const extractNumber = (patterns: RegExp[]): number => {
      const raw = extract(patterns);
      return raw ? toNumber(raw) : 0;
    };

    // Extract sold count from description text like "X mil vendidos" or "X vendidos"
    let soldFromDescription = 0;
    const soldMatch = metaDescription.match(/([\d.,]+)\s*(?:mil\s+)?vendidos?/i);
    if (soldMatch) {
      let soldVal = toNumber(soldMatch[1]);
      if (metaDescription.includes('mil vendidos')) soldVal *= 1000;
      soldFromDescription = Math.round(soldVal);
    }

    const title = sanitizeProductTitle(firstNonEmptyString(
      metaTitle,
      titleTag,
      extract([/"name"\s*:\s*"([^"]{10,})"/, /"title"\s*:\s*"([^"]{10,})"/]),
    ));

    const rawPrice = firstPositiveNumber(
      metaPrice,
      extractNumber([
        /"price"\s*:\s*"([\d.,]+)"/,
        /"price"\s*:\s*([\d.]+)/,
        /"price_max"\s*:\s*(\d+)/,
        /"price_min"\s*:\s*(\d+)/,
        /"priceMin"\s*:\s*(\d+)/,
        /"priceMax"\s*:\s*(\d+)/,
        /"price_info"\s*:\s*\{[\s\S]{0,180}?"price"\s*:\s*(\d+)/,
      ]),
      toNumber(extract([/R\$\s*([\d.,]+)/, /pre[çc]o[^\d]{0,12}([\d.,]+)/i]))
    );

    const rawOriginalPrice = firstPositiveNumber(
      extractNumber([
        /"price_before_discount"\s*:\s*"([\d.,]+)"/,
        /"price_before_discount"\s*:\s*(\d+)/,
        /"price_before_discount_min"\s*:\s*(\d+)/,
        /"price_min_before_discount"\s*:\s*(\d+)/,
        /"original_price"\s*:\s*"([\d.,]+)"/,
        /"original_price"\s*:\s*(\d+)/,
      ]),
      toNumber(getMetaContent(html, 'product:original_price:amount'))
    );

    const fallbackObject = {
      shopid: Number(shopid),
      itemid: Number(itemid),
      name: title,
      image: firstNonEmptyString(
        metaImage,
        extract([/"image"\s*:\s*"([^"]+)"/]),
      ),
      price: rawPrice,
      original_price: rawOriginalPrice,
      currency: firstNonEmptyString(
        metaCurrency,
        extract([/"currency"\s*:\s*"([A-Z]{3})"/]),
        'BRL',
      ),
      historical_sold: firstPositiveNumber(
        soldFromDescription,
        extractNumber([/"historical_sold"\s*:\s*(\d+)/, /"sold"\s*:\s*(\d+)/, /"sold_count"\s*:\s*(\d+)/]),
      ),
      liked_count: extractNumber([/"liked_count"\s*:\s*(\d+)/, /"liked"\s*:\s*(\d+)/]),
      cmt_count: extractNumber([/"cmt_count"\s*:\s*(\d+)/, /"review_count"\s*:\s*(\d+)/]),
      rating_star: extractNumber([/"rating_star"\s*:\s*([\d.]+)/, /"rating_average"\s*:\s*([\d.]+)/, /"rating"\s*:\s*([\d.]+)/]),
      shop_name: extract([/"shop_name"\s*:\s*"([^"]+)"/, /"name"\s*:\s*"([^"]+)"\s*,\s*"shopid"/]),
      shop_location: extract([/"shop_location"\s*:\s*"([^"]+)"/, /"location"\s*:\s*"([^"]+)"/]),
      stock: extractNumber([/"stock"\s*:\s*(\d+)/, /"normal_stock"\s*:\s*(\d+)/, /"current_stock"\s*:\s*(\d+)/]),
      ctime: extractNumber([/"ctime"\s*:\s*(\d+)/]),
      brand: extract([/"brand"\s*:\s*"([^"]+)"/]),
      category_name: extract([/"display_name"\s*:\s*"([^"]+)"/, /"category_name"\s*:\s*"([^"]+)"/]),
      badge_icon_type: html.includes('"badge_icon_type":1') ? 1 : 0,
      is_preferred_plus_seller: html.includes('preferred_plus') || html.includes('shopee_verified'),
      is_official_shop: html.includes('official_shop') || html.includes('official-store'),
    };

    let parsed = parseProduct(fallbackObject);

    // Estimation fallback when Shopee hides exact counts but signals exist
    if (parsed.historicalSold <= 0 && parsed.ratingCount > 0) {
      parsed.historicalSold = Math.max(parsed.ratingCount, Math.round(parsed.ratingCount * 1.6));
      parsed.historical_sold = parsed.historicalSold;
    }

    if (parsed.stock <= 0 && parsed.variationsStock > 0) {
      parsed.stock = parsed.variationsStock;
      parsed.stock_available = parsed.variationsStock;
    }

    if (!hasUsefulProductData(parsed)) {
      console.log('Primary selectors returned limited data, retrying with alternative selectors');

      const alternateParsed = parseProduct({
        ...fallbackObject,
        name: sanitizeProductTitle(firstNonEmptyString(
          fallbackObject.name,
          extract([/"item_name"\s*:\s*"([^"]+)"/, /"product_title"\s*:\s*"([^"]+)"/]),
        )),
        price: firstPositiveNumber(
          fallbackObject.price,
          extractNumber([/"price_before_discount"\s*:\s*(\d+)/, /"price_info"\s*:\s*\{[\s\S]{0,220}?"price_min"\s*:\s*(\d+)/]),
        ),
        historical_sold: firstPositiveNumber(
          fallbackObject.historical_sold,
          extractNumber([/"item_sold"\s*:\s*(\d+)/, /"sold_quantity"\s*:\s*(\d+)/]),
        ),
        cmt_count: firstPositiveNumber(
          fallbackObject.cmt_count,
          extractNumber([/"rating_count"\s*:\s*(\d+)/, /"review_count"\s*:\s*(\d+)/]),
        ),
      });

      if (hasUsefulProductData(alternateParsed)) {
        parsed = alternateParsed;
      }
    }

    if (!hasUsefulProductData(parsed)) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('HTML parsing failed:', err);
    return null;
  }
}

function hasUsefulProductData(product: any): boolean {
  const title = sanitizeProductTitle(firstNonEmptyString(product?.title, product?.product_title, product?.name));
  const hasCoreSignals = toNumber(product?.price) > 0 || toNumber(product?.historicalSold) > 0 || toNumber(product?.ratingCount) > 0;
  const hasIds = toNumber(product?.shopid) > 0 && toNumber(product?.itemid) > 0;

  // We only accept product data with valid IDs + meaningful title + any commercial signal.
  return Boolean(title) && hasIds && hasCoreSignals;
}

function enrichProductData(rawProduct: any): any {
  const product = { ...rawProduct };

  product.title = sanitizeProductTitle(firstNonEmptyString(product.title, product.product_title, product.name));
  product.shopid = toNumber(product.shopid);
  product.itemid = toNumber(product.itemid);
  product.price = toNumber(product.price);
  product.originalPrice = toNumber(product.originalPrice || product.original_price);
  product.historicalSold = toNumber(product.historicalSold || product.historical_sold);
  product.ratingCount = toNumber(product.ratingCount || product.review_count);
  product.ratingAvg = toNumber(product.ratingAvg || product.rating_star);
  product.stock = toNumber(product.stock || product.stock_available);
  product.variationsStock = toNumber(product.variationsStock || product.variations_stock);
  product.currency = firstNonEmptyString(product.currency, 'BRL');
  product.sellerStatus = firstNonEmptyString(product.sellerStatus, product.seller_status, 'Normal Seller');

  if (product.price <= 0 && toNumber(product.priceMin) > 0) {
    product.price = toNumber(product.priceMin);
  }

  if (product.originalPrice <= 0) {
    product.originalPrice = product.price;
  }

  if (product.historicalSold <= 0 && product.ratingCount > 0) {
    product.historicalSold = Math.max(product.ratingCount, Math.round(product.ratingCount * 1.6));
  }

  if (product.stock <= 0 && product.variationsStock > 0) {
    product.stock = product.variationsStock;
  }

  if (product.ratingCount <= 0 && product.historicalSold > 0) {
    product.ratingCount = Math.max(1, Math.round(product.historicalSold * 0.08));
  }

  product.current_price = product.price;
  product.original_price = product.originalPrice;
  product.historical_sold = product.historicalSold;
  product.review_count = product.ratingCount;
  product.rating_star = product.ratingAvg;
  product.stock_available = product.stock;
  product.variations_stock = product.variationsStock;
  product.shop_name = product.shopName;
  product.shop_location = product.shopLocation;
  product.seller_status = product.sellerStatus;
  product.product_title = product.title;
  product.product_image = product.image;
  product.product_category = product.category;
  product.liked_count = toNumber(product.liked || product.liked_count);

  return product;
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

  if (!data || data.length === 0) return null;

  const row = data[0];
  const price = toNumber(row.preco);
  const sales = toNumber(row.vendas);
  const reviews = toNumber(row.avaliacoes);

  // Use cache only when row has valid content
  if (!row.titulo || (price <= 0 && sales <= 0 && reviews <= 0)) {
    console.log('Cached row is invalid — skipping cache');
    return null;
  }

  return enrichProductData({
    title: row.titulo,
    price,
    priceMin: price,
    priceMax: price,
    originalPrice: price,
    discount: 0,
    historicalSold: sales,
    stock: toNumber(row.estoque),
    variationsStock: 0,
    ratingCount: reviews,
    ratingAvg: toNumber(row.avaliacao_media),
    category: row.categoria || '',
    shopName: row.nome_loja || '',
    shopid: row.shopid,
    itemid: row.itemid,
    image: '',
    currency: 'BRL',
    sellerStatus: 'Normal Seller',
    _cached: true,
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
  });
}

// Get historical records for trend analysis
async function getHistoricalRecords(supabase: any, shopid: string, itemid: string) {
  const { data } = await supabase
    .from('produtos_analisados')
    .select('preco, vendas, data_coleta')
    .eq('shopid', parseInt(shopid))
    .eq('itemid', parseInt(itemid))
    .order('data_coleta', { ascending: true })
    .limit(200);
  return data || [];
}

async function saveToCache(supabase: any, rawProduct: any, score: number) {
  const product = enrichProductData(rawProduct);

  if (!hasUsefulProductData(product)) {
    console.log('Skipping cache save — invalid product data');
    return;
  }

  try {
    const dedupeCutoff = new Date(Date.now() - (20 * 60 * 1000)).toISOString();
    const { data: recentRows } = await supabase
      .from('produtos_analisados')
      .select('preco, vendas, data_coleta')
      .eq('shopid', product.shopid)
      .eq('itemid', product.itemid)
      .gte('data_coleta', dedupeCutoff)
      .order('data_coleta', { ascending: false })
      .limit(1);

    const recent = recentRows?.[0];
    if (recent && toNumber(recent.preco) === product.price && toNumber(recent.vendas) === product.historicalSold) {
      return;
    }

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

async function fetchRenderedHtmlWithHeadless(url: string): Promise<string | null> {
  const browserlessEndpoint = Deno.env.get('BROWSERLESS_RENDER_ENDPOINT');
  const browserlessToken = Deno.env.get('BROWSERLESS_TOKEN');

  // Primary: optional remote headless browser endpoint (if configured by secret)
  if (browserlessEndpoint) {
    try {
      const response = await fetch(browserlessEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(browserlessToken ? { 'Authorization': `Bearer ${browserlessToken}` } : {}),
        },
        body: JSON.stringify({ url, waitUntil: 'networkidle0', timeout: 25000 }),
      });

      if (response.ok) {
        const payload = await response.text();
        if (payload.includes('<html') || payload.includes('itemid')) return payload;
      }
    } catch (error) {
      console.log('Configured headless endpoint failed:', error);
    }
  }

  // Secondary: browser-emulated HTML request + script payload extraction
  try {
    const response = await fetchWithRetry(url, {
      ...getHeaders('/'),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
    }, 1);

    if (!response.ok) return null;
    const html = await response.text();
    return html.length > 1000 ? html : null;
  } catch (error) {
    console.log('Headless-like render fallback failed:', error);
    return null;
  }
}

async function fetchProductDetails(shopid: string, itemid: string, sourceUrl?: string) {
  const canonicalProductUrl = `${SHOPEE_BASE}/product-i.${shopid}.${itemid}`;
  const alternateProductUrl = `${SHOPEE_BASE}/-i.${shopid}.${itemid}`;
  const incomingUrl = typeof sourceUrl === 'string' && sourceUrl.includes('shopee') ? sourceUrl : '';

  const candidateUrls = [incomingUrl, canonicalProductUrl, alternateProductUrl].filter(Boolean);
  const visitedUrls = new Set<string>();

  for (const targetUrl of candidateUrls) {
    if (visitedUrls.has(targetUrl)) continue;
    visitedUrls.add(targetUrl);

    try {
      console.log(`Trying HTML scrape: ${targetUrl}`);
      const html = await fetchHtmlWithSingleRetry(targetUrl, `/product-i.${shopid}.${itemid}`);
      if (!html) continue;

      console.log(`Fetched HTML size: ${html.length} chars`);
      const parsed = parseProductFromHtml(html, shopid, itemid);
      const result = parsed ? enrichProductData(parsed) : null;

      if (result && hasUsefulProductData(result)) {
        console.log(`Success: HTML scrape — price=${result.price}, sold=${result.historicalSold}, rating=${result.ratingCount}`);
        return result;
      }

      console.log('HTML scrape returned partial data; trying next source');
    } catch (err) {
      console.log('HTML scrape failed:', err);
    }
  }

  try {
    console.log('Trying headless render fallback (JS rendered)');
    const renderedHtml = await fetchRenderedHtmlWithHeadless(incomingUrl || canonicalProductUrl);
    if (renderedHtml) {
      const parsed = parseProductFromHtml(renderedHtml, shopid, itemid);
      const result = parsed ? enrichProductData(parsed) : null;
      if (result && hasUsefulProductData(result)) {
        console.log(`Success: headless render fallback — price=${result.price}, sold=${result.historicalSold}, rating=${result.ratingCount}`);
        return result;
      }
    }
  } catch (err) {
    console.log('Headless render fallback failed:', err);
  }

  return null;
}

async function fetchRelatedProducts(shopid: string, itemid: string, limit = 30) {
  try {
    const url = `${SHOPEE_BASE}/api/v4/recommend/recommend?bundle=product_page_related&itemid=${itemid}&shopid=${shopid}&limit=${limit}&offset=0`;
    const response = await fetchWithRetry(url, getHeaders(`/product-i.${shopid}.${itemid}`), 2);
    if (!response.ok) return [];
    const json = await response.json();
    const items = json?.data?.sections?.flatMap((section: any) => section?.data?.item || [])
      || json?.data?.item
      || json?.items
      || [];

    return items
      .map((entry: any) => enrichProductData(parseProduct(entry?.item || entry?.item_basic || entry)))
      .filter((product: any) => hasUsefulProductData(product));
  } catch (error) {
    console.log('Related products endpoint failed:', error);
    return [];
  }
}

async function searchProducts(keyword: string, limit = 50, context?: { shopid?: string; itemid?: string }) {
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
        const items = json?.items || json?.data?.items || [];
        const parsed = items
          .map((entry: any) => enrichProductData(parseProduct(entry?.item_basic || entry?.item || entry)))
          .filter((product: any) => hasUsefulProductData(product));

        if (parsed.length > 0) return parsed.slice(0, limit);
      }
    } catch (err) {
      console.log(`${endpoint.label} failed:`, err);
    }

    await delay(500 + Math.random() * 500);
  }

  try {
    console.log('Trying HTML search scrape');
    const searchUrl = `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(keyword)}`;
    const response = await fetchWithRetry(
      searchUrl,
      { ...getHeaders('/'), 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
    );

    if (response.ok) {
      const html = await response.text();
      const jsonCandidates = [
        html.match(/"listItems"\s*:\s*(\[[\s\S]*?\])\s*[,}]/)?.[1],
        html.match(/"items"\s*:\s*(\[[\s\S]*?\])\s*[,}]/)?.[1],
      ].filter(Boolean);

      for (const candidate of jsonCandidates) {
        const parsed = tryParseJson(candidate as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const products = parsed
            .map((item: any) => enrichProductData(parseProduct(item?.item_basic || item?.item || item)))
            .filter((product: any) => hasUsefulProductData(product));

          if (products.length > 0) return products.slice(0, limit);
        }
      }
    }
  } catch (err) {
    console.log('HTML search scrape failed:', err);
  }

  // Final fallback: related products API using the current product context
  if (context?.shopid && context?.itemid) {
    const related = await fetchRelatedProducts(context.shopid, context.itemid, limit);
    if (related.length > 0) return related;
  }

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

function estimateSalesMetrics(product: any, history: any[] = []) {
  const now = Date.now();
  const sortedHistory = [...history]
    .map((row: any) => ({
      sold: toNumber(row?.vendas ?? row?.sold),
      at: new Date(row?.data_coleta ?? row?.date).getTime(),
    }))
    .filter((row: any) => row.at > 0)
    .sort((a: any, b: any) => a.at - b.at);

  const listingAgeDays = product.ctime && product.ctime > 0
    ? Math.max(1, Math.floor((Date.now() / 1000 - product.ctime) / 86400))
    : (sortedHistory.length > 0 ? Math.max(1, Math.floor((now - sortedHistory[0].at) / 86400000)) : Math.max(30, Math.round(product.historicalSold / 3)));

  const latestSold = Math.max(product.historicalSold || 0, sortedHistory.at(-1)?.sold || 0);

  const pointForDays = (days: number) => {
    const target = now - (days * 86400000);
    const candidates = sortedHistory.filter((row: any) => row.at <= target);
    return candidates.length > 0 ? candidates[candidates.length - 1] : sortedHistory[0];
  };

  const point7 = pointForDays(7);
  const point30 = pointForDays(30);

  const salesLast7 = point7 ? Math.max(0, latestSold - point7.sold) : 0;
  const salesLast30 = point30 ? Math.max(0, latestSold - point30.sold) : 0;
  const fallbackPerDay = listingAgeDays > 0 ? latestSold / listingAgeDays : 0;
  const salesPerDay = Math.round(((salesLast30 > 0 ? salesLast30 / 30 : fallbackPerDay) * 100)) / 100;

  return {
    listingAgeDays,
    salesPerDay,
    salesLast7: salesLast7 > 0 ? salesLast7 : Math.round(salesPerDay * 7),
    salesLast30: salesLast30 > 0 ? salesLast30 : Math.round(salesPerDay * 30),
  };
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
  if (salesMetrics.salesPerDay >= 10) score += 30;
  else if (salesMetrics.salesPerDay >= 3) score += 20;
  else if (salesMetrics.salesPerDay >= 1) score += 10;
  if (product.historicalSold >= 5000) score += 25;
  else if (product.historicalSold >= 1000) score += 20;
  else if (product.historicalSold >= 100) score += 10;
  if (product.ratingAvg >= 4.5 && product.ratingCount >= 50) score += 20;
  else if (product.ratingAvg >= 4.0) score += 10;
  if (product.viewCount > 0) score += 10;
  if (product.liked > 100) score += 15;
  else if (product.liked > 10) score += 5;
  return Math.min(score, 100);
}

function getDemandLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function getCompetitionLevel(count: number): 'high' | 'medium' | 'low' {
  if (count >= 35) return 'high';
  if (count >= 15) return 'medium';
  return 'low';
}

function isValidIdSegment(value: string): boolean {
  return /^\d{5,20}$/.test(value) && Number(value) > 0;
}

function isValidShopeeProductUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  try {
    const parsed = new URL(rawUrl.trim());
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.includes('shopee')) return false;

    const hasSlugIds = /-i\.\d+\.\d+(?:$|[/?#&._-])/i.test(`${parsed.pathname}${parsed.search}`);
    const hasQueryIds = Boolean(
      (parsed.searchParams.get('shopid') || parsed.searchParams.get('shop_id'))
      && (parsed.searchParams.get('itemid') || parsed.searchParams.get('item_id'))
    );

    return hasSlugIds || hasQueryIds;
  } catch {
    return false;
  }
}

function extractShopeeIds(rawUrl: string): { shopid: string; itemid: string } | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const candidates = [rawUrl.trim()];
  try {
    const parsed = new URL(rawUrl.trim());
    candidates.push(parsed.pathname);
    candidates.push(`${parsed.pathname}${parsed.search}`);

    const qShopid = parsed.searchParams.get('shopid') || parsed.searchParams.get('shop_id');
    const qItemid = parsed.searchParams.get('itemid') || parsed.searchParams.get('item_id');
    if (qShopid && qItemid && isValidIdSegment(qShopid) && isValidIdSegment(qItemid)) {
      return { shopid: qShopid, itemid: qItemid };
    }
  } catch {
    // Ignore URL parse errors and continue with regex extraction.
  }

  const patterns = [
    /-i\.(\d+)\.(\d+)(?:$|[/?#&._-])/i,
    /(?:^|[^\w])i\.(\d+)\.(\d+)(?:$|[/?#&._-])/i,
    /shopid=(\d+).*itemid=(\d+)/i,
    /itemid=(\d+).*shopid=(\d+)/i,
  ];

  for (const candidate of candidates) {
    for (const pattern of patterns) {
      const match = candidate.match(pattern);
      if (!match) continue;

      const shopid = pattern.source.startsWith('itemid=') ? match[2] : match[1];
      const itemid = pattern.source.startsWith('itemid=') ? match[1] : match[2];

      if (isValidIdSegment(shopid) && isValidIdSegment(itemid)) {
        return { shopid, itemid };
      }
    }
  }

  return null;
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
      if (!isValidShopeeProductUrl(url || '')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid Shopee URL. Expected format: https://shopee.com.br/...-i.<shopid>.<itemid>' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ids = extractShopeeIds(url || '');
      if (!ids) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not extract shopid and itemid from this Shopee URL.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const extractedShopid = ids.shopid;
      const extractedItemid = ids.itemid;

      if (!isValidIdSegment(extractedShopid) || !isValidIdSegment(extractedItemid)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not extract valid shopid and itemid from this Shopee URL.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cached = await getCachedProduct(supabase, extractedShopid, extractedItemid);
      const liveProduct = cached ? null : await fetchProductDetails(extractedShopid, extractedItemid, url);
      let product = cached || liveProduct;
      const fromCache = Boolean(cached);

      if (!hasUsefulProductData(product)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to extract Shopee product data',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const keywords = product.title.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5).join(' ');
      await delay(500 + Math.random() * 500);
      let competitors = await searchProducts(keywords, 50, { shopid: extractedShopid, itemid: extractedItemid });
      competitors = competitors.filter((entry: any) => !(entry.shopid === product.shopid && entry.itemid === product.itemid));

      let metrics = calculateMarketMetrics(competitors, product.price);
      if (metrics.competitors === 0 && product.price > 0) {
        metrics = {
          avgPrice: product.price,
          minPrice: product.price,
          maxPrice: product.price,
          avgSales: product.historicalSold,
          avgRating: product.ratingAvg,
          competitors: 0,
          estimatedRevenue: Math.round(product.price * Math.max(1, product.historicalSold)),
          opportunityScore: calculateOpportunityScore(product.historicalSold, 1, product.ratingAvg, 1),
        };
      }

      const performanceScore = calculatePerformanceScore(product, competitors);
      const classification = classifyProduct(performanceScore);

      await saveToCache(supabase, product, performanceScore);
      const history = await getHistoricalRecords(supabase, extractedShopid, extractedItemid);
      const salesMetrics = estimateSalesMetrics(product, history);

      const estimatedRevenue = Math.round(product.price * product.historicalSold);
      const monthlyRevenue = Math.round(product.price * salesMetrics.salesLast30);
      const demandScore = calculateMarketDemandScore(product, metrics, salesMetrics);

      const rd = product.ratingDetail || [];
      const total = rd[0] || product.ratingCount || 1;
      const sentiment = {
        positive: rd[5] ? Math.round(((rd[5] + (rd[4] || 0)) / total) * 100) : (product.ratingAvg >= 4 ? 80 : 50),
        neutral: rd[3] ? Math.round((rd[3] / total) * 100) : 15,
        negative: rd[1] ? Math.round(((rd[1] + (rd[2] || 0)) / total) * 100) : (product.ratingAvg < 3 ? 40 : 5),
      };

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
              status: product.sellerStatus,
              isPreferred: product.isPreferredSeller,
            },
            revenue: {
              totalEstimated: estimatedRevenue,
              monthlyEstimated: monthlyRevenue,
              dailyEstimated: Math.round(product.price * salesMetrics.salesPerDay),
            },
            demandScore,
            insights: {
              salesVelocity: salesMetrics.salesPerDay,
              demandLevel: getDemandLevel(demandScore),
              competitionLevel: getCompetitionLevel(metrics.competitors),
              number_of_competing_listings: metrics.competitors,
              average_market_price: Math.round(metrics.avgPrice * 100) / 100,
            },
            history: history.map((h: any) => ({
              date: h.data_coleta,
              price: toNumber(h.preco),
              sold: toNumber(h.vendas),
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
      if (!product || !hasUsefulProductData(product)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unable to extract complete Shopee product intelligence from this URL right now. Please retry in a few minutes.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
