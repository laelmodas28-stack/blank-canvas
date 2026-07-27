import { useEffect, useState } from "react";
import { Loader2, Bell, AlertTriangle, Info, AlertOctagon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callStrategyAdvisor } from "../lib/strategyClient";
import { toast } from "sonner";

interface AlertRow {
  id: string;
  severity: string;
  category: string;
  title: string;
  message: string;
  dismissed: boolean;
  created_at: string;
}

const ICONS: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-sky-600" />,
  atencao: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  critico: <AlertOctagon className="h-4 w-4 text-rose-600" />,
};

const BG: Record<string, string> = {
  info: "border-sky-200 bg-sky-50/50",
  atencao: "border-amber-200 bg-amber-50/50",
  critico: "border-rose-200 bg-rose-50/50",
};

export function AlertsFeed() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("strategy_alerts")
      .select("*")
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(50);
    setAlerts((data ?? []) as AlertRow[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const [{ data: imports }, { data: recs }] = await Promise.all([
        supabase.from("strategy_imports").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("strategy_recommendations").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      const result = await callStrategyAdvisor<{
        alertas: { severidade: string; categoria: string; titulo: string; mensagem: string }[];
      }>("alerts", {
        relatorios: (imports ?? []).map((i) => ({ tipo: i.detected_type, resumo: i.summary })),
        recomendacoes: recs ?? [],
      });
      const list = result.alertas ?? [];
      if (list.length > 0) {
        await supabase.from("strategy_alerts").insert(
          list.map((a) => ({
            severity: a.severidade,
            category: a.categoria,
            title: a.titulo,
            message: a.mensagem,
          }))
        );
      }
      await load();
      toast.success(`${list.length} alerta(s) gerado(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar alertas");
    } finally {
      setLoading(false);
    }
  };

  const dismiss = async (id: string) => {
    await supabase.from("strategy_alerts").update({ dismissed: true }).eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Alertas Automáticos</h3>
        </div>
        <button
          onClick={() => void generate()}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {loading ? "Analisando..." : "Gerar alertas com IA"}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Sem alertas ativos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={["flex items-start gap-3 border rounded-lg p-3", BG[a.severity] ?? BG.info].join(" ")}
            >
              <div className="shrink-0 mt-0.5">{ICONS[a.severity] ?? ICONS.info}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {a.category}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-0.5">{a.message}</p>
              </div>
              <button
                onClick={() => void dismiss(a.id)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Dispensar alerta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
