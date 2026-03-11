const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOPEE_BASE = 'https://shopee.com.br';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://shopee.com.br/',
};

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
  // Demand score (40%) - higher sales = higher score
  const demandScore = Math.min(avgSales / 50, 100);

  // Competition score (30%) - fewer competitors = higher score
  const competitionScore = Math.max(100 - (competitors * 2), 0);

  // Rating score (20%) - higher avg rating = higher score
  const ratingScore = (avgRating / 5) * 100;

  // Price competitiveness (10%) - lower price vs average = higher score
  const priceScore = priceVsAvg <= 1 ? (2 - priceVsAvg) * 100 : Math.max(100 - (priceVsAvg - 1) * 200, 0);

  const score = Math.round(
    demandScore * 0.4 +
    competitionScore * 0.3 +
    ratingScore * 0.2 +
    Math.min(priceScore, 100) * 0.1
  );

  return Math.min(Math.max(score, 0), 100);
}

async function fetchProductDetails(shopid: string, itemid: string) {
  const url = `${SHOPEE_BASE}/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`;
  console.log('Fetching product:', url);

  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`Shopee API error: ${response.status}`);
  }

  const json = await response.json();
  const item = json.data;

  if (!item) {
    throw new Error('Product not found');
  }

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

async function searchProducts(keyword: string, limit = 50) {
  const url = `${SHOPEE_BASE}/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`;
  console.log('Searching products:', url);

  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`Shopee search API error: ${response.status}`);
  }

  const json = await response.json();
  const items = json.items || json.data?.items || [];

  return items.map((entry: any) => {
    const item = entry.item_basic || entry;
    return {
      title: item.name || '',
      price: convertPrice(item.price || item.price_max || 0),
      priceMin: convertPrice(item.price_min || item.price || 0),
      priceMax: convertPrice(item.price_max || item.price || 0),
      historicalSold: item.historical_sold || item.sold || 0,
      stock: item.stock || 0,
      ratingCount: item.cmt_count || item.item_rating?.rating_count?.[0] || 0,
      ratingAvg: item.item_rating?.rating_star || 0,
      shopid: item.shopid,
      itemid: item.itemid,
      image: item.image ? `https://down-br.img.susercontent.com/file/${item.image}` : '',
    };
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
      // Extract shopid and itemid from URL
      const match = url?.match(/i\.(\d+)\.(\d+)/);
      if (!match) {
        return new Response(
          JSON.stringify({ success: false, error: 'Link inválido. Use um link de produto da Shopee (ex: https://shopee.com.br/produto-i.123.456)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const extractedShopid = match[1];
      const extractedItemid = match[2];

      // Fetch product details
      const product = await fetchProductDetails(extractedShopid, extractedItemid);

      // Extract keywords from title for competitor search
      const keywords = product.title
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 4)
        .join(' ');

      await delay(500); // Rate limiting

      // Search for similar products
      const competitors = await searchProducts(keywords, 50);

      // Calculate market metrics
      const metrics = calculateMarketMetrics(competitors, product.price);

      return new Response(
        JSON.stringify({
          success: true,
          product,
          competitors: competitors.slice(0, 20),
          metrics,
        }),
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

      // Apply filters
      let filtered = products;
      if (filters) {
        if (filters.minPrice) filtered = filtered.filter((p: any) => p.price >= filters.minPrice);
        if (filters.maxPrice) filtered = filtered.filter((p: any) => p.price <= filters.maxPrice);
        if (filters.minSales) filtered = filtered.filter((p: any) => p.historicalSold >= filters.minSales);
        if (filters.minRating) filtered = filtered.filter((p: any) => p.ratingAvg >= filters.minRating);
      }

      const metrics = calculateMarketMetrics(filtered);

      // Calculate individual scores
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
        JSON.stringify({
          success: true,
          products: withScores,
          metrics,
          total: products.length,
          filtered: filtered.length,
        }),
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
