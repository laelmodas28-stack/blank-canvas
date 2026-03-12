import { Calculator, CheckCircle2, TrendingUp, BarChart3, Target, AlertTriangle, ShieldAlert, Megaphone } from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Platform = "mercadolivre" | "shopee";

interface FeeResult {
  commissionRate: number;
  fixedFee: number;
}

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

// ── Shopee Brazil 2026 Fee Structure ──────────────────────────
const SHOPEE_COMMISSION_CAP = 105;

function getShopeeBaseFees(price: number): FeeResult {
  if (price < 8) return { commissionRate: 0.50, fixedFee: 0 };
  if (price <= 79.99) return { commissionRate: 0.20, fixedFee: 4 };
  if (price <= 99.99) return { commissionRate: 0.14, fixedFee: 16 };
  if (price <= 199.99) return { commissionRate: 0.14, fixedFee: 20 };
  return { commissionRate: 0.14, fixedFee: 26 };
}

function getShopeeIndicadoFees(price: number): FeeResult {
  const base = getShopeeBaseFees(price);
  if (price < 8) return base;
  return { commissionRate: base.commissionRate + 0.02, fixedFee: base.fixedFee };
}

function capCommission(price: number, rate: number): number {
  const raw = price * rate;
  return Math.min(raw, SHOPEE_COMMISSION_CAP);
}

// ── Mercado Livre Fee Structure ───────────────────────────────
function getMercadoLivreFees(adType: "classico" | "premium"): FeeResult & { description: string } {
  if (adType === "classico") {
    return { commissionRate: 0.12, fixedFee: 6.50, description: "Anúncio Clássico: 12% comissão + R$ 6,50 custo operacional." };
  }
  return { commissionRate: 0.17, fixedFee: 6.50, description: "Anúncio Premium: 17% comissão + R$ 6,50 custo operacional. Parcelamento sem juros." };
}

// ── Scenario Calculator ───────────────────────────────────────
function calcScenario(
  salePrice: number, costProduct: number, taxRate: number,
  frete: number, embalagem: number, outrosCustos: number,
  commissionRate: number, fixedFee: number, commissionCap: number | null,
  label: string, subtitle: string, description: string
): ScenarioResult {
  const rawCommission = salePrice * commissionRate;
  const commission = commissionCap ? Math.min(rawCommission, commissionCap) : rawCommission;
  const taxAmount = salePrice * (taxRate / 100);
  const totalCosts = costProduct + commission + fixedFee + taxAmount + frete + embalagem + outrosCustos;
  const netProfit = salePrice - totalCosts;
  const margin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  const roi = costProduct > 0 ? (netProfit / costProduct) * 100 : 0;
  const fixedCosts = costProduct + frete + embalagem + outrosCustos + fixedFee;
  const effectiveRate = commissionCap && salePrice > 0 ? commission / salePrice : commissionRate;
  const denominator = 1 - effectiveRate - taxRate / 100;
  const breakEven = denominator > 0 ? fixedCosts / denominator : 0;
  return { label, subtitle, commissionRate, fixedFee, commission, taxAmount, totalCosts, netProfit, margin, roi, breakEven, description };
}

// ── Strategic Price Calculator ────────────────────────────────
function calcStrategicPrice(
  costProduct: number, taxRate: number, frete: number, embalagem: number,
  outrosCustos: number, commissionRate: number, fixedFee: number, targetMargin: number
): number {
  const fixedCosts = costProduct + frete + embalagem + outrosCustos + fixedFee;
  const denom = 1 - commissionRate - taxRate / 100 - targetMargin / 100;
  return denom > 0 ? fixedCosts / denom : 0;
}

// ── UI Components ─────────────────────────────────────────────
const COLORS = ["hsl(220, 70%, 55%)", "hsl(0, 70%, 55%)", "hsl(200, 70%, 45%)", "hsl(45, 80%, 50%)", "hsl(280, 60%, 50%)"];

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

function MetricCard({ label, value, sub, variant = "default" }: { label: string; value: string; sub?: string; variant?: "default" | "positive" | "negative" | "primary" }) {
  const colorMap = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-destructive",
    primary: "text-primary",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 ${colorMap[variant]}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Precificacao() {
  const [platform, setPlatform] = useState<Platform>("shopee");
  const [vendorType, setVendorType] = useState<"normal" | "indicado">("normal");
  const [adType, setAdType] = useState<"classico" | "premium">("classico");

  const [costPrice, setCostPrice] = useState("18");
  const [salePrice, setSalePrice] = useState("49.90");
  const [taxRate, setTaxRate] = useState("7");
  const [frete, setFrete] = useState("0");
  const [embalagem, setEmbalagem] = useState("0");
  const [outrosCustos, setOutrosCustos] = useState("0");

  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const tax = parseFloat(taxRate) || 0;
  const freteVal = parseFloat(frete) || 0;
  const embalagemVal = parseFloat(embalagem) || 0;
  const outrosVal = parseFloat(outrosCustos) || 0;
  const hasInput = cost > 0 && sale > 0;

  // ── Scenarios ──
  const scenarios = useMemo(() => {
    if (platform === "shopee") {
      const normal = getShopeeBaseFees(sale);
      const indicado = getShopeeIndicadoFees(sale);
      return [
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal,
          normal.commissionRate, normal.fixedFee, SHOPEE_COMMISSION_CAP,
          "Shopee", "Normal",
          `Comissão ${(normal.commissionRate * 100).toFixed(0)}% + taxa fixa R$ ${normal.fixedFee.toFixed(2)}. Teto de comissão: R$ ${SHOPEE_COMMISSION_CAP}.`),
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal,
          indicado.commissionRate, indicado.fixedFee, SHOPEE_COMMISSION_CAP,
          "Shopee", "Indicado + Frete Grátis",
          `Comissão ${(indicado.commissionRate * 100).toFixed(0)}% (+2% programa) + taxa fixa R$ ${indicado.fixedFee.toFixed(2)}. Teto: R$ ${SHOPEE_COMMISSION_CAP}.`),
      ];
    }
    const classico = getMercadoLivreFees("classico");
    const premium = getMercadoLivreFees("premium");
    return [
      calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal,
        classico.commissionRate, classico.fixedFee, null,
        "Mercado Livre", "Clássico", classico.description),
      calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal,
        premium.commissionRate, premium.fixedFee, null,
        "Mercado Livre", "Premium", premium.description),
    ];
  }, [platform, sale, cost, tax, freteVal, embalagemVal, outrosVal]);

  const bestIdx = scenarios[0].netProfit >= scenarios[1].netProfit ? 0 : 1;
  const best = scenarios[bestIdx];

  // ── Strategic Prices ──
  const strategicPrices = useMemo(() => {
    const fees = platform === "shopee"
      ? (vendorType === "indicado" ? getShopeeIndicadoFees(sale) : getShopeeBaseFees(sale))
      : getMercadoLivreFees(adType);
    const calc = (m: number) => calcStrategicPrice(cost, tax, freteVal, embalagemVal, outrosVal, fees.commissionRate, fees.fixedFee, m);
    return {
      breakEven: calc(0),
      margin30: calc(30),
      margin40: calc(40),
      margin50: calc(50),
    };
  }, [platform, vendorType, adType, cost, tax, sale, freteVal, embalagemVal, outrosVal]);

  // ── ROAS & Ad Engine ──
  const adMetrics = useMemo(() => {
    if (!hasInput || best.netProfit <= 0) return null;
    const maxAdCost = best.netProfit;
    const minROAS = sale / maxAdCost;
    const roasLevels = [2, 3, 4, 5].map(roas => {
      const adCostPerSale = sale / roas;
      const profitAfterAds = best.netProfit - adCostPerSale;
      const marginAfterAds = sale > 0 ? (profitAfterAds / sale) * 100 : 0;
      return { roas, adCostPerSale, profitAfterAds, marginAfterAds };
    });
    return { maxAdCost, minROAS, roasLevels };
  }, [hasInput, best, sale]);

  // ── Decision Indicators ──
  const indicators = useMemo(() => {
    if (!hasInput) return [];
    const items: { label: string; type: "positive" | "warning" | "negative"; icon: React.ReactNode }[] = [];
    if (best.margin >= 30) items.push({ label: "Alta oportunidade de lucro", type: "positive", icon: <TrendingUp className="h-4 w-4" /> });
    else if (best.margin >= 15) items.push({ label: "Margem saudável", type: "positive", icon: <CheckCircle2 className="h-4 w-4" /> });
    else if (best.margin >= 5) items.push({ label: "Margem baixa — considere ajustar preço", type: "warning", icon: <AlertTriangle className="h-4 w-4" /> });
    else items.push({ label: "Risco de prejuízo — revise custos ou preço", type: "negative", icon: <ShieldAlert className="h-4 w-4" /> });

    if (best.roi >= 100) items.push({ label: "ROI excelente — retorno acima de 100%", type: "positive", icon: <TrendingUp className="h-4 w-4" /> });
    else if (best.roi < 20 && best.roi >= 0) items.push({ label: "ROI baixo — capital lento para retornar", type: "warning", icon: <AlertTriangle className="h-4 w-4" /> });

    if (adMetrics && adMetrics.minROAS <= 3) items.push({ label: "Produto viável para anúncios pagos", type: "positive", icon: <Megaphone className="h-4 w-4" /> });
    else if (adMetrics && adMetrics.minROAS > 5) items.push({ label: "ROAS mínimo alto — anúncios arriscados", type: "warning", icon: <Megaphone className="h-4 w-4" /> });

    return items;
  }, [hasInput, best, adMetrics]);

  // ── Chart Data ──
  const pieData = hasInput ? [
    { name: "Produto", value: cost },
    { name: "Comissão", value: best.commission },
    { name: "Taxa Fixa", value: best.fixedFee },
    { name: "Impostos", value: best.taxAmount },
    ...(freteVal > 0 ? [{ name: "Frete", value: freteVal }] : []),
  ].filter(d => d.value > 0) : [];

  const barData = hasInput ? scenarios.map(s => ({
    name: s.subtitle,
    Lucro: parseFloat(s.netProfit.toFixed(2)),
    Custos: parseFloat(s.totalCosts.toFixed(2)),
  })) : [];

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  const indicatorColors = {
    positive: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    negative: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Motor de Precificação</h1>
          <p className="text-sm text-muted-foreground">Calcule lucro real, ROAS e encontre o preço ideal para vender com lucro</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN: Inputs ── */}
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <ToggleGroup label="Plataforma" value={platform} onChange={v => setPlatform(v as Platform)} options={[
              { value: "shopee", label: "Shopee" },
              { value: "mercadolivre", label: "Mercado Livre" },
            ]} />
            {platform === "shopee" && (
              <ToggleGroup label="Tipo de Vendedor" value={vendorType} onChange={v => setVendorType(v as "normal" | "indicado")} options={[
                { value: "normal", label: "Normal" },
                { value: "indicado", label: "Indicado" },
              ]} />
            )}
            {platform === "mercadolivre" && (
              <ToggleGroup label="Tipo de Anúncio" value={adType} onChange={v => setAdType(v as "classico" | "premium")} options={[
                { value: "classico", label: "Clássico" },
                { value: "premium", label: "Premium" },
              ]} />
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Custos e Preço</h3>
            {([
              { label: "Custo do Produto (R$)", value: costPrice, setter: setCostPrice },
              { label: "Preço de Venda (R$)", value: salePrice, setter: setSalePrice },
              { label: "Alíquota de Impostos (%)", value: taxRate, setter: setTaxRate },
            ] as const).map(f => (
              <div key={f.label}>
                <label className="text-sm text-muted-foreground block mb-1">{f.label}</label>
                <input type="number" value={f.value} onChange={e => f.setter(e.target.value)} placeholder="0" className={inputClass} />
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Custos Adicionais</h3>
            {([
              { label: "Frete (R$)", value: frete, setter: setFrete },
              { label: "Embalagem (R$)", value: embalagem, setter: setEmbalagem },
              { label: "Outros Custos (R$)", value: outrosCustos, setter: setOutrosCustos },
            ] as const).map(f => (
              <div key={f.label}>
                <label className="text-sm text-muted-foreground block mb-1">{f.label}</label>
                <input type="number" value={f.value} onChange={e => f.setter(e.target.value)} placeholder="0" className={inputClass} />
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Results ── */}
        <div className="xl:col-span-8 space-y-5">
          {hasInput ? (
            <>
              {/* Decision Indicators */}
              {indicators.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {indicators.map((ind, i) => (
                    <div key={i} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${indicatorColors[ind.type]}`}>
                      {ind.icon}
                      <span className="text-sm font-medium">{ind.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Lucro Líquido" value={`R$ ${best.netProfit.toFixed(2)}`} sub={best.subtitle} variant={best.netProfit >= 0 ? "positive" : "negative"} />
                <MetricCard label="Margem de Lucro" value={`${best.margin.toFixed(2)}%`} sub="Sobre o preço de venda" variant={best.margin >= 0 ? "positive" : "negative"} />
                <MetricCard label="ROI" value={`${best.roi.toFixed(2)}%`} sub="Retorno sobre investimento" variant={best.roi >= 50 ? "positive" : "default"} />
                <MetricCard label="Break-even" value={`R$ ${best.breakEven.toFixed(2)}`} sub="Preço mínimo sem prejuízo" />
              </div>

              {/* ROAS & Ad Engine */}
              {adMetrics && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Megaphone className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motor de Anúncios e ROAS</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <MetricCard label="Gasto Máximo por Venda" value={`R$ ${adMetrics.maxAdCost.toFixed(2)}`} sub="Máximo sem ter prejuízo" variant="primary" />
                    <MetricCard label="ROAS Mínimo" value={adMetrics.minROAS.toFixed(2)} sub="ROAS mínimo para não ter prejuízo" variant={adMetrics.minROAS <= 3 ? "positive" : "negative"} />
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Simulador de ROAS</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {adMetrics.roasLevels.map(r => (
                        <div key={r.roas} className={`rounded-xl border p-4 ${r.profitAfterAds >= 0 ? "border-border bg-card" : "border-destructive/30 bg-destructive/5"}`}>
                          <p className="text-xs text-muted-foreground font-medium">ROAS {r.roas}</p>
                          <p className="text-sm text-muted-foreground mt-2">Custo do anúncio</p>
                          <p className="text-base font-bold text-foreground">R$ {r.adCostPerSale.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground mt-1">Lucro final</p>
                          <p className={`text-base font-bold ${r.profitAfterAds >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {r.profitAfterAds.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground mt-1">Margem</p>
                          <p className={`text-sm font-semibold ${r.marginAfterAds >= 0 ? "text-emerald-600" : "text-destructive"}`}>{r.marginAfterAds.toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Comparison */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Comparação de Planos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scenarios.map((s, i) => (
                    <div key={i} className={`bg-card border rounded-xl p-5 relative ${i === bestIdx ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
                      {i === bestIdx && (
                        <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">Melhor Opção</span>
                      )}
                      <h4 className="font-bold text-foreground text-lg">{s.label}</h4>
                      <p className="text-sm text-muted-foreground">{s.subtitle}</p>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Preço de Venda</span><span className="font-medium text-foreground">R$ {sale.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Custo do Produto</span><span className="text-foreground">- R$ {cost.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Comissão ({(s.commissionRate * 100).toFixed(0)}%)</span><span className="text-foreground">- R$ {s.commission.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Taxa Fixa</span><span className="text-foreground">- R$ {s.fixedFee.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Impostos ({tax}%)</span><span className="text-foreground">- R$ {s.taxAmount.toFixed(2)}</span></div>
                        {freteVal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className="text-foreground">- R$ {freteVal.toFixed(2)}</span></div>}
                        {embalagemVal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Embalagem</span><span className="text-foreground">- R$ {embalagemVal.toFixed(2)}</span></div>}
                        {outrosVal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Outros Custos</span><span className="text-foreground">- R$ {outrosVal.toFixed(2)}</span></div>}
                      </div>

                      <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-foreground">Lucro Líquido</span>
                        <span className={`text-xl font-bold ${s.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {s.netProfit.toFixed(2)}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem</p>
                          <p className={`text-base font-bold ${s.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>{s.margin.toFixed(1)}%</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI</p>
                          <p className={`text-base font-bold ${s.roi >= 0 ? "text-emerald-600" : "text-destructive"}`}>{s.roi.toFixed(1)}%</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Break-even</p>
                          <p className="text-base font-bold text-foreground">R$ {s.breakEven.toFixed(0)}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Price Engine */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preços Estratégicos Recomendados</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/20 border border-border rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Preço Mínimo</p>
                    <p className="text-xl font-bold text-foreground mt-1">R$ {strategicPrices.breakEven.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Margem 0% (break-even)</p>
                  </div>
                  <div className="bg-muted/20 border border-border rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Margem 30%</p>
                    <p className="text-xl font-bold text-foreground mt-1">R$ {strategicPrices.margin30.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lucro: R$ {(strategicPrices.margin30 * 0.30).toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Margem 40%</p>
                    <p className="text-xl font-bold text-primary mt-1">R$ {strategicPrices.margin40.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lucro: R$ {(strategicPrices.margin40 * 0.40).toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary font-medium">Recomendado</span>
                    </div>
                  </div>
                  <div className="bg-muted/20 border border-border rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Margem 50%</p>
                    <p className="text-xl font-bold text-foreground mt-1">R$ {strategicPrices.margin50.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lucro: R$ {(strategicPrices.margin50 * 0.50).toFixed(2)}</p>
                  </div>
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
                      O plano {best.label} {best.subtitle} oferece o melhor lucro de R$ {best.netProfit.toFixed(2)} com margem de {best.margin.toFixed(1)}%.
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
                        Para anúncios pagos, seu ROAS mínimo é {adMetrics.minROAS.toFixed(2)}. Gasto máximo por venda: R$ {adMetrics.maxAdCost.toFixed(2)}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
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
