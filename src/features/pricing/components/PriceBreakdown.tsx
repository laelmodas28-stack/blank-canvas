import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type PricingInput, type PriceResult } from "../lib/engine";
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const percent = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
export const profitLabel = (result: PriceResult, input: PricingInput) => result.missingShipping ? "Lucro (sem custo de envio)" : input.taxInformed === false || input.tax === 0 ? "Lucro antes do imposto" : "Lucro Líquido";
export function PriceBreakdown({ result, input }: { result: PriceResult; input: PricingInput }) {
  const costs = [
    { key: "product", name: "Custo do produto", value: input.cost },
    { key: "fees", name: "Comissão e taxas", value: result.commission + result.fixed + result.extra },
    { key: "freight", name: "Envio/frete", value: result.variable + result.freight },
    { key: "ads", name: "Ads", value: result.adsAmount },
    { key: "tax", name: "Imposto", value: result.taxAmount },
    { key: "packaging", name: "Embalagem e etiqueta", value: input.packaging },
    { key: "profit", name: "Lucro", value: result.profit },
  ];
  const datum = Object.fromEntries(costs.map((c,i) => [`${c.key}${i}`, Math.max(0,c.value)]));
  const row = (label: string, value: number, sign = "−", strong = false) => <div className={`flex justify-between gap-3 ${strong ? "border-t border-border pt-3 font-semibold text-sm" : "text-muted-foreground"}`}><dt>{label}</dt><dd className="text-foreground whitespace-nowrap">{sign} {brl(value)}</dd></div>;
  return <><div className="h-7 w-full my-3" aria-label="Composição do preço"><ResponsiveContainer width="100%" height="100%"><BarChart data={[datum]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}><XAxis type="number" hide /><YAxis type="category" hide /><Tooltip formatter={(v: number) => brl(v)} />{costs.map((c,i) => <Bar key={i} name={c.name} dataKey={`${c.key}${i}`} stackId="price" isAnimationActive={false} fill={`hsl(var(--cost-${c.key}))`} />)}</BarChart></ResponsiveContainer></div><h3 className="text-xs font-semibold my-3">REPASSE DA PLATAFORMA</h3><dl className="space-y-2 text-xs">{row("Preço de venda", result.price, "")}{row(`Comissão (${percent(result.basePercent)})`, result.commission)}{row("Taxa fixa", result.fixed)}{row(result.shippingKind === "unit" ? "Custo de envio por unidade" : "Frete a cargo do vendedor", result.variable + result.freight)}{row("Outras taxas", result.extra)}{row("Descontos e bônus", result.bonus, "+")}{row("VALOR A RECEBER", result.payout, "=", true)}</dl><h3 className="text-xs font-semibold my-3">LUCRO</h3><dl className="space-y-2 text-xs">{row("Valor a receber", result.payout, "")}{row("Custo do produto", input.cost)}{row("Imposto", result.taxAmount)}{row("Embalagem e etiqueta", input.packaging)}{row("Ads", result.adsAmount)}<div className="flex justify-between gap-3 border-t border-border pt-3 font-semibold text-sm"><dt>{profitLabel(result,input)}</dt><dd className={`whitespace-nowrap ${result.profit >= 0 ? "text-success" : "text-destructive"}`}>{brl(result.profit)}</dd></div></dl>{(input.taxInformed === false || input.tax === 0) && <span className="inline-block text-xs text-warning mt-2 border border-warning rounded px-2 py-1">sem imposto</span>}<p className="text-xs text-muted-foreground mt-3">Margem {percent(result.margin)} · ROI {percent(result.roi)}</p></>;
}
