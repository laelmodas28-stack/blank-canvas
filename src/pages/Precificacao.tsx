import { Calculator, CheckCircle2, TrendingUp, BarChart3, Target } from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Platform = "mercadolivre" | "shopee";
type DocType = "cnpj" | "cpf";
type VendorType = "normal" | "indicado";

interface ScenarioResult {
  label: string;
  subtitle: string;
  commissionRate: number;
  fixedFee: number;
  commission: number;
  taxAmount: number;
  totalCosts: number;
  netProfit: number;
  margin: number;
  roi: number;
  breakEven: number;
  description: string;
}

// CNPJ fees (as specified by user - Shopee 2026)
function getShopeeCnpjNormalFees(price: number) {
  if (price < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (price < 80) return { commissionRate: 0.20, fixedFee: 0 };
  if (price < 100) return { commissionRate: 0.14, fixedFee: 16 };
  if (price < 200) return { commissionRate: 0.14, fixedFee: 20 };
  return { commissionRate: 0.14, fixedFee: 26 };
}

function getShopeeCnpjIndicadoFees(price: number) {
  // Indicado + Frete Grátis: +2% comissão, taxa fixa diferente
  if (price < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (price < 80) return { commissionRate: 0.22, fixedFee: 4 };
  if (price < 100) return { commissionRate: 0.16, fixedFee: 16 };
  if (price < 200) return { commissionRate: 0.16, fixedFee: 20 };
  return { commissionRate: 0.16, fixedFee: 26 };
}

// CPF fees (different fixed fees)
function getShopeeCpfNormalFees(price: number) {
  if (price < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (price < 80) return { commissionRate: 0.20, fixedFee: 10 };
  if (price < 100) return { commissionRate: 0.14, fixedFee: 16 };
  if (price < 200) return { commissionRate: 0.14, fixedFee: 20 };
  return { commissionRate: 0.14, fixedFee: 26 };
}

function getShopeeCpfIndicadoFees(price: number) {
  if (price < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (price < 80) return { commissionRate: 0.22, fixedFee: 4 };
  if (price < 100) return { commissionRate: 0.16, fixedFee: 16 };
  if (price < 200) return { commissionRate: 0.16, fixedFee: 20 };
  return { commissionRate: 0.16, fixedFee: 26 };
}

function getMercadoLivreFees(adType: "classico" | "premium") {
  if (adType === "classico") {
    return { commissionRate: 0.12, fixedFee: 6.50, description: "Anúncio Clássico: 10-14%. Parcelamento com juros para comprador. Custo operacional R$ 6,50." };
  }
  return { commissionRate: 0.17, fixedFee: 6.50, description: "Anúncio Premium: 15-19%. Parcelamento sem juros até 12x. Custo operacional R$ 6,50." };
}

function calcScenario(
  salePrice: number, costProduct: number, taxRate: number,
  frete: number, embalagem: number, outrosCustos: number, ads: number,
  commissionRate: number, fixedFee: number,
  label: string, subtitle: string, description: string
): ScenarioResult {
  const commission = salePrice * commissionRate;
  const taxAmount = salePrice * (taxRate / 100);
  const totalCosts = costProduct + commission + fixedFee + taxAmount + frete + embalagem + outrosCustos + ads;
  const netProfit = salePrice - totalCosts;
  const margin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  const roi = costProduct > 0 ? (netProfit / costProduct) * 100 : 0;
  const fixedCosts = costProduct + frete + embalagem + outrosCustos + ads + fixedFee;
  const denominator = 1 - commissionRate - taxRate / 100;
  const breakEven = denominator > 0 ? fixedCosts / denominator : 0;
  return { label, subtitle, commissionRate, fixedFee, commission, taxAmount, totalCosts, netProfit, margin, roi, breakEven, description };
}

const COLORS = ["hsl(220, 70%, 55%)", "hsl(0, 70%, 55%)", "hsl(200, 70%, 45%)", "hsl(45, 80%, 50%)"];

function ToggleGroup({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</h3>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${value === o.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Precificacao() {
  const [platform, setPlatform] = useState<Platform>("shopee");
  const [docType, setDocType] = useState<DocType>("cnpj");
  const [vendorType, setVendorType] = useState<VendorType>("normal");
  const [freteGratis, setFreteGratis] = useState("sim");
  const [shopeeAcelera, setShopeeAcelera] = useState("nao");
  const [adType, setAdType] = useState<"classico" | "premium">("classico");
  const [mercadoFull, setMercadoFull] = useState(false);

  const [costPrice, setCostPrice] = useState("18");
  const [salePrice, setSalePrice] = useState("49.90");
  const [taxRate, setTaxRate] = useState("7");
  const [targetMargin, setTargetMargin] = useState("25");
  const [frete, setFrete] = useState("0");
  const [embalagem, setEmbalagem] = useState("0");
  const [outrosCustos, setOutrosCustos] = useState("0");
  const [ads, setAds] = useState("0");

  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const tax = parseFloat(taxRate) || 0;
  const freteVal = parseFloat(frete) || 0;
  const embalagemVal = parseFloat(embalagem) || 0;
  const outrosVal = parseFloat(outrosCustos) || 0;
  const adsVal = parseFloat(ads) || 0;

  const getShopeeNormalFees = docType === "cnpj" ? getShopeeCnpjNormalFees : getShopeeCpfNormalFees;
  const getShopeeIndicadoFees = docType === "cnpj" ? getShopeeCnpjIndicadoFees : getShopeeCpfIndicadoFees;

  const scenarios = useMemo(() => {
    if (platform === "shopee") {
      const normal = getShopeeNormalFees(sale);
      const indicado = getShopeeIndicadoFees(sale);
      const normalDesc = `Vendedor Normal: comissão ${(normal.commissionRate * 100).toFixed(0)}% + taxa fixa R$ ${normal.fixedFee.toFixed(2)}.\nComissão NÃO incide sobre valor do frete.`;
      const indicadoDesc = `Vendedor Indicado + Frete Grátis: comissão ${(indicado.commissionRate * 100).toFixed(0)}% (${(normal.commissionRate * 100).toFixed(0)}% + 2% programa) + taxa fixa R$ ${indicado.fixedFee.toFixed(2)}.`;
      return [
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal, normal.commissionRate, normal.fixedFee, "Shopee", "Normal (sem Frete Grátis)", normalDesc),
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal, indicado.commissionRate, indicado.fixedFee, "Shopee", "Indicado + Frete Grátis", indicadoDesc),
      ];
    } else {
      const classico = getMercadoLivreFees("classico");
      const premium = getMercadoLivreFees("premium");
      return [
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal, classico.commissionRate, classico.fixedFee, "Mercado Livre", "Clássico", classico.description),
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal, premium.commissionRate, premium.fixedFee, "Mercado Livre", "Premium", premium.description),
      ];
    }
  }, [platform, docType, sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal]);

  const bestIdx = scenarios[0].netProfit >= scenarios[1].netProfit ? 0 : 1;
  const best = scenarios[bestIdx];
  const hasInput = cost > 0 && sale > 0;

  const suggestPrices = useMemo(() => {
    const fees = platform === "shopee" ? getShopeeNormalFees(sale) : getMercadoLivreFees("classico");
    const fixedCosts = cost + freteVal + embalagemVal + outrosVal + adsVal + fees.fixedFee;
    const denom5 = 1 - fees.commissionRate - tax / 100 - 0.05;
    const denom25 = 1 - fees.commissionRate - tax / 100 - 0.25;
    const denom40 = 1 - fees.commissionRate - tax / 100 - 0.40;
    return {
      min: denom5 > 0 ? fixedCosts / denom5 : 0,
      recommended: denom25 > 0 ? fixedCosts / denom25 : 0,
      high: denom40 > 0 ? fixedCosts / denom40 : 0,
    };
  }, [platform, docType, sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal]);

  const pieData = hasInput ? [
    { name: "Produto", value: cost },
    { name: "Comissão", value: best.commission },
    { name: "Taxa Fixa", value: best.fixedFee },
    { name: "Impostos", value: best.taxAmount },
  ].filter(d => d.value > 0) : [];

  const barData = hasInput ? scenarios.map(s => ({
    name: `${s.label} ${s.subtitle}`,
    Lucro: parseFloat(s.netProfit.toFixed(2)),
    Custos: parseFloat(s.totalCosts.toFixed(2)),
  })) : [];

  const analysisTexts = useMemo(() => {
    if (!hasInput) return [];
    const texts: string[] = [];
    texts.push(`O plano ${best.label} ${best.subtitle} oferece o melhor lucro de R$ ${best.netProfit.toFixed(2)} com margem de ${best.margin.toFixed(2)}%.`);
    if (scenarios.every(s => s.margin > 10)) texts.push("Margem saudável em todos os planos. Precificação adequada para operação lucrativa.");
    else if (scenarios.some(s => s.margin < 0)) texts.push("Atenção: pelo menos um cenário resulta em prejuízo. Revise os custos ou aumente o preço.");
    else texts.push("Margem baixa em algum cenário. Considere otimizar custos.");
    return texts;
  }, [hasInput, scenarios, bestIdx]);

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calculadora de Lucro</h1>
          <p className="text-sm text-muted-foreground">Simule cenários reais de venda e calcule o lucro líquido por plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN */}
        <div className="xl:col-span-4 space-y-5">
          {/* Platform & Options */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <ToggleGroup label="Plataforma" value={platform} onChange={v => setPlatform(v as Platform)} options={[
              { value: "mercadolivre", label: "Mercado Livre" },
              { value: "shopee", label: "Shopee" },
            ]} />

            {platform === "shopee" && (
              <>
                <ToggleGroup label="Documento" value={docType} onChange={v => setDocType(v as DocType)} options={[
                  { value: "cnpj", label: "CNPJ" },
                  { value: "cpf", label: "CPF" },
                ]} />
                <ToggleGroup label="Tipo de Vendedor" value={vendorType} onChange={v => setVendorType(v as VendorType)} options={[
                  { value: "normal", label: "Normal" },
                  { value: "indicado", label: "Indicado" },
                ]} />
                <ToggleGroup label="Frete Grátis" value={freteGratis} onChange={setFreteGratis} options={[
                  { value: "sim", label: "Sim" },
                  { value: "nao", label: "Não" },
                ]} />
                <ToggleGroup label="Shopee Acelera" value={shopeeAcelera} onChange={setShopeeAcelera} options={[
                  { value: "sim", label: "Sim" },
                  { value: "nao", label: "Não" },
                ]} />
              </>
            )}

            {platform === "mercadolivre" && (
              <>
                <ToggleGroup label="Tipo de Anúncio" value={adType} onChange={v => setAdType(v as "classico" | "premium")} options={[
                  { value: "classico", label: "Clássico" },
                  { value: "premium", label: "Premium" },
                ]} />
                <ToggleGroup label="Mercado Envios Full" value={mercadoFull ? "sim" : "nao"} onChange={v => setMercadoFull(v === "sim")} options={[
                  { value: "sim", label: "Sim" },
                  { value: "nao", label: "Não" },
                ]} />
              </>
            )}
          </div>

          {/* Product Costs */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Custos do Produto</h3>
            {[
              { label: "Custo do Produto (R$)", value: costPrice, setter: setCostPrice, icon: "💲" },
              { label: "Preço de Venda (R$)", value: salePrice, setter: setSalePrice, icon: "$" },
              { label: "Alíquota de Impostos (%)", value: taxRate, setter: setTaxRate, icon: "%" },
              { label: "Margem Desejada (%)", value: targetMargin, setter: setTargetMargin, icon: "◎" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-sm text-muted-foreground block mb-1">{f.label}</label>
                <input type="number" value={f.value} onChange={e => f.setter(e.target.value)} placeholder="0" className={inputClass} />
              </div>
            ))}
          </div>

          {/* Additional Costs */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Custos Adicionais</h3>
            {[
              { label: "Frete (R$)", value: frete, setter: setFrete },
              { label: "Embalagem (R$)", value: embalagem, setter: setEmbalagem },
              { label: "Outros Custos (R$)", value: outrosCustos, setter: setOutrosCustos },
              { label: "Investimento em Ads (R$)", value: ads, setter: setAds },
            ].map(f => (
              <div key={f.label}>
                <label className="text-sm text-muted-foreground block mb-1">{f.label}</label>
                <input type="number" value={f.value} onChange={e => f.setter(e.target.value)} placeholder="0" className={inputClass} />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="xl:col-span-8 space-y-5">
          {hasInput && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                  <p className={`text-xl font-bold mt-1 ${best.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {best.netProfit.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{best.subtitle}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Margem de Lucro</p>
                  <p className={`text-xl font-bold mt-1 ${best.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>{best.margin.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sobre o preço de venda</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Custo Total</p>
                  <p className="text-xl font-bold mt-1 text-foreground">R$ {best.totalCosts.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{((best.totalCosts / sale) * 100).toFixed(1)}% do preço</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Break-even</p>
                  <p className="text-xl font-bold mt-1 text-foreground">R$ {best.breakEven.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Preço mínimo sem prejuízo</p>
                </div>
              </div>

              {/* Plan Comparison */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Comparação de Planos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scenarios.map((s, i) => (
                    <div key={i} className={`bg-card border rounded-xl p-5 relative ${i === bestIdx ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
                      {i === bestIdx && (
                        <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                          Melhor Opção
                        </span>
                      )}
                      <h4 className="font-bold text-foreground text-lg">{s.label}</h4>
                      <p className="text-sm text-muted-foreground">{s.subtitle}</p>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Preço de Venda</span><span className="font-medium text-foreground">R$ {sale.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Custo do Produto</span><span className="text-foreground">- R$ {cost.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Comissão ({(s.commissionRate * 100).toFixed(2)}%)</span><span className="text-foreground">- R$ {s.commission.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Taxa Fixa</span><span className="text-foreground">- R$ {s.fixedFee.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Impostos ({tax.toFixed(2)}%)</span><span className="text-foreground">- R$ {s.taxAmount.toFixed(2)}</span></div>
                      </div>

                      <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-foreground">Lucro Líquido</span>
                        <span className={`text-xl font-bold ${s.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {s.netProfit.toFixed(2)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem</p>
                          <p className={`text-lg font-bold ${s.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>{s.margin.toFixed(2)}%</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI</p>
                          <p className={`text-lg font-bold ${s.roi >= 0 ? "text-emerald-600" : "text-destructive"}`}>{s.roi.toFixed(2)}%</p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between text-sm bg-muted/20 rounded-lg px-3 py-2">
                        <span className="text-muted-foreground">Break-even</span>
                        <span className="font-semibold text-foreground">R$ {s.breakEven.toFixed(2)}</span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3 whitespace-pre-line">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Distribuição de Custos</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Legend iconType="square" iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Lucro por Plano</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                      <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Bar dataKey="Lucro" fill="hsl(150, 60%, 40%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Custos" fill="hsl(0, 65%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Smart Price Suggestion */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sugestão Inteligente de Preço</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/20 border border-border rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Preço Mínimo Lucrativo</p>
                    <p className="text-2xl font-bold text-foreground mt-1">R$ {suggestPrices.min.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Margem: 5,00% | Lucro: R$ {(suggestPrices.min * 0.05).toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 relative">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Preço Recomendado</p>
                    <p className="text-2xl font-bold text-primary mt-1">R$ {suggestPrices.recommended.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Margem: 25,00% | Lucro: R$ {(suggestPrices.recommended * 0.25).toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary font-medium">Recomendado</span>
                    </div>
                  </div>
                  <div className="bg-muted/20 border border-border rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Preço de Alta Margem</p>
                    <p className="text-2xl font-bold text-foreground mt-1">R$ {suggestPrices.high.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Margem: 40,00% | Lucro: R$ {(suggestPrices.high * 0.40).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise da Precificação</h3>
                </div>
                <div className="space-y-2">
                  {analysisTexts.map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!hasInput && (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Preencha o custo do produto e o preço de venda para ver os resultados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
