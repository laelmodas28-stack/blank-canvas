import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type PricingInput, type PriceResult } from "../lib/engine";
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const percent = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
export function PriceBreakdown({ result, input }: { result: PriceResult; input: PricingInput }) {
  const costs = [
    { key: "product", name: "Custo do produto", value: input.cost },
    { key: "fees", name: "Comissão e tarifa", value: result.commission + result.fixed + result.variable + result.extra },
    { key: "freight", name: "Frete", value: result.freight },
    { key: "ads", name: "Ads", value: result.adsAmount },
    { key: "tax", name: "Imposto", value: result.taxAmount },
    { key: "packaging", name: "Embalagem e etiqueta", value: input.packaging },
    { key: "profit", name: "Lucro", value: result.profit },
  ];
  const datum = Object.fromEntries(costs.map(c => [c.key, Math.max(0, c.value)]));
  return <><div className="h-7 w-full my-3" aria-label="Composição do preço"><ResponsiveContainer width="100%" height="100%"><BarChart data={[datum]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}><XAxis type="number" hide /><YAxis type="category" hide /><Tooltip formatter={(v: number) => brl(v)} />{costs.map(c => <Bar key={c.key} name={c.name} dataKey={c.key} stackId="price" fill={`hsl(var(--cost-${c.key}))`} />)}</BarChart></ResponsiveContainer></div><dl className="space-y-2 text-xs">{costs.map(c => <div key={c.key} className={`flex justify-between gap-3 ${c.key === "profit" ? "border-t border-border pt-3 font-semibold text-sm" : "text-muted-foreground"}`}><dt className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-sm cost-${c.key}`} />{c.name}</dt><dd className={c.key === "profit" ? result.profit >= 0 ? "text-success whitespace-nowrap" : "text-destructive whitespace-nowrap" : "text-foreground whitespace-nowrap"}>{brl(c.value)}</dd></div>)}</dl></>;
}
