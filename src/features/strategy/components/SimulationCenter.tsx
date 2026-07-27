import { useState } from "react";
import { Loader2, Play, TrendingUp, TrendingDown } from "lucide-react";
import { runSimulation, type SimulationInputs } from "../lib/simulations";
import { callStrategyAdvisor } from "../lib/strategyClient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);

const DEFAULTS: SimulationInputs = {
  precoAtual: 79.9,
  custoProduto: 22,
  taxaMarketplacePct: 20,
  taxaPagamentoPct: 3,
  fretePago: 4,
  impostoPct: 8,
  vendasMes: 200,
  gastoAdsMes: 800,
  shopeeAcelera: false,
  aceleraPct: 6,
};

export function SimulationCenter() {
  const [inputs, setInputs] = useState<SimulationInputs>(DEFAULTS);
  const [scenario, setScenario] = useState({
    novoPreco: 84.9,
    novoGastoAds: 1200,
    aceleraLigado: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof runSimulation> | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [finalReco, setFinalReco] = useState<string | null>(null);

  const run = async () => {
    const out = runSimulation(inputs, {
      novoPreco: scenario.novoPreco,
      novoGastoAds: scenario.novoGastoAds,
      aceleraLigado: scenario.aceleraLigado,
    });
    setResult(out);
    setLoading(true);
    setInterpretation(null);
    setFinalReco(null);
    try {
      const ai = await callStrategyAdvisor<{
        interpretacao: string;
        recomendacao_final: string;
      }>("simulation_interpretation", { base: inputs, cenario: scenario, calculado: out });
      setInterpretation(ai.interpretacao);
      setFinalReco(ai.recomendacao_final);
      await supabase.from("strategy_simulations").insert({
        scenario: JSON.stringify(scenario),
        inputs: inputs as unknown as Record<string, unknown>,
        results: out as unknown as Record<string, unknown>,
        ai_interpretation: ai.interpretacao,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na interpretação da IA");
    } finally {
      setLoading(false);
    }
  };

  const numField = (
    label: string,
    key: keyof SimulationInputs,
    step = 0.01
  ) => (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        step={step}
        value={inputs[key] as number}
        onChange={(e) =>
          setInputs({ ...inputs, [key]: parseFloat(e.target.value) || 0 })
        }
        className="mt-1 w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-background"
      />
    </label>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Situação atual</h3>
        <div className="grid grid-cols-2 gap-3">
          {numField("Preço atual (R$)", "precoAtual")}
          {numField("Custo produto (R$)", "custoProduto")}
          {numField("Taxa marketplace (%)", "taxaMarketplacePct", 0.1)}
          {numField("Taxa pagamento (%)", "taxaPagamentoPct", 0.1)}
          {numField("Frete pago (R$)", "fretePago")}
          {numField("Imposto (%)", "impostoPct", 0.1)}
          {numField("Vendas/mês", "vendasMes", 1)}
          {numField("Ads/mês (R$)", "gastoAdsMes", 1)}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Simular cenário</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Novo preço (R$)</span>
              <input
                type="number"
                step={0.01}
                value={scenario.novoPreco}
                onChange={(e) =>
                  setScenario({ ...scenario, novoPreco: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-background"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Novo gasto Ads (R$)</span>
              <input
                type="number"
                step={1}
                value={scenario.novoGastoAds}
                onChange={(e) =>
                  setScenario({ ...scenario, novoGastoAds: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full text-sm border border-border rounded-md px-2.5 py-1.5 bg-background"
              />
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={scenario.aceleraLigado}
                onChange={(e) => setScenario({ ...scenario, aceleraLigado: e.target.checked })}
              />
              <span className="text-sm text-foreground">Ligar Shopee Acelera</span>
            </label>
          </div>
          <button
            onClick={() => void run()}
            disabled={loading}
            className="mt-4 flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? "Analisando..." : "Rodar simulação"}
          </button>
        </div>

        {result && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ResultTile label="Lucro/mês" base={result.base.lucroMes} novo={result.cenario.lucroMes} delta={result.delta.lucroMes} />
            <ResultTile label="Margem" base={result.base.margemPct} novo={result.cenario.margemPct} delta={result.delta.margemPct} suffix="%" />
            <ResultTile label="Receita/mês" base={result.base.receitaMes} novo={result.cenario.receitaMes} delta={result.delta.receitaMes} />
            <ResultTile label="ROI Ads" base={result.base.roi} novo={result.cenario.roi} delta={result.delta.roi} suffix="%" />
          </div>
        )}

        {(interpretation || finalReco) && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
            {interpretation && (
              <p className="text-sm text-foreground leading-relaxed mb-3">{interpretation}</p>
            )}
            {finalReco && (
              <p className="text-sm font-semibold text-primary">{finalReco}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultTile({
  label,
  base,
  novo,
  delta,
  suffix,
}: {
  label: string;
  base: number;
  novo: number;
  delta: number;
  suffix?: string;
}) {
  const positive = delta >= 0;
  const fmt = (n: number) => (suffix ? `${n.toFixed(1)}${suffix}` : brl(n));
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-1">{fmt(novo)}</p>
      <p className="text-[11px] text-muted-foreground">Atual: {fmt(base)}</p>
      <div
        className={[
          "mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded",
          positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
        ].join(" ")}
      >
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {positive ? "+" : ""}
        {fmt(delta)}
      </div>
    </div>
  );
}
