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
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': `https://shopee.com.br/product-i.${shopId}.${itemId}`,
    'X-Requested-With': 'XMLHttpRequest',
    'af-ac-enc-dat': 'aa==',
    'x-api-source': 'pc',
    'x-shopee-language': 'pt-BR',
    'cookie': 'SPC_EC=-; SPC_F=guest_' + Math.random().toString(36).slice(2) + '; REC_T_ID=guest; _QPWSDCXHZQA=auto',
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

// Strategy 1: Direct Shopee API
async function tryDirectApi(shopId: string, itemId: string, headers: Record<string, string>) {
  console.log('[Strategy 1] Trying direct API...');
  const productUrl = `https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
  const res = await fetchWithTimeout(productUrl, headers);
  if (!res.ok) {
    await res.text(); // consume body
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  const item = json?.data?.item || json?.item;
  if (!item?.name && !item?.title) throw new Error('Empty item data');
  console.log('[Strategy 1] Success - got item:', item.name || item.title);
  return item;
}

// Strategy 2: Fetch product page HTML & extract embedded JSON data
async function tryHtmlScraping(shopId: string, itemId: string) {
  console.log('[Strategy 2] Trying HTML scraping...');
  const pageUrl = `https://shopee.com.br/product-i.${shopId}.${itemId}`;
  const htmlHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Cache-Control': 'no-cache',
  };
  const res = await fetchWithTimeout(pageUrl, htmlHeaders);
  const html = await res.text();
  console.log('[Strategy 2] Got HTML, length:', html.length);

  // Try to extract from script tags with JSON data
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*({.+?})\s*;?\s*<\/script>/s,
    /window\.__INITIAL_STATE__\s*=\s*({.+?});\s*$/m,
    /"item"\s*:\s*({[^}]*"name"\s*:\s*"[^"]+?"[^}]*})/,
    /{"item":\s*{[^]*?"name"\s*:\s*"([^"]+)"[^]*?"price"\s*:\s*(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        const item = parsed?.item || parsed?.data?.item || parsed;
        if (item?.name || item?.title) {
          console.log('[Strategy 2] Extracted from INITIAL_STATE');
          return item;
        }
      } catch { /* try next pattern */ }
    }
  }

  // Try og:title and other meta tags as minimal fallback
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1];
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)?.[1];
  const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/)?.[1];
  
  // Try to extract price from meta or structured data
  const priceMatch = html.match(/"price"\s*:\s*"?(\d+)"?/) || 
                     html.match(/product:price:amount"\s+content="([^"]+)"/);

  if (ogTitle && ogTitle !== 'Shopee Brasil') {
    console.log('[Strategy 2] Extracted from meta tags:', ogTitle);
    return {
      name: ogTitle,
      image: ogImage || null,
      description: ogDesc || null,
      price: priceMatch ? parseInt(priceMatch[1]) : 0,
      _partial: true, // flag that data is incomplete
    };
  }

  throw new Error('Could not extract data from HTML');
}

// Strategy 3: Try via public proxy / cache services
async function tryProxyApis(shopId: string, itemId: string) {
  console.log('[Strategy 3] Trying proxy APIs...');
  
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`)}`,
    `https://corsproxy.io/?${encodeURIComponent(`https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`)}`,
  ];

  for (const proxyUrl of proxyUrls) {
    try {
      const res = await fetchWithTimeout(proxyUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }, 10000);
      
      if (!res.ok) {
        await res.text();
        continue;
      }
      
      const json = await res.json();
      const item = json?.data?.item || json?.item;
      if (item?.name || item?.title) {
        console.log('[Strategy 3] Success via proxy');
        return item;
      }
    } catch (e) {
      console.log('[Strategy 3] Proxy failed:', e.message);
    }
  }
  throw new Error('All proxies failed');
}

// Fetch shop details (best-effort)
async function fetchShopDetails(shopId: string, headers: Record<string, string>) {
  try {
    const shopUrl = `https://shopee.com.br/api/v4/shop/get_shop_detail?shopid=${shopId}`;
    const res = await fetchWithTimeout(shopUrl, headers, 8000);
    if (!res.ok) { await res.text(); return {}; }
    const json = await res.json();
    return json?.data || json || {};
  } catch {
    return {};
  }
}

function buildResult(item: any, shop: any, shopId: string, itemId: string) {
  const isPartial = item._partial === true;

  // Price (Shopee returns price * 100000 for API, but meta might be direct)
  let preco = 0;
  if (item.price) {
    preco = item.price > 100000 ? item.price / 100000 : item.price;
  }
  const precoOriginal = item.price_before_discount
    ? (item.price_before_discount / 100000)
    : null;

  const totalVendido = item.historical_sold ?? item.sold ?? 0;
  const createdAt = item.ctime;
  const diasAtivo = createdAt
    ? Math.max(1, Math.floor((Date.now() / 1000 - createdAt) / 86400))
    : 1;
  const vendasPorDia = parseFloat((totalVendido / diasAtivo).toFixed(1));
  const faturamentoTotal = parseFloat((preco * totalVendido).toFixed(2));
  const faturamentoMensal = parseFloat((preco * vendasPorDia * 30).toFixed(2));

  const isOficial = shop.is_official_shop || false;
  const isPreferido = shop.is_preferred_plus_seller || shop.shopee_verified || false;
  const statusVendedor = isOficial
    ? 'Loja Oficial'
    : isPreferido
      ? 'Vendedor Preferido'
      : 'Vendedor Padrão';

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
    produto: {
      nome: item.name || item.title || 'Nome não disponível',
      preco: preco.toFixed(2),
      precoOriginal: precoOriginal?.toFixed(2) || null,
      desconto: precoOriginal && precoOriginal > preco
        ? Math.round((1 - preco / precoOriginal) * 100)
        : null,
      estoque: item.stock ?? null,
      totalVendido,
      vendasPorDia,
      faturamentoTotal: faturamentoTotal.toFixed(2),
      faturamentoMensal: faturamentoMensal.toFixed(2),
      avaliacao: item.item_rating?.rating_star?.toFixed(1) || null,
      totalAvaliacoes,
      distribuicaoEstrelas: estrelasDist,
      dataCriacao: createdAt
        ? new Date(createdAt * 1000).toLocaleDateString('pt-BR')
        : null,
      diasAtivo,
      categoria: item.categories?.at(-1)?.display_name || null,
      imagem,
    },
    vendedor: {
      nome: shop.name || 'Loja não identificada',
      localizacao: shop.place || shop.country || null,
      status: statusVendedor,
      isOficial,
      isPreferido,
      taxaResposta: shop.response_rate ?? null,
      tempoResposta: shop.response_time ?? null,
      dataIngresso: shop.ctime
        ? new Date(shop.ctime * 1000).toLocaleDateString('pt-BR')
        : null,
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

    // Try strategies in order: Direct API → Proxy → HTML scraping
    let item: any = null;
    const errors: string[] = [];

    // Strategy 1: Direct API
    try {
      item = await tryDirectApi(shopId, itemId, headers);
    } catch (e: any) {
      errors.push(`API: ${e.message}`);
      console.log('[Main] Strategy 1 failed:', e.message);
    }

    // Strategy 2: Proxy APIs
    if (!item) {
      try {
        item = await tryProxyApis(shopId, itemId);
      } catch (e: any) {
        errors.push(`Proxy: ${e.message}`);
        console.log('[Main] Strategy 2 failed:', e.message);
      }
    }

    // Strategy 3: HTML scraping
    if (!item) {
      try {
        item = await tryHtmlScraping(shopId, itemId);
      } catch (e: any) {
        errors.push(`HTML: ${e.message}`);
        console.log('[Main] Strategy 3 failed:', e.message);
      }
    }

    if (!item) {
      console.error('[Main] All strategies failed:', errors);
      return respond({
        sucesso: false,
        erro: 'BLOQUEADO',
        mensagem: 'A Shopee bloqueou esta consulta. Aguarde alguns minutos e tente novamente.',
        detalhes: errors,
      });
    }

    // Fetch shop details (best-effort, non-blocking)
    const shop = await fetchShopDetails(shopId, headers);

    const resultado = buildResult(item, shop, shopId, itemId);

    // Save to Supabase (non-blocking)
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
        body: JSON.stringify({
          url,
          shop_id: shopId,
          item_id: itemId,
          data: resultado,
        }),
      });
    } catch { /* non-fatal */ }

    return respond(resultado);
  } catch (e: any) {
    console.error('Error:', e);
    return respond({
      sucesso: false,
      erro: 'INTERNAL',
      mensagem: 'Erro ao buscar dados. Verifique o link e tente novamente.',
    }, 500);
  }
});
