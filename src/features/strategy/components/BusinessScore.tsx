import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callStrategyAdvisor } from "../lib/strategyClient";
import { toast } from "sonner";

interface ScoreData {
  score_geral: number;
  explicacao: string;
  dimensoes: Record<string, number>;
}

const DIM_LABELS: Record<string, string> = {
  lucratividade: "Lucratividade",
  fluxo_caixa: "Fluxo de Caixa",
  crescimento: "Crescimento",
  anuncios: "Anúncios",
  estoque: "Estoque",
  impostos: "Impostos",
  taxas_marketplace: "Taxas Marketplace",
  conversao: "Conversão",
  cancelamento: "Cancelamento",
  eficiencia_operacional: "Eficiência Operacional",
  saude_financeira: "Saúde Financeira",
};

export function BusinessScore() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScoreData | null>(null);

  useEffect(() => {
    void loadLast();
  }, []);

  const loadLast = async () => {
    const { data: last } = await supabase
      .from("strategy_scores")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) {
      setData({
        score_geral: last.overall_score,
        explicacao: last.explanation ?? "",
        dimensoes: (last.dimensions as Record<string, number>) ?? {},
      });
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const [{ data: imports }, { data: recs }] = await Promise.all([
        supabase.from("strategy_imports").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("strategy_recommendations").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      const result = await callStrategyAdvisor<ScoreData>("business_score", {
        relatorios: (imports ?? []).map((i) => ({ tipo: i.detected_type, resumo: i.summary })),
        recomendacoes: recs ?? [],
      });
      const score = Math.max(0, Math.min(100, Math.round(result.score_geral ?? 0)));
      const clean = { ...result, score_geral: score };
      setData(clean);
      await supabase.from("strategy_scores").insert({
        overall_score: score,
        dimensions: result.dimensoes ?? {},
        explanation: result.explicacao ?? "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao calcular score");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (n: number) =>
    n >= 75 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Score do Negócio</h3>
          <p className="text-xs text-muted-foreground">Avaliação 0–100 baseada em todos os indicadores</p>
        </div>
        <button
          onClick={() => void generate()}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Calculando..." : "Calcular com IA"}
        </button>
      </div>

      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-xs text-muted-foreground mb-2">Nota geral</p>
            <p className={["text-6xl font-bold", scoreColor(data.score_geral)].join(" ")}>
              {data.score_geral}
            </p>
            <p className="text-xs text-muted-foreground mt-1">de 100</p>
            <p className="text-sm text-foreground mt-4 leading-relaxed">{data.explicacao}</p>
          </div>
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 space-y-3">
            {Object.entries(data.dimensoes ?? {}).map(([k, v]) => {
              const val = Math.max(0, Math.min(100, Math.round(v)));
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{DIM_LABELS[k] ?? k}</span>
                    <span className={["font-semibold", scoreColor(val)].join(" ")}>{val}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={[
                        "h-full rounded-full transition-all",
                        val >= 75 ? "bg-emerald-500" : val >= 50 ? "bg-amber-500" : "bg-rose-500",
                      ].join(" ")}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum score calculado ainda. Clique em "Calcular com IA" para gerar.
          </p>
        </div>
      )}
    </div>
  );
}
