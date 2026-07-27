import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callStrategyAdvisor } from "../lib/strategyClient";
import {
  RecommendationCard,
  EmptyRecommendations,
  type Recommendation,
} from "./RecommendationCard";
import { toast } from "sonner";

type Category = "todos" | "anuncios" | "precificacao" | "estoque" | "operacional" | "fiscal" | "produto";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "anuncios", label: "Anúncios" },
  { id: "precificacao", label: "Precificação" },
  { id: "estoque", label: "Estoque" },
  { id: "operacional", label: "Operacional" },
  { id: "fiscal", label: "Fiscal" },
  { id: "produto", label: "Produto" },
];

export function RecommendationsPanel({ scope }: { scope: "anuncios" | "geral" | "produto" | "lucro" }) {
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<Category>("todos");

  const load = async () => {
    const { data } = await supabase
      .from("strategy_recommendations")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50);
    setRecs(
      (data ?? []).map((r) => ({
        categoria: r.category,
        titulo: r.title,
        porque: r.reason,
        acao_sugerida: r.suggested_action,
        impacto_financeiro_reais: Number(r.financial_impact ?? 0),
        melhoria_estimada: r.estimated_improvement ?? undefined,
        confianca: r.confidence ?? 50,
        risco: r.risk ?? "medio",
        prioridade: r.priority ?? 3,
      }))
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const [{ data: imports }, { data: produtos }] = await Promise.all([
        supabase.from("strategy_imports").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("produtos_analisados").select("*").order("data_coleta", { ascending: false }).limit(30),
      ]);
      const result = await callStrategyAdvisor<{ recomendacoes: Recommendation[] }>(
        "recommendations",
        {
          foco: scope,
          relatorios: (imports ?? []).map((i) => ({
            tipo: i.detected_type,
            resumo: i.summary,
            headers: (i.normalized_data as { headers?: string[] })?.headers ?? [],
          })),
          produtos_analisados: produtos ?? [],
        }
      );
      const list = (result.recomendacoes ?? []).map((r) => ({
        ...r,
        confianca: Math.max(0, Math.min(100, Math.round(r.confianca ?? 50))),
        prioridade: Math.max(1, Math.min(5, Math.round(r.prioridade ?? 3))),
      }));
      if (list.length > 0) {
        const { error } = await supabase.from("strategy_recommendations").insert(
          list.map((r) => ({
            category: r.categoria,
            title: r.titulo,
            reason: r.porque,
            suggested_action: r.acao_sugerida,
            financial_impact: r.impacto_financeiro_reais,
            estimated_improvement: r.melhoria_estimada,
            confidence: r.confianca,
            risk: r.risco,
            priority: r.prioridade,
          }))
        );
        if (error) throw error;
      }
      await load();
      toast.success(`${list.length} recomendação(ões) gerada(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar recomendações");
    } finally {
      setLoading(false);
    }
  };

  const filtered = recs.filter((r) => filter === "todos" || r.categoria === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={[
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                filter === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40",
              ].join(" ")}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => void generate()}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Analisando..." : "Gerar recomendações com IA"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyRecommendations message="Nenhuma recomendação ainda. Importe relatórios e clique em 'Gerar recomendações com IA'." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((r, i) => (
            <RecommendationCard key={i} rec={r} />
          ))}
        </div>
      )}
    </div>
  );
}
