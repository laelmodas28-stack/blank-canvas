import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, Info } from "lucide-react";
import { useFinanceSales, useFinanceAds, useFinanceSettings } from "../hooks/useFinanceData";
import { computeKPIs, periodRange, previousRange, pctDelta, productRanking } from "../lib/aggregations";
import { cn } from "@/lib/utils";

interface Alert {
  severity: "info" | "atencao" | "critico";
  title: string;
  message: string;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ICONS = { info: Info, atencao: AlertTriangle, critico: AlertTriangle };
const STYLES = {
  info: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  atencao: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  critico: "bg-rose-500/10 text-rose-700 border-rose-500/30",
};

export function FinanceAlerts() {
  const { sales } = useFinanceSales();
  const { campaigns } = useFinanceAds();
  const { settings } = useFinanceSettings();

  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];
    const { start, end } = periodRange("month");
    const prev = previousRange(start, end);
    const cur = computeKPIs(sales, campaigns, start, end);
    const before = computeKPIs(sales, campaigns, prev.start, prev.end);

    if (settings) {
      if (cur.averageMargin < settings.min_margin && cur.orders > 0) {
        list.push({ severity: "critico", title: "Margem abaixo da meta", message: `Margem média está em ${cur.averageMargin.toFixed(1)}%, meta mínima é ${settings.min_margin}%.` });
      }
      if (cur.averageRoas > 0 && cur.averageRoas < settings.min_roas) {
        list.push({ severity: "atencao", title: "ROAS abaixo do mínimo", message: `ROAS médio ${cur.averageRoas.toFixed(2)}x, mínimo definido ${settings.min_roas}x.` });
      }
      if (cur.grossRevenue > 0) {
        const adsPct = (cur.adsInvestment / cur.grossRevenue) * 100;
        if (adsPct > settings.max_ads_percent) {
          list.push({ severity: "atencao", title: "Ads consumindo muito do faturamento", message: `Ads representa ${adsPct.toFixed(1)}% do faturamento, teto configurado ${settings.max_ads_percent}%.` });
        }
      }
    }

    if (before.adsInvestment > 0) {
      const adsDelta = pctDelta(cur.adsInvestment, before.adsInvestment);
      if (adsDelta > 30) list.push({ severity: "atencao", title: "Custo de Ads subiu", message: `Investimento em Ads cresceu ${adsDelta.toFixed(0)}% em relação ao período anterior.` });
    }
    if (cur.grossRevenue > before.grossRevenue && cur.netProfit < before.netProfit) {
      list.push({ severity: "critico", title: "Faturamento cresceu mas lucro caiu", message: `Bruto: ${brl(cur.grossRevenue)} vs ${brl(before.grossRevenue)}. Lucro: ${brl(cur.netProfit)} vs ${brl(before.netProfit)}.` });
    }

    const ranking = productRanking(sales);
    ranking.filter((r) => r.profit < 0).slice(0, 3).forEach((r) => {
      list.push({ severity: "critico", title: `Produto no prejuízo: ${r.product_name}`, message: `Prejuízo acumulado de ${brl(r.profit)}. Considere pausar ou renegociar custo.` });
    });

    if (list.length === 0) {
      list.push({ severity: "info", title: "Nenhum alerta crítico", message: "Seus indicadores estão dentro dos limites configurados." });
    }
    return list;
  }, [sales, campaigns, settings]);

  return (
    <div className="space-y-3">
      {alerts.map((a, i) => {
        const Icon = ICONS[a.severity];
        return (
          <div key={i} className={cn("flex items-start gap-3 p-4 rounded-xl border", STYLES[a.severity])}>
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{a.title}</p>
              <p className="text-sm opacity-90">{a.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
