import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { productName, category, differentials, style } = await req.json();

    if (!productName?.trim()) {
      return new Response(
        JSON.stringify({ error: "Nome do produto é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const styleInstructions: Record<string, string> = {
      persuasivo:
        "Use linguagem emocional e envolvente. Destaque transformação e benefícios. Tom: 'Transforme sua experiência com...'",
      profissional:
        "Use linguagem clara e objetiva. Foque em especificações, confiabilidade e funcionalidade.",
      premium:
        "Use tom sofisticado. Destaque qualidade, exclusividade e experiência superior.",
    };

    const systemPrompt = `Você é um copywriter sênior especializado em marketplaces brasileiros (Shopee e Mercado Livre).

Seu objetivo é criar anúncios de alta conversão baseados nos melhores anúncios desses marketplaces.

REGRAS DE ESTILO: ${styleInstructions[style] || styleInstructions.persuasivo}

Você DEVE retornar EXATAMENTE um JSON válido (sem markdown, sem backticks) com esta estrutura:
{
  "titles": [
    {"text": "título aqui", "platform": "Shopee", "charCount": 80},
    {"text": "título aqui", "platform": "Shopee", "charCount": 80},
    {"text": "título aqui", "platform": "Shopee", "charCount": 80},
    {"text": "título aqui", "platform": "Mercado Livre", "charCount": 55},
    {"text": "título aqui", "platform": "Mercado Livre", "charCount": 55}
  ],
  "description": "descrição completa aqui com pelo menos 250 palavras",
  "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5", "palavra6", "palavra7", "palavra8", "palavra9", "palavra10"]
}

REGRAS PARA TÍTULOS:
- Gere 5 títulos otimizados para SEO de marketplace
- 3 títulos para Shopee (máximo 120 caracteres)
- 2 títulos para Mercado Livre (máximo 60 caracteres)
- Inclua palavra-chave principal e benefício do produto
- Linguagem clara e natural
- Evite símbolos excessivos
- charCount deve ser o número real de caracteres do título

REGRAS PARA DESCRIÇÃO:
- Mínimo 250 palavras, máximo 400 palavras
- Estruture com estas seções usando "##" para títulos de seção:
  1. Introdução atrativa (parágrafo forte apresentando o produto)
  2. Vantagens do produto (por que é útil, que problemas resolve)
  3. Características principais (lista com bullet points usando "•")
  4. Cenários de uso (onde e como usar)
  5. Benefícios para o cliente (conforto, performance, dia a dia)
  6. Detalhes do produto (materiais, tamanho, compatibilidade)
  7. Por que escolher este produto (diferencial competitivo)
  8. Incentivo à compra (call to action natural)
- Use parágrafos curtos, bullet points e títulos de seção
- Deve ser fácil de ler em dispositivos móveis

REGRAS PARA KEYWORDS:
- 10 palavras-chave SEO relevantes para marketplaces brasileiros
- Inclua variações e termos de busca populares`;

    const userPrompt = `Crie um anúncio profissional para o seguinte produto:

Produto: ${productName}
${category ? `Categoria: ${category}` : ""}
${differentials ? `Diferenciais: ${differentials}` : ""}

Retorne APENAS o JSON, sem nenhum texto adicional.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no seu workspace Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar anúncio. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta da IA. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
