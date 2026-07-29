// KPIs and period comparisons for the finance module.
import type { Tables } from "@/integrations/supabase/types";

export type Sale = Tables<"finance_sales">;
export type AdsCampaign = Tables<"finance_ads_campaigns">;

export type PeriodKey = "day" | "week" | "biweek" | "month" | "custom";

export function periodRange(period: PeriodKey, ref = new Date(), customStart?: Date, customEnd?: Date) {
  const end = new Date(ref);
  end.setHours(23, 59, 59, 999);
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  switch (period) {
    case "day":
      break;
    case "week":
      start.setDate(start.getDate() - 6);
      break;
    case "biweek":
      start.setDate(start.getDate() - 14);
      break;
    case "month":
      start.setDate(start.getDate() - 29);
      break;
    case "custom":
      if (customStart) start.setTime(customStart.getTime());
      if (customEnd) end.setTime(customEnd.getTime());
      break;
  }
  return { start, end };
}

export function previousRange(start: Date, end: Date) {
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span);
  return { start: prevStart, end: prevEnd };
}

const inRange = (s: Sale, start: Date, end: Date) => {
  const d = new Date(s.sale_date);
  return d >= start && d <= end;
};

export interface KPIs {
  grossRevenue: number;
  netRevenue: number;
  netProfit: number;
  orders: number;
  itemsSold: number;
  averageTicket: number;
  averageMargin: number;
  adsInvestment: number;
  averageRoas: number;
  cmv: number;
}

export function computeKPIs(sales: Sale[], campaigns: AdsCampaign[], start: Date, end: Date): KPIs {
  const filtered = sales.filter((s) => inRange(s, start, end));
  const grossRevenue = filtered.reduce((a, s) => a + Number(s.gross_price) * s.quantity - Number(s.discount), 0);
  const netRevenue = filtered.reduce((a, s) => a + Number(s.net_revenue), 0);
  const netProfit = filtered.reduce((a, s) => a + Number(s.net_profit), 0);
  const orders = filtered.length;
  const itemsSold = filtered.reduce((a, s) => a + s.quantity, 0);
  const cmv = filtered.reduce((a, s) => a + Number(s.product_cost), 0);
  const adsFromSales = filtered.reduce((a, s) => a + Number(s.ads_cost), 0);
  const campaignsInRange = campaigns.filter((c) => {
    if (!c.start_date) return false;
    const d = new Date(c.start_date);
    return d >= start && d <= end;
  });
  const adsFromCampaigns = campaignsInRange.reduce((a, c) => a + Number(c.investment), 0);
  const adsInvestment = adsFromSales + adsFromCampaigns;
  const campaignRevenue = campaignsInRange.reduce((a, c) => a + Number(c.revenue), 0);
  const averageRoas = adsFromCampaigns > 0 ? campaignRevenue / adsFromCampaigns : 0;
  return {
    grossRevenue: round(grossRevenue),
    netRevenue: round(netRevenue),
    netProfit: round(netProfit),
    orders,
    itemsSold,
    averageTicket: orders ? round(grossRevenue / orders) : 0,
    averageMargin: grossRevenue > 0 ? round((netProfit / grossRevenue) * 100) : 0,
    adsInvestment: round(adsInvestment),
    averageRoas: round(averageRoas),
    cmv: round(cmv),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

export interface DailyPoint {
  date: string;
  gross: number;
  net: number;
  profit: number;
  orders: number;
}

export function dailySeries(sales: Sale[], start: Date, end: Date): DailyPoint[] {
  const buckets = new Map<string, DailyPoint>();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, gross: 0, net: 0, profit: 0, orders: 0 });
  }
  sales.filter((s) => inRange(s, start, end)).forEach((s) => {
    const key = s.sale_date;
    const b = buckets.get(key);
    if (!b) return;
    b.gross += Number(s.gross_price) * s.quantity - Number(s.discount);
    b.net += Number(s.net_revenue);
    b.profit += Number(s.net_profit);
    b.orders += 1;
  });
  return Array.from(buckets.values()).map((p) => ({
    ...p,
    gross: round(p.gross),
    net: round(p.net),
    profit: round(p.profit),
  }));
}

export interface ProductRankRow {
  product_name: string;
  sku: string | null;
  units: number;
  revenue: number;
  profit: number;
  margin: number;
  status: "escalar" | "ajustar" | "pausar";
}

export function productRanking(sales: Sale[]): ProductRankRow[] {
  const map = new Map<string, ProductRankRow>();
  sales.forEach((s) => {
    const key = (s.sku ?? "") + "|" + s.product_name;
    const cur = map.get(key) ?? {
      product_name: s.product_name,
      sku: s.sku,
      units: 0,
      revenue: 0,
      profit: 0,
      margin: 0,
      status: "ajustar" as const,
    };
    cur.units += s.quantity;
    cur.revenue += Number(s.gross_price) * s.quantity - Number(s.discount);
    cur.profit += Number(s.net_profit);
    map.set(key, cur);
  });
  const rows = Array.from(map.values()).map((r) => {
    r.margin = r.revenue > 0 ? round((r.profit / r.revenue) * 100) : 0;
    r.revenue = round(r.revenue);
    r.profit = round(r.profit);
    if (r.profit < 0) r.status = "pausar";
    else if (r.margin >= 20) r.status = "escalar";
    else r.status = "ajustar";
    return r;
  });
  return rows.sort((a, b) => b.profit - a.profit);
}

export function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round(((current - previous) / Math.abs(previous)) * 100);
}
