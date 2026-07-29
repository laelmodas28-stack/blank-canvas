import { useMemo, useState } from "react";
import { Brain, Sparkles, Loader2 } from "lucide-react";
import { useFinanceSales, useFinanceAds, useFinanceSettings } from "../hooks/useFinanceData";
import { computeKPIs, periodRange, productRanking } from "../lib/aggregations";
import { callStrategyAdvisor } from "@/features/strategy/lib/strategyClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Recommendation {
  categoria: string;
  titulo: string;
  porque: string;
  acao_sugerida: string;
  impacto_financeiro_reais: number;
  melhoria_estimada: string;
  confianca: number;
  risco: string;
  prioridade: number;
}

const brl = (n: number) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function StrategicAnalysis() {
  const { sales } = useFinanceSales();
  const { campaigns } = useFinanceAds();
  const { settings } = useFinanceSettings();
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);

  const snapshot = useMemo(() => {
    const { start, end } = periodRange("month");
    const kpis = computeKPIs(sales, campaigns, start, end);
    const ranking = productRanking(sales).slice(0, 10);
    return { kpis, ranking, campaigns: campaigns.slice(0, 20), settings };
  }, [sales, campaigns, settings]);

  const analyze = async () => {
    if (sales.length === 0) {
      toast.error("Registre ou importe vendas antes de solicitar análise");
      return;
    }
    setLoading(true);
    try {
      const result = await callStrategyAdvisor<{ recomendacoes: Recommendation[] }>("recommendations", {
        contexto: "Análise financeira do negócio marketplace",
        indicadores: snapshot.kpis,
        top_produtos: snapshot.ranking,
        campanhas: snapshot.campaigns,
        configuracoes: snapshot.settings,
      });
      const list = Array.isArray(result?.recomendacoes) ? result.recomendacoes : [];
      setRecs(list.sort((a, b) => b.impacto_financeiro_reais - a.impacto_financeiro_reais));
      toast.success(`${list.length} recomendações geradas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao analisar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">IA Consultor</p>
            <h3 className="text-base font-semibold">Análise estratégica do seu negócio</h3>
            <p className="text-sm opacity-90 mt-1">Enviamos os indicadores atuais e o ranking de produtos para a IA e trazemos recomendações priorizadas por impacto no Lucro Líquido.</p>
          </div>
        </div>
        <button onClick={analyze} disabled={loading} className="px-4 py-2 rounded-md bg-white/15 hover:bg-white/25 text-sm font-medium flex items-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Analisando..." : "Gerar recomendações"}
        </button>
      </div>

      {recs.length === 0 && !loading && (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          Clique em "Gerar recomendações" para receber a análise da IA sobre suas vendas.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recs.map((r, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="font-semibold text-sm">{r.titulo}</h4>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                r.risco === "alto" ? "bg-rose-500/10 text-rose-700" : r.risco === "medio" ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"
              )}>Risco {r.risco}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase mb-2">{r.categoria}</p>
            <p className="text-sm mb-2"><strong>Por quê:</strong> {r.porque}</p>
            <p className="text-sm mb-3"><strong>Ação:</strong> {r.acao_sugerida}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="text-emerald-700">Impacto: {brl(r.impacto_financeiro_reais)}</span>
              <span className="text-muted-foreground">Confiança: {r.confianca}%</span>
              <span className="text-muted-foreground">Prioridade: {r.prioridade}/5</span>
              <span className="text-muted-foreground">{r.melhoria_estimada}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
