import { useMemo, useState } from "react";
import { useFinanceSales, useFinanceAds, useFinanceSettings } from "../hooks/useFinanceData";
import { computeKPIs, dailySeries, periodRange, previousRange, pctDelta, type PeriodKey } from "../lib/aggregations";
import { DollarSign, TrendingUp, ShoppingBag, Percent, Megaphone, Package, ArrowUp, ArrowDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { cn } from "@/lib/utils";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toFixed(1)}%`;

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "day", label: "Hoje" },
  { id: "week", label: "7 dias" },
  { id: "biweek", label: "15 dias" },
  { id: "month", label: "30 dias" },
];

export function FinanceOverview() {
  const { sales } = useFinanceSales();
  const { campaigns } = useFinanceAds();
  const { settings } = useFinanceSettings();
  const [period, setPeriod] = useState<PeriodKey>("month");

  const { current, previous, series } = useMemo(() => {
    const { start, end } = periodRange(period);
    const prev = previousRange(start, end);
    return {
      current: computeKPIs(sales, campaigns, start, end),
      previous: computeKPIs(sales, campaigns, prev.start, prev.end),
      series: dailySeries(sales, start, end),
    };
  }, [sales, campaigns, period]);

  const cards = [
    { label: "Faturamento Bruto", value: brl(current.grossRevenue), prev: previous.grossRevenue, curr: current.grossRevenue, icon: DollarSign, color: "hsl(220 72% 50%)" },
    { label: "Receita Líquida", value: brl(current.netRevenue), prev: previous.netRevenue, curr: current.netRevenue, icon: TrendingUp, color: "hsl(160 60% 45%)" },
    { label: "Lucro Líquido", value: brl(current.netProfit), prev: previous.netProfit, curr: current.netProfit, icon: DollarSign, color: "hsl(280 60% 55%)" },
    { label: "Margem Média", value: pct(current.averageMargin), prev: previous.averageMargin, curr: current.averageMargin, icon: Percent, color: "hsl(40 90% 50%)" },
    { label: "Pedidos", value: current.orders.toString(), prev: previous.orders, curr: current.orders, icon: ShoppingBag, color: "hsl(200 70% 50%)" },
    { label: "Ticket Médio", value: brl(current.averageTicket), prev: previous.averageTicket, curr: current.averageTicket, icon: DollarSign, color: "hsl(340 65% 55%)" },
    { label: "Investimento Ads", value: brl(current.adsInvestment), prev: previous.adsInvestment, curr: current.adsInvestment, icon: Megaphone, color: "hsl(20 85% 55%)" },
    { label: "ROAS Médio", value: current.averageRoas.toFixed(2), prev: previous.averageRoas, curr: current.averageRoas, icon: TrendingUp, color: "hsl(140 55% 45%)" },
    { label: "CMV", value: brl(current.cmv), prev: previous.cmv, curr: current.cmv, icon: Package, color: "hsl(240 45% 55%)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm border transition-colors",
                period === p.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {settings && settings.monthly_revenue_goal > 0 && (
          <div className="text-xs text-muted-foreground">
            Meta mensal: {brl(settings.monthly_revenue_goal)} · Meta lucro: {brl(settings.monthly_profit_goal)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => {
          const delta = pctDelta(c.curr, c.prev);
          const up = delta >= 0;
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${c.color}15`, color: c.color }}>
                  <c.icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
              <p className="text-lg font-semibold text-foreground">{c.value}</p>
              <div className={cn("text-xs mt-1 flex items-center gap-1", up ? "text-emerald-600" : "text-rose-600")}>
                {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}% vs período anterior
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Faturamento x Lucro no período</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="gross" stroke="hsl(220 72% 50%)" name="Bruto" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="net" stroke="hsl(160 60% 45%)" name="Líquido" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" stroke="hsl(280 60% 55%)" name="Lucro" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Pedidos por dia</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(220 72% 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
