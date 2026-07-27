import { useEffect, useState } from "react";
import { Loader2, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callStrategyAdvisor } from "../lib/strategyClient";
import { toast } from "sonner";

interface ForecastData {
  receita_proximo_mes_reais: number;
  lucro_proximo_mes_reais: number;
  risco_ruptura_estoque: "baixo" | "medio" | "alto" | string;
  tendencia_lucro: "queda" | "estavel" | "alta" | string;
  sazonalidade_observada: string;
  comentario_executivo: string;
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);

export function Forecasts() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ForecastData | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const [{ data: imports }, { data: produtos }] = await Promise.all([
        supabase.from("strategy_imports").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("produtos_analisados").select("*").order("data_coleta", { ascending: false }).limit(30),
      ]);
      const result = await callStrategyAdvisor<ForecastData>("forecasts", {
        relatorios: (imports ?? []).map((i) => ({ tipo: i.detected_type, resumo: i.summary })),
        produtos: produtos ?? [],
      });
      setData(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao prever");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Previsões da IA</h3>
          <p className="text-xs text-muted-foreground">Projeções para o próximo mês</p>
        </div>
        <button
          onClick={() => void generate()}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Prevendo..." : "Atualizar previsão"}
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatTile title="Receita prevista" value={brl(data.receita_proximo_mes_reais)} icon={<TrendingUp className="h-4 w-4" />} />
          <StatTile title="Lucro previsto" value={brl(data.lucro_proximo_mes_reais)} icon={<TrendingUp className="h-4 w-4" />} />
          <StatTile title="Risco de ruptura" value={data.risco_ruptura_estoque} icon={<AlertTriangle className="h-4 w-4" />} />
          <StatTile title="Tendência do lucro" value={data.tendencia_lucro} icon={<TrendingUp className="h-4 w-4" />} />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Sazonalidade</p>
            <p className="text-sm text-foreground">{data.sazonalidade_observada}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Comentário executivo</p>
            <p className="text-sm text-foreground">{data.comentario_executivo}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-lg font-bold text-foreground capitalize">{value}</p>
    </div>
  );
}
