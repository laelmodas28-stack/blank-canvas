import { useEffect, useState } from "react";
import { Loader2, Target, AlertOctagon, Lightbulb, Wallet, Megaphone, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callStrategyAdvisor } from "../lib/strategyClient";

interface ExecutiveSummaryData {
  resumo: string;
  maior_oportunidade: { titulo: string; descricao: string; impacto_estimado_reais: number };
  maior_risco: { titulo: string; descricao: string; impacto_estimado_reais: number };
  top_prioridades: { ordem: number; titulo: string; acao: string; impacto_estimado_reais: number }[];
  alertas_caixa: string;
  alertas_anuncios: string;
  alertas_margem: string;
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);

export function ExecutiveSummary() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExecutiveSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: imports }, { data: recs }] = await Promise.all([
        supabase.from("strategy_imports").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("strategy_recommendations").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      const context = {
        relatorios_recentes: (imports ?? []).map((i) => ({
          tipo: i.detected_type,
          arquivo: i.file_name,
          resumo: i.summary,
          linhas: i.row_count,
        })),
        recomendacoes_recentes: recs ?? [],
      };
      const result = await callStrategyAdvisor<ExecutiveSummaryData>("executive_summary", context);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar briefing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">A IA CEO está preparando o briefing executivo...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-sm text-rose-700 mb-3">{error}</p>
        <button
          onClick={() => void generate()}
          className="text-sm font-medium text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary/5 to-transparent border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Briefing da IA CEO</h3>
            <p className="text-[11px] text-muted-foreground">Recomendações estratégicas baseadas nos seus dados</p>
          </div>
          <button
            onClick={() => void generate()}
            disabled={loading}
            className="ml-auto text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
        <p className="text-sm text-foreground leading-relaxed mt-3">{data.resumo}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-emerald-600" />
            <h4 className="text-sm font-semibold text-foreground">Maior Oportunidade</h4>
          </div>
          <p className="text-base font-semibold text-foreground">{data.maior_oportunidade?.titulo}</p>
          <p className="text-sm text-muted-foreground mt-1">{data.maior_oportunidade?.descricao}</p>
          <p className="text-sm font-semibold text-emerald-700 mt-2">
            Impacto estimado: {brl(data.maior_oportunidade?.impacto_estimado_reais)}
          </p>
        </div>
        <div className="bg-card border border-rose-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon className="h-4 w-4 text-rose-600" />
            <h4 className="text-sm font-semibold text-foreground">Maior Risco</h4>
          </div>
          <p className="text-base font-semibold text-foreground">{data.maior_risco?.titulo}</p>
          <p className="text-sm text-muted-foreground mt-1">{data.maior_risco?.descricao}</p>
          <p className="text-sm font-semibold text-rose-700 mt-2">
            Perda potencial: {brl(data.maior_risco?.impacto_estimado_reais)}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="text-sm font-semibold text-foreground mb-3">Top 5 Prioridades de Hoje</h4>
        <ol className="space-y-3">
          {(data.top_prioridades ?? []).slice(0, 5).map((p) => (
            <li key={p.ordem} className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                {p.ordem}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{p.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.acao}</p>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                  +{brl(p.impacto_estimado_reais)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AlertBlock icon={<Wallet className="h-4 w-4" />} title="Fluxo de Caixa" text={data.alertas_caixa} />
        <AlertBlock icon={<Megaphone className="h-4 w-4" />} title="Anúncios" text={data.alertas_anuncios} />
        <AlertBlock icon={<Percent className="h-4 w-4" />} title="Margem" text={data.alertas_margem} />
      </div>
    </div>
  );
}

function AlertBlock({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}
