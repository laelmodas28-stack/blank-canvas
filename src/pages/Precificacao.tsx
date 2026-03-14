import { Calculator, CheckCircle2, TrendingUp, BarChart3, AlertTriangle, ShieldAlert, Megaphone, DollarSign } from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── Types ─────────────────────────────────────────────────────
type Platform = "mercadolivre" | "shopee";
type DocType = "cpf" | "cnpj";
type SellerMode = "normal" | "indicado";

const SHOPEE_COMMISSION_CAP = 105;

// ── Shopee Brazil 2026 Fee Structure ──────────────────────────
function getShopeeBaseFees(price: number): { commissionRate: number; fixedFee: number } {
  if (price < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (price <= 79.99) return { commissionRate: 0.20, fixedFee: 4 };
  if (price <= 99.99) return { commissionRate: 0.14, fixedFee: 16 };
  if (price <= 199.99) return { commissionRate: 0.14, fixedFee: 20 };
  return { commissionRate: 0.14, fixedFee: 26 };
}

function buildCommissionRate(
  baseRate: number,
  freeShipping: boolean,
  shopeeAcelera: boolean
): number {
  let rate = baseRate;
  if (freeShipping) rate += 0.06;
  if (shopeeAcelera) rate -= 0.02;
  return Math.max(rate, 0);
}

function capCommission(price: number, rate: number): number {
  return Math.round(Math.min(price * rate, SHOPEE_COMMISSION_CAP) * 100) / 100;
}

// ── Mercado Livre ─────────────────────────────────────────────
function getMercadoLivreFees(adType: "classico" | "premium") {
  if (adType === "classico") return { commissionRate: 0.12, fixedFee: 6.50 };
  return { commissionRate: 0.17, fixedFee: 6.50 };
}

// ── Scenario Calculation ──────────────────────────────────────
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

function calcScenario(
  salePrice: number,
  costProduct: number,
  taxRate: number,
  commissionRate: number,
  fixedFee: number,
  useCap: boolean,
  label: string,
  subtitle: string,
  description: string
): ScenarioResult {
  const commission = useCap ? capCommission(salePrice, commissionRate) : Math.round(salePrice * commissionRate * 100) / 100;
  const taxAmount = Math.round(salePrice * (taxRate / 100) * 100) / 100;
  const totalCosts = Math.round((costProduct + commission + fixedFee + taxAmount) * 100) / 100;
  const netProfit = Math.round((salePrice - totalCosts) * 100) / 100;
  const margin = salePrice > 0 ? Math.round((netProfit / salePrice) * 10000) / 100 : 0;
  const roi = costProduct > 0 ? Math.round((netProfit / costProduct) * 10000) / 100 : 0;
  const breakEven = Math.round(totalCosts * 100) / 100;
  return { label, subtitle, commissionRate, fixedFee, commission, taxAmount, totalCosts, netProfit, margin, roi, breakEven, description };
}

// ── UI Components ─────────────────────────────────────────────
function ToggleGroup({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all text-center ${
            value === o.value
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-accent border border-border"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub, variant = "default", icon }: {
  label: string; value: string; sub?: string; variant?: "default" | "positive" | "negative" | "primary"; icon?: React.ReactNode;
}) {
  const colorMap = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-destructive",
    primary: "text-primary",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className={`text-xl font-bold mt-1 ${colorMap[variant]}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

const COLORS = ["hsl(220, 70%, 55%)", "hsl(0, 70%, 55%)", "hsl(200, 70%, 45%)", "hsl(45, 80%, 50%)"];

// ── Main Component ────────────────────────────────────────────
export default function Precificacao() {
  const [platform, setPlatform] = useState<Platform>("shopee");
  const [docType, setDocType] = useState<DocType>("cnpj");
  const [sellerMode, setSellerMode] = useState<SellerMode>("indicado");
  const [freeShipping, setFreeShipping] = useState(true);
  const [shopeeAcelera, setShopeeAcelera] = useState(true);
  const [mlAdType, setMlAdType] = useState<"classico" | "premium">("classico");

  const [costPrice, setCostPrice] = useState("10");
  const [salePrice, setSalePrice] = useState("29.90");
  const [taxRate, setTaxRate] = useState("7");
  const [desiredMargin, setDesiredMargin] = useState("");
  const [useMarginCalc, setUseMarginCalc] = useState(false);

  // New projection fields
  const [marketAvgPrice, setMarketAvgPrice] = useState("");
  const [targetROAS, setTargetROAS] = useState("");
  const [desiredROAS, setDesiredROAS] = useState("");
  const [estimatedSales, setEstimatedSales] = useState("");

  const cost = parseFloat(costPrice) || 0;
  const tax = parseFloat(taxRate) || 0;
  const marginTarget = parseFloat(desiredMargin) || 0;

  // Calculate ideal price from margin if enabled
  const calculatedSalePrice = useMemo(() => {
    if (!useMarginCalc || cost <= 0 || marginTarget <= 0 || marginTarget >= 100) return null;
    // We need: profit / salePrice = marginTarget/100
    // profit = salePrice - cost - commission - fixedFee - tax
    // salePrice - cost - salePrice*commRate - fixedFee - salePrice*taxRate/100 = salePrice * marginTarget/100
    // For iterative approach (commission depends on price):
    // Start with estimate and iterate
    let price = cost / (1 - marginTarget / 100); // initial estimate without fees
    for (let i = 0; i < 10; i++) {
      const base = getShopeeBaseFees(price);
      const rate = platform === "shopee"
        ? buildCommissionRate(base.commissionRate, freeShipping, shopeeAcelera)
        : getMercadoLivreFees(mlAdType).commissionRate;
      const ff = platform === "shopee" ? base.fixedFee : getMercadoLivreFees(mlAdType).fixedFee;
      const denom = 1 - rate - tax / 100 - marginTarget / 100;
      if (denom <= 0) return null;
      price = (cost + ff) / denom;
    }
    return Math.round(price * 100) / 100;
  }, [useMarginCalc, cost, marginTarget, tax, platform, freeShipping, shopeeAcelera, mlAdType]);

  const sale = useMarginCalc && calculatedSalePrice ? calculatedSalePrice : (parseFloat(salePrice) || 0);
  const hasInput = cost > 0 && sale > 0;

  const scenarios = useMemo(() => {
    if (platform === "shopee") {
      const base = getShopeeBaseFees(sale);
      const aceleraNote = shopeeAcelera ? " Shopee Acelera ativo: taxa reduzida de 2% por antecipação." : "";

      // Normal: no free shipping
      const normalRate = buildCommissionRate(base.commissionRate, false, shopeeAcelera);
      // Indicado + Frete Grátis
      const indicadoRate = buildCommissionRate(base.commissionRate, true, shopeeAcelera);

      return [
        calcScenario(sale, cost, tax, normalRate, base.fixedFee, true,
          "Shopee", "Normal (sem Frete Grátis)",
          `Vendedor Normal: comissão ${(normalRate * 100).toFixed(0)}% + taxa fixa R$ ${base.fixedFee.toFixed(2)}. Comissão NÃO incide sobre valor do frete.${aceleraNote}`
        ),
        calcScenario(sale, cost, tax, indicadoRate, base.fixedFee, true,
          "Shopee", "Indicado + Frete Grátis",
          `Vendedor indicado + Frete Gratis: comissão ${(indicadoRate * 100).toFixed(0)}% (${(base.commissionRate * 100).toFixed(0)}% + 6% programa) + taxa fixa R$ ${base.fixedFee.toFixed(2)}.${aceleraNote}`
        ),
      ];
    }

    const classico = getMercadoLivreFees("classico");
    const premium = getMercadoLivreFees("premium");
    return [
      calcScenario(sale, cost, tax, classico.commissionRate, classico.fixedFee, false,
        "Mercado Livre", "Clássico", `Anúncio Clássico: ${(classico.commissionRate * 100).toFixed(0)}% comissão + R$ ${classico.fixedFee.toFixed(2)}.`),
      calcScenario(sale, cost, tax, premium.commissionRate, premium.fixedFee, false,
        "Mercado Livre", "Premium", `Anúncio Premium: ${(premium.commissionRate * 100).toFixed(0)}% comissão + R$ ${premium.fixedFee.toFixed(2)}. Parcelamento sem juros.`),
    ];
  }, [platform, sale, cost, tax, shopeeAcelera]);

  const bestIdx = scenarios[0].netProfit >= scenarios[1].netProfit ? 0 : 1;
  const best = scenarios[bestIdx];

  // ROAS
  const adMetrics = useMemo(() => {
    if (!hasInput || best.netProfit <= 0) return null;
    const maxAdCost = best.netProfit;
    const minROAS = Math.round((sale / maxAdCost) * 100) / 100;
    const recommendedAdSpend = Math.round(best.netProfit * 0.4 * 100) / 100;
    const roasLevels = [2, 3, 4, 5].map(roas => {
      const adCostPerSale = Math.round((sale / roas) * 100) / 100;
      const profitAfterAds = Math.round((best.netProfit - adCostPerSale) * 100) / 100;
      const marginAfterAds = sale > 0 ? Math.round((profitAfterAds / sale) * 10000) / 100 : 0;
      return { roas, adCostPerSale, profitAfterAds, marginAfterAds };
    });
    return { maxAdCost, minROAS, recommendedAdSpend, roasLevels };
  }, [hasInput, best, sale]);

  // Decision Indicators
  const indicators = useMemo(() => {
    if (!hasInput) return [];
    const items: { label: string; type: "positive" | "warning" | "negative"; icon: React.ReactNode }[] = [];
    if (best.margin >= 30) items.push({ label: "Alta oportunidade de lucro", type: "positive", icon: <TrendingUp className="h-4 w-4" /> });
    else if (best.margin >= 15) items.push({ label: "Margem saudável", type: "positive", icon: <CheckCircle2 className="h-4 w-4" /> });
    else if (best.margin >= 5) items.push({ label: "Margem baixa — considere ajustar preço", type: "warning", icon: <AlertTriangle className="h-4 w-4" /> });
    else items.push({ label: "Risco de prejuízo — revise custos ou preço", type: "negative", icon: <ShieldAlert className="h-4 w-4" /> });
    if (adMetrics && adMetrics.minROAS <= 3) items.push({ label: "Produto viável para anúncios", type: "positive", icon: <Megaphone className="h-4 w-4" /> });
    else if (adMetrics && adMetrics.minROAS > 5) items.push({ label: "ROAS alto — anúncios arriscados", type: "warning", icon: <Megaphone className="h-4 w-4" /> });
    return items;
  }, [hasInput, best, adMetrics]);

  // Chart data
  const pieData = hasInput ? [
    { name: "Produto", value: cost },
    { name: "Comissão", value: best.commission },
    { name: "Taxa Fixa", value: best.fixedFee },
    { name: "Impostos", value: best.taxAmount },
  ].filter(d => d.value > 0) : [];

  const barData = hasInput ? scenarios.map(s => ({
    name: s.subtitle.length > 18 ? s.subtitle.slice(0, 16) + "…" : s.subtitle,
    Lucro: parseFloat(s.netProfit.toFixed(2)),
    Custos: parseFloat(s.totalCosts.toFixed(2)),
  })) : [];

  const indicatorColors = {
    positive: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    negative: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Calculadora de Precificação</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Calcule lucro real, ROAS e encontre o preço ideal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ── LEFT: Configuration ── */}
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            {/* Platform */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Plataforma</label>
              <ToggleGroup value={platform} onChange={v => setPlatform(v as Platform)} options={[
                { value: "mercadolivre", label: "Mercado Livre" },
                { value: "shopee", label: "Shopee" },
              ]} />
            </div>

            {/* Document */}
            {platform === "shopee" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Documento</label>
                <ToggleGroup value={docType} onChange={v => setDocType(v as DocType)} options={[
                  { value: "cnpj", label: "CNPJ" },
                  { value: "cpf", label: "CPF" },
                ]} />
              </div>
            )}

            {/* Seller Type */}
            {platform === "shopee" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Tipo de Vendedor</label>
                <ToggleGroup value={sellerMode} onChange={v => setSellerMode(v as SellerMode)} options={[
                  { value: "normal", label: "Normal" },
                  { value: "indicado", label: "Indicado" },
                ]} />
              </div>
            )}

            {/* Free Shipping */}
            {platform === "shopee" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Frete Grátis</label>
                <ToggleGroup value={freeShipping ? "sim" : "nao"} onChange={v => setFreeShipping(v === "sim")} options={[
                  { value: "sim", label: "Sim" },
                  { value: "nao", label: "Não" },
                ]} />
              </div>
            )}

            {/* Shopee Acelera */}
            {platform === "shopee" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Shopee Acelera</label>
                <ToggleGroup value={shopeeAcelera ? "sim" : "nao"} onChange={v => setShopeeAcelera(v === "sim")} options={[
                  { value: "sim", label: "Sim" },
                  { value: "nao", label: "Não" },
                ]} />
              </div>
            )}

            {/* ML Ad Type */}
            {platform === "mercadolivre" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Tipo de Anúncio</label>
                <ToggleGroup value={mlAdType} onChange={v => setMlAdType(v as "classico" | "premium")} options={[
                  { value: "classico", label: "Clássico" },
                  { value: "premium", label: "Premium" },
                ]} />
              </div>
            )}
          </div>

          {/* Cost Inputs */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Custos do Produto</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Custo do Produto (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0,00" className={`${inputClass} pl-9`} />
                </div>
              </div>

              {/* Margin Mode Toggle */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Modo de Cálculo</label>
                <ToggleGroup value={useMarginCalc ? "margem" : "preco"} onChange={v => setUseMarginCalc(v === "margem")} options={[
                  { value: "preco", label: "Definir Preço" },
                  { value: "margem", label: "Definir Margem" },
                ]} />
              </div>

              {useMarginCalc ? (
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Margem Desejada (%)</label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="number" value={desiredMargin} onChange={e => setDesiredMargin(e.target.value)} placeholder="Ex: 30" className={`${inputClass} pl-9`} />
                  </div>
                  {calculatedSalePrice && (
                    <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Preço de venda calculado</p>
                      <p className="text-lg font-bold text-primary">R$ {fmt(calculatedSalePrice)}</p>
                      <p className="text-[11px] text-muted-foreground">Para atingir {desiredMargin}% de margem líquida</p>
                    </div>
                  )}
                  {useMarginCalc && marginTarget > 0 && !calculatedSalePrice && cost > 0 && (
                    <p className="text-xs text-destructive mt-1">Margem muito alta — impossível calcular preço viável.</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Preço de Venda (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0,00" className={`${inputClass} pl-9`} />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Alíquota de Impostos (%)</label>
                <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="7" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="xl:col-span-8 space-y-5">
          {hasInput ? (
            <>
              {/* Indicators */}
              {indicators.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {indicators.map((ind, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium ${indicatorColors[ind.type]}`}>
                      {ind.icon}
                      <span>{ind.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  label="Lucro Líquido"
                  value={`R$ ${fmt(best.netProfit)}`}
                  sub={best.subtitle}
                  variant={best.netProfit >= 0 ? "positive" : "negative"}
                  icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  label="Margem de Lucro"
                  value={`${fmt(best.margin)}%`}
                  sub="Sobre o preço de venda"
                  variant={best.margin >= 15 ? "positive" : best.margin >= 0 ? "default" : "negative"}
                  icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                />
                <MetricCard
                  label="Custo Total"
                  value={`R$ ${fmt(best.totalCosts)}`}
                  sub={`${fmt((best.totalCosts / sale) * 100)}% do preço`}
                />
                <MetricCard
                  label="Break-even"
                  value={`R$ ${fmt(best.breakEven)}`}
                  sub="Preço mínimo sem prejuízo"
                />
              </div>

              {/* Plan Comparison */}
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Comparação de Planos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scenarios.map((s, i) => (
                    <div key={i} className={`bg-card border rounded-xl p-5 relative ${i === bestIdx ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
                      {i === bestIdx && (
                        <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                          Melhor Opção
                        </span>
                      )}
                      <h4 className="font-bold text-foreground text-lg">{s.label}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{s.subtitle}</p>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between font-medium">
                          <span className="text-foreground">Preço de Venda</span>
                          <span className="text-foreground">R$ {fmt(sale)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Custo do Produto</span>
                          <span className="text-foreground">- R$ {fmt(cost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comissão ({fmt(s.commissionRate * 100)}%)</span>
                          <span className="text-foreground">- R$ {fmt(s.commission)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taxa Fixa</span>
                          <span className="text-foreground">- R$ {fmt(s.fixedFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Impostos ({tax}%)</span>
                          <span className="text-foreground">- R$ {fmt(s.taxAmount)}</span>
                        </div>
                      </div>

                      <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
                        <span className="font-semibold text-foreground">Lucro Líquido</span>
                        <span className={`text-xl font-bold ${s.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                          R$ {fmt(s.netProfit)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-muted/30 rounded-lg p-3 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem</p>
                          <p className={`text-base font-bold ${s.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(s.margin)}%</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI</p>
                          <p className={`text-base font-bold ${s.roi >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(s.roi)}%</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3 px-1">
                        <span className="text-sm text-muted-foreground">Break-even</span>
                        <span className="text-sm font-bold text-foreground">R$ {fmt(s.breakEven)}</span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ROAS Engine */}
              {adMetrics && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Motor de Anúncios e ROAS</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    <MetricCard label="Gasto Máximo por Venda" value={`R$ ${fmt(adMetrics.maxAdCost)}`} sub="Máximo sem ter prejuízo" variant="primary" />
                    <MetricCard label="ROAS Mínimo" value={fmt(adMetrics.minROAS)} sub="Para não ter prejuízo" variant={adMetrics.minROAS <= 3 ? "positive" : "negative"} />
                    <MetricCard label="Gasto Recomendado" value={`R$ ${fmt(adMetrics.recommendedAdSpend)}`} sub="40% do lucro líquido" variant="primary" />
                  </div>

                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Simulador de ROAS</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {adMetrics.roasLevels.map(r => (
                      <div key={r.roas} className={`rounded-xl border p-4 ${r.profitAfterAds >= 0 ? "border-border bg-card" : "border-destructive/30 bg-destructive/5"}`}>
                        <p className="text-xs text-muted-foreground font-semibold">ROAS {r.roas}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] text-muted-foreground">Custo do Anúncio</p>
                          <p className="text-sm font-bold text-foreground">R$ {fmt(r.adCostPerSale)}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">Lucro Final</p>
                          <p className={`text-sm font-bold ${r.profitAfterAds >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {fmt(r.profitAfterAds)}</p>
                          <p className={`text-xs font-semibold mt-1 ${r.marginAfterAds >= 0 ? "text-emerald-600" : "text-destructive"}`}>{r.marginAfterAds.toFixed(1).replace(".", ",")}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Distribuição de Custos</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `R$ ${fmt(v)}`} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Lucro por Plano</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${v}`} />
                      <Tooltip formatter={(v: number) => `R$ ${fmt(v)}`} />
                      <Bar dataKey="Lucro" fill="hsl(150, 60%, 40%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Custos" fill="hsl(0, 65%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Analysis */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise da Precificação</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      O plano <strong className="text-foreground">{best.label} {best.subtitle}</strong> oferece o melhor lucro de R$ {fmt(best.netProfit)} com margem de {best.margin.toFixed(1).replace(".", ",")}%.
                    </p>
                  </div>
                  {best.margin < 0 && (
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">Atenção: operação com prejuízo. Aumente o preço ou reduza custos.</p>
                    </div>
                  )}
                  {best.margin >= 0 && best.margin < 10 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">Margem abaixo de 10%. Considere otimizar custos ou reajustar o preço.</p>
                    </div>
                  )}
                  {adMetrics && (
                    <div className="flex items-start gap-2">
                      <Megaphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        ROAS mínimo: {fmt(adMetrics.minROAS)}. Gasto máximo por venda: R$ {fmt(adMetrics.maxAdCost)}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha o custo do produto e o preço de venda para ver os resultados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
