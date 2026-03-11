import { Calculator, CheckCircle2, TrendingUp, BarChart3, Target } from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Platform = "mercadolivre" | "shopee";

interface ShopeeResult {
  label: string;
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

function getShopeeNormalFees(salePrice: number): { commissionRate: number; fixedFee: number } {
  if (salePrice < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (salePrice < 80) return { commissionRate: 0.20, fixedFee: 0 };
  if (salePrice < 100) return { commissionRate: 0.14, fixedFee: 16 };
  if (salePrice < 200) return { commissionRate: 0.14, fixedFee: 20 };
  return { commissionRate: 0.14, fixedFee: 26 };
}

function getShopeeIndicadoFees(salePrice: number): { commissionRate: number; fixedFee: number } {
  // Indicado + Frete Grátis has slightly higher commission
  if (salePrice < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (salePrice < 80) return { commissionRate: 0.24, fixedFee: 0 };
  if (salePrice < 100) return { commissionRate: 0.18, fixedFee: 16 };
  if (salePrice < 200) return { commissionRate: 0.18, fixedFee: 20 };
  return { commissionRate: 0.18, fixedFee: 26 };
}

function getMercadoLivreFees(adType: "classico" | "premium"): { commissionRate: number; fixedFee: number; description: string } {
  if (adType === "classico") {
    return { commissionRate: 0.12, fixedFee: 6.50, description: "Anúncio Clássico: 10-14%. Parcelamento com juros para comprador. Custo operacional R$ 6,50." };
  }
  return { commissionRate: 0.17, fixedFee: 6.50, description: "Anúncio Premium: 15-19%. Parcelamento sem juros até 12x. Custo operacional R$ 6,50." };
}

function calcScenario(
  salePrice: number,
  costProduct: number,
  taxRate: number,
  frete: number,
  embalagem: number,
  outrosCustos: number,
  ads: number,
  commissionRate: number,
  fixedFee: number,
  label: string,
  description: string
): ShopeeResult {
  const commission = salePrice * commissionRate;
  const taxAmount = salePrice * (taxRate / 100);
  const totalCosts = costProduct + commission + fixedFee + taxAmount + frete + embalagem + outrosCustos + ads;
  const netProfit = salePrice - totalCosts;
  const margin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  const roi = costProduct > 0 ? (netProfit / costProduct) * 100 : 0;

  // Break-even: price where profit = 0
  const fixedCosts = costProduct + frete + embalagem + outrosCustos + ads + fixedFee;
  const denominator = 1 - commissionRate - taxRate / 100;
  const breakEven = denominator > 0 ? fixedCosts / denominator : 0;

  return { label, commissionRate, fixedFee, commission, taxAmount, totalCosts, netProfit, margin, roi, breakEven, description };
}

const COLORS = ["hsl(220, 70%, 55%)", "hsl(0, 70%, 55%)", "hsl(200, 70%, 45%)", "hsl(45, 80%, 50%)"];

export default function Precificacao() {
  const [platform, setPlatform] = useState<Platform>("mercadolivre");
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
  const marginTarget = parseFloat(targetMargin) || 0;

  const scenarios = useMemo(() => {
    if (platform === "shopee") {
      const normal = getShopeeNormalFees(sale);
      const indicado = getShopeeIndicadoFees(sale);
      return [
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal, normal.commissionRate, normal.fixedFee, "Shopee Normal", `Comissão ${(normal.commissionRate * 100).toFixed(0)}%. Taxa fixa R$ ${normal.fixedFee.toFixed(2)}.`),
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal, indicado.commissionRate, indicado.fixedFee, "Shopee Indicado + Frete Grátis", `Comissão ${(indicado.commissionRate * 100).toFixed(0)}%. Taxa fixa R$ ${indicado.fixedFee.toFixed(2)}. Inclui frete grátis.`),
      ];
    } else {
      const classico = getMercadoLivreFees("classico");
      const premium = getMercadoLivreFees("premium");
      return [
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal, classico.commissionRate, classico.fixedFee, "Mercado Livre\nClássico", classico.description),
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal, premium.commissionRate, premium.fixedFee, "Mercado Livre\nPremium", premium.description),
      ];
    }
  }, [platform, sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal]);

  const bestIdx = scenarios[0].netProfit >= scenarios[1].netProfit ? 0 : 1;
  const best = scenarios[bestIdx];
  const hasInput = cost > 0 && sale > 0;

  // Smart price suggestions
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
  }, [platform, sale, cost, tax, freteVal, embalagemVal, outrosVal, adsVal]);

  const suggestProfit = (price: number, marginPct: number) => price * marginPct;

  // Chart data
  const pieData = hasInput ? [
    { name: "Produto", value: cost },
    { name: "Comissão", value: best.commission },
    { name: "Taxa Fixa", value: best.fixedFee },
    { name: "Impostos", value: best.taxAmount },
  ].filter(d => d.value > 0) : [];

  const barData = hasInput ? scenarios.map(s => ({
    name: s.label.replace("\n", " "),
    Lucro: parseFloat(s.netProfit.toFixed(2)),
    Custos: parseFloat(s.totalCosts.toFixed(2)),
  })) : [];

  // Analysis text
  const analysisTexts = useMemo(() => {
    if (!hasInput) return [];
    const texts: string[] = [];
    const b = scenarios[bestIdx];
    texts.push(`O plano ${b.label.replace("\n", " ")} oferece o melhor lucro de R$ ${b.netProfit.toFixed(2)} com margem de ${b.margin.toFixed(2)}%.`);
    if (scenarios.every(s => s.margin > 10)) {
      texts.push("Margem saudável em todos os planos. Precificação adequada para operação lucrativa.");
    } else if (scenarios.some(s => s.margin < 0)) {
      texts.push("Atenção: pelo menos um cenário resulta em prejuízo. Revise os custos ou aumente o preço.");
    } else {
      texts.push("Margem baixa em algum cenário. Considere otimizar custos.");
    }
    return texts;
  }, [hasInput, scenarios, bestIdx]);

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
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
        {/* LEFT COLUMN - Inputs */}
        <div className="xl:col-span-4 space-y-5">
          {/* Platform */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Plataforma</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["mercadolivre", "shopee"] as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${platform === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                >
                  {p === "mercadolivre" ? "Mercado Livre" : "Shopee"}
                </button>
              ))}
            </div>

            {platform === "mercadolivre" && (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">Tipo de Anúncio</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(["classico", "premium"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setAdType(t)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${adType === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                    >
                      {t === "classico" ? "Clássico" : "Premium"}
                    </button>
                  ))}
                </div>

                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">Mercado Envios Full</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[true, false].map(v => (
                    <button
                      key={String(v)}
                      onClick={() => setMercadoFull(v)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${mercadoFull === v ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                    >
                      {v ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Product Costs */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Custos do Produto</h3>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Custo do Produto (R$)</label>
              <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0,00" className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Preço de Venda (R$)</label>
              <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0,00" className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Alíquota de Impostos (%)</label>
              <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Margem Desejada (%)</label>
              <input type="number" value={targetMargin} onChange={e => setTargetMargin(e.target.value)} placeholder="25" className={inputClass} />
            </div>
          </div>

          {/* Additional Costs */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Custos Adicionais</h3>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Frete (R$)</label>
              <input type="number" value={frete} onChange={e => setFrete(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Embalagem (R$)</label>
              <input type="number" value={embalagem} onChange={e => setEmbalagem(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Outros Custos (R$)</label>
              <input type="number" value={outrosCustos} onChange={e => setOutrosCustos(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Investimento em Ads (R$)</label>
              <input type="number" value={ads} onChange={e => setAds(e.target.value)} placeholder="0,00" className={inputClass} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Results */}
        <div className="xl:col-span-8 space-y-5">
          {hasInput && (
            <>
              {/* Top Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                  <p className={`text-xl font-bold mt-1 ${best.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    R$ {best.netProfit.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{best.label.replace("\n", " ")}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Margem de Lucro</p>
                  <p className={`text-xl font-bold mt-1 ${best.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {best.margin.toFixed(2)}%
                  </p>
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
                      <h4 className="font-bold text-foreground text-lg whitespace-pre-line">{s.label}</h4>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Preço de Venda</span><span className="font-medium text-foreground">R$ {sale.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Custo do Produto</span><span className="text-foreground">- R$ {cost.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Comissão ({(s.commissionRate * 100).toFixed(0)}%)</span><span className="text-foreground">- R$ {s.commission.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Taxa Fixa</span><span className="text-foreground">- R$ {s.fixedFee.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Impostos ({tax.toFixed(0)}%)</span><span className="text-foreground">- R$ {s.taxAmount.toFixed(2)}</span></div>
                      </div>

                      <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-foreground">Lucro Líquido</span>
                        <span className={`text-xl font-bold ${s.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                          R$ {s.netProfit.toFixed(2)}
                        </span>
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

                      <p className="text-xs text-muted-foreground mt-3">{s.description}</p>
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
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
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
                    <p className="text-xs text-muted-foreground mt-1">Margem: 5,00%&nbsp;&nbsp;Lucro: R$ {suggestProfit(suggestPrices.min, 0.05).toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 relative">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Preço Recomendado</p>
                    <p className="text-2xl font-bold text-primary mt-1">R$ {suggestPrices.recommended.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Margem: 25,00%&nbsp;&nbsp;Lucro: R$ {suggestProfit(suggestPrices.recommended, 0.25).toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary font-medium">Recomendado</span>
                    </div>
                  </div>
                  <div className="bg-muted/20 border border-border rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Preço de Alta Margem</p>
                    <p className="text-2xl font-bold text-foreground mt-1">R$ {suggestPrices.high.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Margem: 40,00%&nbsp;&nbsp;Lucro: R$ {suggestProfit(suggestPrices.high, 0.40).toFixed(2)}</p>
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
