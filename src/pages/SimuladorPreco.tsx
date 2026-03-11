import { TrendingUp, DollarSign } from "lucide-react";
import { useState } from "react";

export default function SimuladorPreco() {
  const [costPrice, setCostPrice] = useState("");
  const [targetMargin, setTargetMargin] = useState("30");
  const [shippingCost, setShippingCost] = useState("");
  const [taxRate, setTaxRate] = useState("6");
  const [platform, setPlatform] = useState("shopee");

  const cost = parseFloat(costPrice) || 0;
  const margin = parseFloat(targetMargin) || 0;
  const shipping = parseFloat(shippingCost) || 0;
  const tax = parseFloat(taxRate) || 0;

  const commissionRate = platform === "shopee" ? 0.20 : 0.16;
  const fixedFee = platform === "shopee" ? 3.0 : 5.0;

  // idealPrice = (cost + shipping + fixedFee) / (1 - commissionRate - tax/100 - margin/100)
  const denominator = 1 - commissionRate - tax / 100 - margin / 100;
  const idealPrice = denominator > 0 ? (cost + shipping + fixedFee) / denominator : 0;

  const platformFee = idealPrice * commissionRate;
  const taxAmount = idealPrice * (tax / 100);
  const totalCosts = cost + shipping + fixedFee + platformFee + taxAmount;
  const profit = idealPrice - totalCosts;

  const hasInput = cost > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulador de Preço Ideal</h1>
          <p className="text-sm text-muted-foreground">Encontre o preço ideal para atingir a margem desejada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Parâmetros</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Plataforma</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
              <option value="shopee">Shopee</option>
              <option value="mercadolivre">Mercado Livre</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Custo do Produto (R$)</label>
            <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Custo de Envio (R$)</label>
            <input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Alíquota de Impostos (%)</label>
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="6" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Margem de Lucro Desejada (%)</label>
            <input type="number" value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} placeholder="30" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
        </div>

        {hasInput && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
              <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Preço Ideal de Venda</p>
              <p className="text-4xl font-bold text-primary mt-1">R$ {idealPrice.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">para {margin}% de margem</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h2 className="font-semibold text-foreground">Simulação Detalhada</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Preço de Venda</span><span className="text-foreground font-medium">R$ {idealPrice.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Custo do Produto</span><span className="text-foreground">R$ {cost.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Custo de Envio</span><span className="text-foreground">R$ {shipping.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Taxa da Plataforma</span><span className="text-foreground">R$ {platformFee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Taxa Fixa</span><span className="text-foreground">R$ {fixedFee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">(-) Impostos</span><span className="text-foreground">R$ {taxAmount.toFixed(2)}</span></div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span className="text-foreground">Lucro Líquido</span>
                  <span className="text-emerald-500">R$ {profit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
