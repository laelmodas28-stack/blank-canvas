import { useMemo, useState } from "react";
import { useFinanceFeeRule } from "../hooks/useFinanceData";
import { calculateFreightSplit, DEFAULT_SHOPEE_2026_RULES, type FeeRules } from "../lib/feeEngine";
import { Truck } from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ShippingIncentives() {
  const { rule } = useFinanceFeeRule();
  const rules: FeeRules = (rule?.rules as unknown as FeeRules) ?? DEFAULT_SHOPEE_2026_RULES;
  const [price, setPrice] = useState(89.9);
  const [coupon, setCoupon] = useState(30);
  const split = useMemo(() => calculateFreightSplit(price, coupon, rules), [price, coupon, rules]);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Simulador Programa Frete Grátis</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <label>
            <span className="text-xs text-muted-foreground">Preço do produto (R$)</span>
            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background" />
          </label>
          <label>
            <span className="text-xs text-muted-foreground">Cupom aplicado (R$)</span>
            <input type="number" value={coupon} onChange={(e) => setCoupon(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background" />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Cupom efetivo</p>
            <p className="text-lg font-semibold">{brl(split.coupon)}</p>
            <p className="text-xs text-muted-foreground mt-1">Máx. da faixa: {brl(split.tier.couponMax)}</p>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400">
            <p className="text-xs">Vendedor paga ({split.sellerPercent.toFixed(0)}%)</p>
            <p className="text-lg font-semibold">{brl(split.sellerPays)}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <p className="text-xs">Shopee absorve</p>
            <p className="text-lg font-semibold">{brl(split.platformPays)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Faixas atuais</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">Faixa de preço</th>
                <th className="text-right p-3">Cupom máximo</th>
                <th className="text-right p-3">Vendedor</th>
                <th className="text-right p-3">Plataforma</th>
              </tr>
            </thead>
            <tbody>
              {rules.freight.map((f, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3">{i === 0 ? "Até R$79,99" : f.maxPrice ? `Até R$${f.maxPrice.toFixed(2).replace(".", ",")}` : "Acima de R$200"}</td>
                  <td className="p-3 text-right">{brl(f.couponMax)}</td>
                  <td className="p-3 text-right">{(f.sellerShare * 100).toFixed(0)}%</td>
                  <td className="p-3 text-right">{((1 - f.sellerShare) * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
