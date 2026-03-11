const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOPEE_BASE = 'https://shopee.com.br';

function getHeaders(refererPath = '/') {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': `${SHOPEE_BASE}${refererPath}`,
    'Origin': SHOPEE_BASE,
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Shopee-Language': 'pt-BR',
    'Cookie': 'SPC_F=; SPC_EC=-; SPC_U=-;',
  };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function convertPrice(raw: number): number {
  return raw / 100000;
}

function calculateOpportunityScore(
  avgSales: number,
  competitors: number,
  avgRating: number,
  priceVsAvg: number
): number {
  const demandScore = Math.min(avgSales / 50, 100);
  const competitionScore = Math.max(100 - (competitors * 2), 0);
  const ratingScore = (avgRating / 5) * 100;
  const priceScore = priceVsAvg <= 1 ? (2 - priceVsAvg) * 100 : Math.max(100 - (priceVsAvg - 1) * 200, 0);

  const score = Math.round(
    demandScore * 0.4 +
    competitionScore * 0.3 +
    ratingScore * 0.2 +
    Math.min(priceScore, 100) * 0.1
  );

  return Math.min(Math.max(score, 0), 100);
}

async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) return response;
      
      // If blocked, wait and retry with slightly different headers
      if (response.status === 403 && i < retries) {
        console.log(`Got 403, retrying (${i + 1}/${retries})...`);
        await delay(1000 + Math.random() * 2000);
        continue;
      }
      
      // Return even non-ok response on last attempt
      return response;
    } catch (err) {
      if (i === retries) throw err;
      await delay(1000);
    }
  }
  throw new Error('Max retries exceeded');
}

function parseProduct(item: any) {
  return {
    title: item.name || '',
    price: convertPrice(item.price || item.price_max || 0),
    priceMin: convertPrice(item.price_min || item.price || 0),
    priceMax: convertPrice(item.price_max || item.price || 0),
    historicalSold: item.historical_sold || item.sold || 0,
    stock: item.stock || 0,
    ratingCount: item.cmt_count || item.item_rating?.rating_count?.[0] || 0,
    ratingAvg: item.item_rating?.rating_star || 0,
    category: item.categories?.[item.categories.length - 1]?.display_name || item.catid?.toString() || '',
    shopName: item.shop_location || '',
    shopid: item.shopid,
    itemid: item.itemid,
    image: item.image ? `https://down-br.img.susercontent.com/file/${item.image}` : '',
  };
}

async function fetchProductDetails(shopid: string, itemid: string) {
  // Try v4 API first
  const v4Url = `${SHOPEE_BASE}/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;
  console.log('Fetching product (v4):', v4Url);

  let response = await fetchWithRetry(v4Url, getHeaders(`/product-i.${shopid}.${itemid}`));
  
  if (!response.ok) {
    // Fallback: try v2 API
    const v2Url = `${SHOPEE_BASE}/api/v2/item/get?itemid=${itemid}&shopid=${shopid}`;
    console.log('Fallback to v2:', v2Url);
    response = await fetchWithRetry(v2Url, getHeaders(`/product-i.${shopid}.${itemid}`));
  }

  if (!response.ok) {
    throw new Error(`Shopee API error: ${response.status}. A Shopee pode estar bloqueando requisições temporariamente. Tente novamente em alguns minutos.`);
  }

  const json = await response.json();
  const item = json.data || json.item;

  if (!item) {
    throw new Error('Produto não encontrado');
  }

  return parseProduct(item);
}

async function searchProducts(keyword: string, limit = 50) {
  const params = new URLSearchParams({
    by: 'relevancy',
    keyword,
    limit: String(limit),
    newest: '0',
    order: 'desc',
    page_type: 'search',
    scenario: 'PAGE_GLOBAL_SEARCH',
    version: '2',
  });

  const url = `${SHOPEE_BASE}/api/v4/search/search_items?${params}`;
  console.log('Searching products:', url);

  const response = await fetchWithRetry(url, getHeaders(`/search?keyword=${encodeURIComponent(keyword)}`));
  
  if (!response.ok) {
    // Try alternative search endpoint
    const altUrl = `${SHOPEE_BASE}/api/v2/search_items/?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search`;
    console.log('Fallback search (v2):', altUrl);
    const altResponse = await fetchWithRetry(altUrl, getHeaders(`/search?keyword=${encodeURIComponent(keyword)}`));
    
    if (!altResponse.ok) {
      console.error('Search failed with status:', altResponse.status);
      return [];
    }
    
    const altJson = await altResponse.json();
    const altItems = altJson.items || altJson.data?.items || [];
    return altItems.map((entry: any) => {
      const item = entry.item_basic || entry;
      return parseProduct(item);
    });
  }

  const json = await response.json();
  const items = json.items || json.data?.items || [];

  return items.map((entry: any) => {
    const item = entry.item_basic || entry;
    return parseProduct(item);
  });
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, url, keyword, shopid, itemid, limit, filters } = await req.json();

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

      const product = await fetchProductDetails(extractedShopid, extractedItemid);

      const keywords = product.title
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 4)
        .join(' ');

      await delay(800 + Math.random() * 700);

      const competitors = await searchProducts(keywords, 50);
      const metrics = calculateMarketMetrics(competitors, product.price);

      return new Response(
        JSON.stringify({ success: true, product, competitors: competitors.slice(0, 20), metrics }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

      return new Response(
        JSON.stringify({ success: true, products: withScores, metrics, total: products.length, filtered: filtered.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'product_details') {
      if (!shopid || !itemid) {
        return new Response(
          JSON.stringify({ success: false, error: 'shopid e itemid são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const product = await fetchProductDetails(shopid, itemid);

      return new Response(
        JSON.stringify({ success: true, product }),
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
