import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPTS: Record<string, string> = {
  profissional:
    "Professional product photography, clean white studio background, soft diffused lighting, high-end commercial quality, sharp focus, no text overlays",
  premium:
    "Luxury product photography, dramatic lighting, dark elegant background with subtle reflections, high-end aesthetic, premium feel, sophisticated composition",
  persuasivo:
    "Dynamic commercial product photo, vibrant colors, energetic composition, eye-catching angles, high conversion marketing style, lifestyle appeal",
  minimalista:
    "Minimalist product photography, ultra-clean composition, generous negative space, subtle shadows, elegant simplicity, Scandinavian aesthetic",
};

const MODE_PROMPTS: Record<string, string> = {
  modelo:
    "A realistic human model naturally wearing/using the product, natural pose, professional fashion photography, full body or upper body shot, natural skin texture, realistic lighting",
  estudio:
    "Product centered on clean white background, professional studio lighting, product-only shot, no props, marketplace listing ready, square format",
  lifestyle:
    "Product in a real-world lifestyle setting, natural environment context, warm ambient lighting, storytelling composition, aspirational scene",
};

function buildPrompt(
  userPrompt: string,
  mode: string,
  style: string,
  colorVariation?: string
): string {
  const parts: string[] = [];

  parts.push(MODE_PROMPTS[mode] || MODE_PROMPTS.estudio);
  parts.push(STYLE_PROMPTS[style] || STYLE_PROMPTS.profissional);

  if (colorVariation?.trim()) {
    parts.push(
      `Product color variation: ${colorVariation}. Maintain original texture, shadows, and material properties while changing the color.`
    );
  }

  if (userPrompt?.trim()) {
    parts.push(`Additional details: ${userPrompt}`);
  }

  parts.push(
    "Output: square 1:1 aspect ratio, minimum 1024x1024 quality, marketplace-optimized product image. No text or watermarks."
  );

  return parts.join(". ");
}

async function generateWithModel(
  apiKey: string,
  model: string,
  prompt: string,
  inputImageBase64?: string
): Promise<{ imageBase64: string; model: string }> {
  const messages: any[] = [];

  if (inputImageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: inputImageBase64 },
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        modalities: ["image", "text"],
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Model ${model} failed [${response.status}]: ${text}`);
  }

  const data = await response.json();
  const imageUrl =
    data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageUrl) {
    throw new Error(`Model ${model} returned no image`);
  }

  return { imageBase64: imageUrl, model };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, mode, style, colorVariation, inputImage } =
      await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const fullPrompt = buildPrompt(
      prompt || "",
      mode || "estudio",
      style || "profissional",
      colorVariation
    );

    console.log("Generating with prompt:", fullPrompt.substring(0, 200));

    // Try models in order: flash-image (fast) → pro-image (quality) → flash-image-v2
    const models = [
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3-pro-image-preview",
      "google/gemini-2.5-flash-image",
    ];

    let lastError = "";
    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        const result = await generateWithModel(
          LOVABLE_API_KEY,
          model,
          fullPrompt,
          inputImage || undefined
        );

        return new Response(
          JSON.stringify({
            success: true,
            imageUrl: result.imageBase64,
            model: result.model,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (err: any) {
        console.error(`Model ${model} failed:`, err.message);
        lastError = err.message;

        if (err.message.includes("429")) {
          return new Response(
            JSON.stringify({
              error:
                "Limite de requisições excedido. Aguarde alguns segundos e tente novamente.",
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (err.message.includes("402")) {
          return new Response(
            JSON.stringify({
              error:
                "Créditos insuficientes. Adicione créditos no workspace Lovable.",
            }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        error: "Falha na geração de imagem. Tente novamente.",
        details: lastError,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-product-image error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
