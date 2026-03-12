import { TrendingUp, DollarSign, Target, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";

type Platform = "shopee" | "mercadolivre";

const SHOPEE_COMMISSION_CAP = 105;

function getShopeeBaseFees(price: number) {
  if (price < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (price <= 79.99) return { commissionRate: 0.20, fixedFee: 4 };
  if (price <= 99.99) return { commissionRate: 0.14, fixedFee: 16 };
  if (price <= 199.99) return { commissionRate: 0.14, fixedFee: 20 };
  return { commissionRate: 0.14, fixedFee: 26 };
}

function getMercadoLivreFees() {
  return { commissionRate: 0.16, fixedFee: 6.50 };
}

export default function SimuladorPreco() {
  const [costPrice, setCostPrice] = useState("");
  const [targetMargin, setTargetMargin] = useState("30");
  const [shippingCost, setShippingCost] = useState("");
  const [taxRate, setTaxRate] = useState("7");
  const [platform, setPlatform] = useState<Platform>("shopee");

  const cost = parseFloat(costPrice) || 0;
  const margin = parseFloat(targetMargin) || 0;
  const shipping = parseFloat(shippingCost) || 0;
  const tax = parseFloat(taxRate) || 0;
  const hasInput = cost > 0;

  const results = useMemo(() => {
    if (!hasInput) return null;

    const fees = platform === "shopee" ? getShopeeBaseFees(cost * 2) : getMercadoLivreFees();
    const fixedCosts = cost + shipping + fees.fixedFee;
    const denom = 1 - fees.commissionRate - tax / 100 - margin / 100;
    const idealPrice = denom > 0 ? fixedCosts / denom : 0;

    const commission = platform === "shopee"
      ? Math.min(idealPrice * fees.commissionRate, SHOPEE_COMMISSION_CAP)
      : idealPrice * fees.commissionRate;
    const taxAmount = idealPrice * (tax / 100);
    const totalCosts = cost + shipping + fees.fixedFee + commission + taxAmount;
    const profit = idealPrice - totalCosts;

    // Strategic margins
    const calcPrice = (m: number) => {
      const d = 1 - fees.commissionRate - tax / 100 - m / 100;
      return d > 0 ? fixedCosts / d : 0;
    };

    return {
      idealPrice,
      commission,
      taxAmount,
      totalCosts,
      profit,
      fixedFee: fees.fixedFee,
      commissionRate: fees.commissionRate,
      margins: [
        { label: "Margem 30%", value: 30, price: calcPrice(30) },
        { label: "Margem 40%", value: 40, price: calcPrice(40) },
        { label: "Margem 50%", value: 50, price: calcPrice(50) },
      ],
    };
  }, [cost, margin, shipping, tax, platform, hasInput]);

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulador de Preco Ideal</h1>
          <p className="text-sm text-muted-foreground">Encontre o preco ideal para atingir a margem desejada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Parametros</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Plataforma</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={inputClass}>
              <option value="shopee">Shopee</option>
              <option value="mercadolivre">Mercado Livre</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Custo do Produto (R$)</label>
            <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0,00" className={inputClass} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Custo de Envio (R$)</label>
            <input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0,00" className={inputClass} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Aliquota de Impostos (%)</label>
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="7" className={inputClass} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Margem de Lucro Desejada (%)</label>
            <input type="number" value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} placeholder="30" className={inputClass} />
          </div>
        </div>

        {hasInput && results && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
              <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Preco Ideal de Venda</p>
              <p className="text-4xl font-bold text-primary mt-1">R$ {results.idealPrice.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">para {margin}% de margem</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h2 className="font-semibold text-foreground">Simulacao Detalhada</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Preco de Venda</span><span className="text-foreground font-medium">R$ {results.idealPrice.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Custo do Produto</span><span className="text-foreground">R$ {cost.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Custo de Envio</span><span className="text-foreground">R$ {shipping.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Comissao ({(results.commissionRate * 100).toFixed(0)}%)</span><span className="text-foreground">R$ {results.commission.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Taxa Fixa</span><span className="text-foreground">R$ {results.fixedFee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Impostos ({tax}%)</span><span className="text-foreground">R$ {results.taxAmount.toFixed(2)}</span></div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span className="text-foreground">Lucro Liquido</span>
                  <span className="text-emerald-600">R$ {results.profit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Strategic Prices */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground">Precos por Margem</h2>
              </div>
              <div className="space-y-2">
                {results.margins.map(m => (
                  <div key={m.value} className={`flex justify-between items-center px-3 py-2.5 rounded-lg ${m.value === 40 ? "bg-primary/5 border border-primary/20" : "bg-muted/20"}`}>
                    <div className="flex items-center gap-2">
                      {m.value === 40 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      <span className="text-sm text-foreground font-medium">{m.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${m.value === 40 ? "text-primary" : "text-foreground"}`}>R$ {m.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
