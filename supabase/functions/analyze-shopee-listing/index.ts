const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function respond(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getHeaders(shopId: string, itemId: string): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': `https://shopee.com.br/product-i.${shopId}.${itemId}`,
    'X-Requested-With': 'XMLHttpRequest',
    'af-ac-enc-dat': 'aa==',
    'x-api-source': 'pc',
    'x-shopee-language': 'pt-BR',
    'cookie': 'SPC_EC=-; SPC_F=guest_' + Math.random().toString(36).slice(2) + '; REC_T_ID=guest',
  };
}

async function fetchWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Strategy 1: Direct Shopee API v4
async function tryDirectApi(shopId: string, itemId: string, headers: Record<string, string>) {
  console.log('[S1] Direct API...');
  const res = await fetchWithTimeout(
    `https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`,
    headers
  );
  const text = await res.text();
  console.log('[S1] Status:', res.status, 'Body length:', text.length, 'Preview:', text.slice(0, 300));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = JSON.parse(text);
  const item = json?.data?.item || json?.item;
  if (!item?.name && !item?.title) throw new Error('Empty');
  return { item, source: 'api_v4' };
}

// Strategy 2: Shopee v2 API (sometimes less restricted)
async function tryV2Api(shopId: string, itemId: string, headers: Record<string, string>) {
  console.log('[S2] V2 API...');
  const res = await fetchWithTimeout(
    `https://shopee.com.br/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`,
    { ...headers, 'x-api-source': 'pc' }
  );
  const text = await res.text();
  console.log('[S2] Status:', res.status, 'Body length:', text.length, 'Preview:', text.slice(0, 300));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = JSON.parse(text);
  const item = json?.item || json?.data?.item;
  if (!item?.name && !item?.title) throw new Error('Empty');
  return { item, source: 'api_v2' };
}

// Strategy 3: HTML page scraping with comprehensive pattern matching
async function tryHtmlScraping(shopId: string, itemId: string) {
  console.log('[S3] HTML scraping...');
  const pageUrl = `https://shopee.com.br/product-i.${shopId}.${itemId}`;
  const res = await fetchWithTimeout(pageUrl, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  });
  const html = await res.text();
  console.log('[S3] HTML length:', html.length);

  // Log all script tags and meta tags for debugging
  const scriptMatches = html.match(/<script[^>]*>[^<]{100,}<\/script>/g) || [];
  console.log('[S3] Found', scriptMatches.length, 'script tags with content');
  for (let i = 0; i < Math.min(scriptMatches.length, 5); i++) {
    console.log(`[S3] Script ${i} preview:`, scriptMatches[i].slice(0, 200));
  }

  // Check for meta tags
  const metaTags = html.match(/<meta[^>]+>/g) || [];
  const relevantMeta = metaTags.filter(t => 
    t.includes('og:') || t.includes('product:') || t.includes('description') || t.includes('title')
  );
  console.log('[S3] Relevant meta tags:', relevantMeta.join('\n'));

  // Pattern 1: __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s);
  if (nextDataMatch) {
    console.log('[S3] Found __NEXT_DATA__, length:', nextDataMatch[1].length);
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const item = nextData?.props?.pageProps?.item || 
                   nextData?.props?.pageProps?.initialState?.item ||
                   nextData?.props?.initialData?.item;
      if (item?.name || item?.title) return { item, source: 'next_data' };
    } catch(e) { console.log('[S3] __NEXT_DATA__ parse error:', e.message); }
  }

  // Pattern 2: __INITIAL_STATE__
  const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(.+?);?\s*<\/script>/s);
  if (initialStateMatch) {
    console.log('[S3] Found __INITIAL_STATE__');
    try {
      const state = JSON.parse(initialStateMatch[1]);
      const item = state?.item?.item || state?.itemDetail?.item;
      if (item?.name) return { item, source: 'initial_state' };
    } catch(e) { console.log('[S3] parse error:', e.message); }
  }

  // Pattern 3: JSON-LD structured data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);
  if (jsonLdMatch) {
    console.log('[S3] Found JSON-LD');
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      if (ld?.name || ld?.['@type'] === 'Product') {
        return {
          item: {
            name: ld.name,
            price: ld.offers?.price ? parseFloat(ld.offers.price) : 0,
            image: ld.image,
            description: ld.description,
            item_rating: ld.aggregateRating ? {
              rating_star: parseFloat(ld.aggregateRating.ratingValue),
              rating_count: [0, 0, 0, 0, 0, parseInt(ld.aggregateRating.ratingCount) || 0],
            } : null,
            _directPrice: true,
          },
          source: 'json_ld',
        };
      }
    } catch(e) { console.log('[S3] JSON-LD parse error:', e.message); }
  }

  // Pattern 4: og:title meta as last resort
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1] ||
                  html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/)?.[1];
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)?.[1] ||
                  html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/)?.[1];
  const priceMatch = html.match(/product:price:amount"\s+content="([^"]+)"/) ||
                     html.match(/"price"\s*:\s*"?(\d+[\d.]*)"?/);

  if (ogTitle && !ogTitle.includes('Shopee Brasil') && ogTitle.length > 5) {
    console.log('[S3] Using og:title fallback:', ogTitle);
    return {
      item: {
        name: ogTitle,
        image: ogImage || null,
        price: priceMatch ? parseFloat(priceMatch[1]) : 0,
        _partial: true,
        _directPrice: true,
      },
      source: 'meta_tags',
    };
  }

  throw new Error('No data found in HTML');
}

// Strategy 4: allorigins proxy
async function tryProxy(shopId: string, itemId: string) {
  console.log('[S4] Proxy...');
  const target = encodeURIComponent(`https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`);
  const res = await fetchWithTimeout(
    `https://api.allorigins.win/raw?url=${target}`,
    { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    10000
  );
  const text = await res.text();
  console.log('[S4] Status:', res.status, 'Preview:', text.slice(0, 300));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = JSON.parse(text);
  const item = json?.data?.item || json?.item;
  if (!item?.name && !item?.title) throw new Error('Empty');
  return { item, source: 'proxy' };
}

async function fetchShopDetails(shopId: string, headers: Record<string, string>) {
  try {
    const res = await fetchWithTimeout(
      `https://shopee.com.br/api/v4/shop/get_shop_detail?shopid=${shopId}`,
      headers, 8000
    );
    if (!res.ok) { await res.text(); return {}; }
    return (await res.json())?.data || {};
  } catch { return {}; }
}

function buildResult(item: any, shop: any, source: string) {
  const isPartial = item._partial === true;
  const isDirectPrice = item._directPrice === true;

  let preco = 0;
  if (item.price) {
    preco = !isDirectPrice && item.price > 1000 ? item.price / 100000 : item.price;
  }
  const precoOriginal = item.price_before_discount
    ? (item.price_before_discount / 100000) : null;

  const totalVendido = item.historical_sold ?? item.sold ?? 0;
  const createdAt = item.ctime;
  const diasAtivo = createdAt
    ? Math.max(1, Math.floor((Date.now() / 1000 - createdAt) / 86400)) : 1;
  const vendasPorDia = parseFloat((totalVendido / diasAtivo).toFixed(1));

  const isOficial = shop.is_official_shop || false;
  const isPreferido = shop.is_preferred_plus_seller || shop.shopee_verified || false;

  const distEstrelas = item.item_rating?.rating_count || [0, 0, 0, 0, 0, 0];
  const totalAvaliacoes = distEstrelas.length > 5
    ? distEstrelas[0]
    : distEstrelas.reduce((a: number, b: number) => a + b, 0);
  const estrelasDist = distEstrelas.length > 5
    ? [distEstrelas[5], distEstrelas[4], distEstrelas[3], distEstrelas[2], distEstrelas[1]]
    : [...distEstrelas].reverse();

  const imageId = item.image || (Array.isArray(item.images) && item.images[0]) || '';
  const imagem = imageId
    ? (imageId.startsWith('http') ? imageId : `https://down-br.img.susercontent.com/file/${imageId}`)
    : null;

  return {
    sucesso: true,
    parcial: isPartial,
    fonte: source,
    produto: {
      nome: item.name || item.title || 'Nome não disponível',
      preco: preco.toFixed(2),
      precoOriginal: precoOriginal?.toFixed(2) || null,
      desconto: precoOriginal && precoOriginal > preco
        ? Math.round((1 - preco / precoOriginal) * 100) : null,
      estoque: item.stock ?? null,
      totalVendido,
      vendasPorDia,
      faturamentoTotal: (preco * totalVendido).toFixed(2),
      faturamentoMensal: (preco * vendasPorDia * 30).toFixed(2),
      avaliacao: item.item_rating?.rating_star?.toFixed(1) || null,
      totalAvaliacoes,
      distribuicaoEstrelas: estrelasDist,
      dataCriacao: createdAt ? new Date(createdAt * 1000).toLocaleDateString('pt-BR') : null,
      diasAtivo,
      categoria: item.categories?.at(-1)?.display_name || null,
      imagem,
    },
    vendedor: {
      nome: shop.name || 'Loja não identificada',
      localizacao: shop.place || shop.country || null,
      status: isOficial ? 'Loja Oficial' : isPreferido ? 'Vendedor Preferido' : 'Vendedor Padrão',
      isOficial,
      isPreferido,
      taxaResposta: shop.response_rate ?? null,
      tempoResposta: shop.response_time ?? null,
      dataIngresso: shop.ctime ? new Date(shop.ctime * 1000).toLocaleDateString('pt-BR') : null,
      totalProdutos: shop.item_count ?? null,
      totalAvaliacoes: shop.rating_count?.[0] ?? null,
      seguidores: shop.follower_count ?? null,
      notaLoja: shop.rating_star?.toFixed(1) || null,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || !url.includes('shopee.com.br')) {
      return respond({ sucesso: false, erro: 'INVALID_URL', mensagem: 'Cole um link válido da Shopee Brasil.' }, 400);
    }

    const match = url.match(/i\.(\d+)\.(\d+)/);
    if (!match) {
      return respond({ sucesso: false, erro: 'IDS_NOT_FOUND', mensagem: 'Não foi possível identificar o anúncio neste link.' }, 400);
    }

    const shopId = match[1];
    const itemId = match[2];
    const headers = getHeaders(shopId, itemId);

    const strategies = [
      () => tryDirectApi(shopId, itemId, headers),
      () => tryV2Api(shopId, itemId, headers),
      () => tryHtmlScraping(shopId, itemId),
      () => tryProxy(shopId, itemId),
    ];

    let result: { item: any; source: string } | null = null;
    const errors: string[] = [];

    for (const strategy of strategies) {
      try {
        result = await strategy();
        if (result) break;
      } catch (e: any) {
        errors.push(e.message);
        console.log('[Main] Strategy failed:', e.message);
      }
    }

    if (!result) {
      console.error('[Main] All failed:', errors);
      return respond({
        sucesso: false,
        erro: 'BLOQUEADO',
        mensagem: 'A Shopee bloqueou esta consulta. Aguarde alguns minutos e tente novamente.',
        detalhes: errors,
      });
    }

    const shop = await fetchShopDetails(shopId, headers);
    const resultado = buildResult(result.item, shop, result.source);

    // Save (non-blocking)
    try {
      const sbUrl = Deno.env.get('SUPABASE_URL')!;
      const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      await fetch(`${sbUrl}/rest/v1/shopee_analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ url, shop_id: shopId, item_id: itemId, data: resultado }),
      });
    } catch { /* non-fatal */ }

    return respond(resultado);
  } catch (e: any) {
    console.error('Error:', e);
    return respond({ sucesso: false, erro: 'INTERNAL', mensagem: 'Erro ao buscar dados. Verifique o link e tente novamente.' }, 500);
  }
});
