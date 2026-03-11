import { Calculator, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

type Platform = "shopee" | "mercadolivre";

interface PlatformFees {
  commissionRate: number;
  fixedFee: number;
  label: string;
}

const platformData: Record<Platform, PlatformFees> = {
  shopee: { commissionRate: 0.20, fixedFee: 3.0, label: "Shopee" },
  mercadolivre: { commissionRate: 0.16, fixedFee: 5.0, label: "Mercado Livre" },
};

export default function Precificacao() {
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [platform, setPlatform] = useState<Platform>("shopee");

  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const shipping = parseFloat(shippingCost) || 0;
  const tax = parseFloat(taxRate) || 0;

  const fees = platformData[platform];
  const platformFee = sale * fees.commissionRate;
  const fixedFee = fees.fixedFee;
  const taxAmount = sale * (tax / 100);
  const totalCosts = cost + shipping + platformFee + fixedFee + taxAmount;
  const netProfit = sale - totalCosts;
  const profitMargin = sale > 0 ? (netProfit / sale) * 100 : 0;

  const breakEvenPrice = cost + shipping + fixedFee + (cost + shipping + fixedFee) * fees.commissionRate / (1 - fees.commissionRate - tax / 100);
  const recommendedPrice = breakEvenPrice * 1.3;

  const hasInput = cost > 0 && sale > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calculadora de Precificação</h1>
          <p className="text-sm text-muted-foreground">Calcule lucros e margens para seus produtos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Dados do Produto</h2>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Plataforma de Venda</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            >
              <option value="shopee">Shopee</option>
              <option value="mercadolivre">Mercado Livre</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Custo do Produto (R$)</label>
            <input
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Preço de Venda (R$)</label>
            <input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Custo de Envio (R$)</label>
            <input
              type="number"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Alíquota de Impostos (%)</label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <h2 className="font-semibold text-foreground">Detalhamento de Custos</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Custo do Produto</span><span className="text-foreground">R$ {cost.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Custo de Envio</span><span className="text-foreground">R$ {shipping.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa {fees.label} ({(fees.commissionRate * 100).toFixed(0)}%)</span><span className="text-foreground">R$ {platformFee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa Fixa</span><span className="text-foreground">R$ {fixedFee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Impostos ({tax}%)</span><span className="text-foreground">R$ {taxAmount.toFixed(2)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span className="text-foreground">Custos Totais</span>
                <span className="text-foreground">R$ {totalCosts.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {hasInput && (
            <>
              <div className={`rounded-xl p-6 border ${netProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-destructive/5 border-destructive/20'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {netProfit >= 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  <h2 className="font-semibold text-foreground">Resultado</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      R$ {netProfit.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Margem de Lucro</p>
                    <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                <h2 className="font-semibold text-foreground">Preços Recomendados</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Preço Mínimo (sem prejuízo)</p>
                    <p className="text-lg font-bold text-foreground">R$ {breakEvenPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preço Recomendado (30% lucro)</p>
                    <p className="text-lg font-bold text-primary">R$ {recommendedPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
