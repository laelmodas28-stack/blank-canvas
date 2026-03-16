import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getHeaders(shopId: string, itemId: string): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Referer': `https://shopee.com.br/produto-i.${shopId}.${itemId}`,
    'X-Requested-With': 'XMLHttpRequest',
    'af-ac-enc-dat': 'aa==',
    'cookie': 'SPC_EC=-; SPC_F=guest; REC_T_ID=guest',
  };
}

async function fetchShopee(url: string, headers: Record<string, string>): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function respond(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

    const productUrl = `https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
    const shopUrl = `https://shopee.com.br/api/v4/shop/get_shop_detail?shopid=${shopId}`;
    const ratingsUrl = `https://shopee.com.br/api/v4/product/get_ratings?itemid=${itemId}&shopid=${shopId}&limit=0&offset=0&type=0`;

    const [productResult, shopResult, ratingsResult] = await Promise.allSettled([
      fetchShopee(productUrl, headers),
      fetchShopee(shopUrl, headers),
      fetchShopee(ratingsUrl, headers),
    ]);

    const item = productResult.status === 'fulfilled'
      ? (productResult.value?.data?.item || productResult.value?.item || {})
      : {};
    const shop = shopResult.status === 'fulfilled'
      ? (shopResult.value?.data || shopResult.value || {})
      : {};
    const ratings = ratingsResult.status === 'fulfilled'
      ? (ratingsResult.value?.data || {})
      : {};

    // Check if blocked
    if (!item.name && !item.title) {
      return respond({
        sucesso: false,
        erro: 'BLOQUEADO',
        mensagem: 'A Shopee bloqueou esta consulta. Aguarde alguns minutos e tente novamente.',
      });
    }

    // Price (Shopee returns price * 100000)
    const preco = item.price ? (item.price / 100000) : 0;
    const precoOriginal = item.price_before_discount
      ? (item.price_before_discount / 100000)
      : null;

    // Sales estimates
    const totalVendido = item.historical_sold ?? item.sold ?? 0;
    const createdAt = item.ctime;
    const diasAtivo = createdAt
      ? Math.max(1, Math.floor((Date.now() / 1000 - createdAt) / 86400))
      : 1;
    const vendasPorDia = parseFloat((totalVendido / diasAtivo).toFixed(1));
    const faturamentoTotal = parseFloat((preco * totalVendido).toFixed(2));
    const faturamentoMensal = parseFloat((preco * vendasPorDia * 30).toFixed(2));

    // Seller status
    const isOficial = shop.is_official_shop || false;
    const isPreferido = shop.is_preferred_plus_seller || shop.shopee_verified || false;
    const statusVendedor = isOficial
      ? 'Loja Oficial'
      : isPreferido
        ? 'Vendedor Preferido'
        : 'Vendedor Padrão';

    // Ratings distribution (index 0 = total or 1-star depending on API version)
    const distEstrelas = item.item_rating?.rating_count || [0, 0, 0, 0, 0, 0];
    // Shopee rating_count[0] = total, [1]-[5] = per star
    const totalAvaliacoes = distEstrelas.length > 5
      ? distEstrelas[0]
      : distEstrelas.reduce((a: number, b: number) => a + b, 0);
    // Per-star distribution (5 to 1)
    const estrelasDist = distEstrelas.length > 5
      ? [distEstrelas[5], distEstrelas[4], distEstrelas[3], distEstrelas[2], distEstrelas[1]]
      : [...distEstrelas].reverse();

    const imageId = item.image || (Array.isArray(item.images) && item.images[0]) || '';
    const imagem = imageId
      ? (imageId.startsWith('http') ? imageId : `https://down-br.img.susercontent.com/file/${imageId}`)
      : null;

    const resultado = {
      sucesso: true,
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

    // Save to Supabase (non-blocking, ignore errors)
    try {
      const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await sb.from('shopee_analysis').insert({
        url,
        shop_id: shopId,
        item_id: itemId,
        data: resultado,
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
