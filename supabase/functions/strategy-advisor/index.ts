import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Mode =
  | "executive_summary"
  | "recommendations"
  | "business_score"
  | "alerts"
  | "simulation_interpretation"
  | "forecasts";

interface RequestBody {
  mode: Mode;
  context: Record<string, unknown>;
}

const SYSTEM_PROMPT = `Você é um Consultor de Negócios sênior especializado em Shopee e Mercado Livre.
Você NÃO é um dashboard. Você é o centro de inteligência estratégica de uma empresa.
Seu objetivo é maximizar Lucro Líquido, Fluxo de Caixa, Crescimento, Eficiência Operacional, ROI e sustentabilidade.
Nunca dê conselhos genéricos. Baseie tudo nos dados fornecidos.
Sempre priorize Lucro Líquido sobre ROAS ou receita bruta.
Responda SEMPRE em Português do Brasil, com linguagem executiva clara.
Retorne EXCLUSIVAMENTE JSON válido no schema pedido. Nunca inclua markdown, comentários ou texto fora do JSON.`;

const SCHEMAS: Record<Mode, string> = {
  executive_summary: `{
  "resumo": "string (2-4 frases)",
  "maior_oportunidade": { "titulo": "string", "descricao": "string", "impacto_estimado_reais": number },
  "maior_risco": { "titulo": "string", "descricao": "string", "impacto_estimado_reais": number },
  "top_prioridades": [ { "ordem": number, "titulo": "string", "acao": "string", "impacto_estimado_reais": number } ],
  "alertas_caixa": "string",
  "alertas_anuncios": "string",
  "alertas_margem": "string"
}`,
  recommendations: `{
  "recomendacoes": [
    {
      "categoria": "anuncios|precificacao|estoque|operacional|fiscal|produto",
      "titulo": "string",
      "porque": "string",
      "acao_sugerida": "string",
      "impacto_financeiro_reais": number,
      "melhoria_estimada": "string",
      "confianca": number (0-100),
      "risco": "baixo|medio|alto",
      "prioridade": number (1-5)
    }
  ]
}`,
  business_score: `{
  "score_geral": number (0-100),
  "explicacao": "string",
  "dimensoes": {
    "lucratividade": number, "fluxo_caixa": number, "crescimento": number,
    "anuncios": number, "estoque": number, "impostos": number,
    "taxas_marketplace": number, "conversao": number, "cancelamento": number,
    "eficiencia_operacional": number, "saude_financeira": number
  }
}`,
  alerts: `{
  "alertas": [
    { "severidade": "info|atencao|critico", "categoria": "string", "titulo": "string", "mensagem": "string" }
  ]
}`,
  simulation_interpretation: `{
  "interpretacao": "string (parágrafo executivo)",
  "recomendacao_final": "string"
}`,
  forecasts: `{
  "receita_proximo_mes_reais": number,
  "lucro_proximo_mes_reais": number,
  "risco_ruptura_estoque": "baixo|medio|alto",
  "tendencia_lucro": "queda|estavel|alta",
  "sazonalidade_observada": "string",
  "comentario_executivo": "string"
}`,
};

const buildUserPrompt = (mode: Mode, context: Record<string, unknown>): string => {
  return `Modo de análise: ${mode}

Dados do negócio e relatórios importados:
${JSON.stringify(context, null, 2)}

Retorne EXCLUSIVAMENTE um JSON válido seguindo o schema abaixo (sem markdown, sem cercas de código, sem comentários):
${SCHEMAS[mode]}`;
};

const extractJson = (raw: string): unknown => {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return { raw: cleaned };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.mode) {
      return new Response(
        JSON.stringify({ error: "Campo 'mode' obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const model =
      body.mode === "executive_summary" || body.mode === "business_score"
        ? "google/gemini-2.5-flash"
        : "google/gemini-2.5-flash";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(body.mode, body.context ?? {}) },
          ],
        }),
      }
    );

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de uso atingido, tente novamente em alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos ao workspace para continuar." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({ error: `Falha na IA (${response.status})`, details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = extractJson(content);

    return new Response(JSON.stringify({ mode: body.mode, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
