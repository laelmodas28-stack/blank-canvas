import { Calculator, CheckCircle2, TrendingUp, BarChart3, Target, AlertTriangle, ShieldAlert, Megaphone, ChevronDown, Package, Settings, DollarSign, PieChart as PieChartIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Platform = "mercadolivre" | "shopee";
type SellerType = "cpf" | "cnpj";

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

function getShopeeBaseFees(price: number, sellerType: SellerType): FeeResult {
  if (price < 8) return { commissionRate: 0.50, fixedFee: 0 };

  if (sellerType === "cpf") {
    // CPF sellers have a flat R$7 fixed fee across all tiers
    if (price <= 79.99) return { commissionRate: 0.20, fixedFee: 7 };
    if (price <= 99.99) return { commissionRate: 0.14, fixedFee: 7 };
    if (price <= 199.99) return { commissionRate: 0.14, fixedFee: 7 };
    return { commissionRate: 0.14, fixedFee: 7 };
  }

  // CNPJ sellers use tiered fixed fees
  if (price <= 79.99) return { commissionRate: 0.20, fixedFee: 4 };
  if (price <= 99.99) return { commissionRate: 0.14, fixedFee: 16 };
  if (price <= 199.99) return { commissionRate: 0.14, fixedFee: 20 };
  return { commissionRate: 0.14, fixedFee: 26 };
}

function getShopeeWithExtras(
  price: number,
  sellerType: SellerType,
  freeShipping: boolean,
  campaign: boolean,
  sponsored: boolean
): FeeResult {
  const base = getShopeeBaseFees(price, sellerType);
  if (price < 8) return base;
  let extra = 0;
  if (freeShipping) extra += 0.06;
  if (campaign) extra += 0.02;
  if (sponsored) extra += 0.03;
  return { commissionRate: base.commissionRate + extra, fixedFee: base.fixedFee };
}

function capCommission(price: number, rate: number): number {
  return Math.min(price * rate, SHOPEE_COMMISSION_CAP);
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

function AccordionSection({ title, icon, defaultOpen = false, children }: { title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <span className="font-semibold text-foreground text-sm">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function ToggleGroup({ options, value, onChange }: { options: { value: string; label: string; sub?: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all text-center ${value === o.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
        >
          <span className="block">{o.label}</span>
          {o.sub && <span className="block text-[10px] mt-0.5 opacity-80">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

function ToggleSwitch({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${checked ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border"}`}
    >
      <div>
        <span className="text-sm font-medium text-foreground block">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <div className={`h-5 w-9 rounded-full transition-colors relative ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </button>
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
      <p className={`text-lg sm:text-xl font-bold mt-1 ${colorMap[variant]}`}>{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Precificacao() {
  const [platform, setPlatform] = useState<Platform>("shopee");
  const [sellerType, setSellerType] = useState<SellerType>("cnpj");
  const [adType, setAdType] = useState<"classico" | "premium">("classico");

  // Announcement settings
  const [freeShipping, setFreeShipping] = useState(false);
  const [campaign, setCampaign] = useState(false);
  const [sponsored, setSponsored] = useState(false);

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
      const baseFees = getShopeeBaseFees(sale, sellerType);
      const withExtras = getShopeeWithExtras(sale, sellerType, freeShipping, campaign, sponsored);

      const extraDesc = [
        freeShipping ? "Frete Grátis (+6%)" : "",
        campaign ? "Campanha (+2%)" : "",
        sponsored ? "Patrocinado (+3%)" : "",
      ].filter(Boolean).join(", ");

      return [
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal,
          baseFees.commissionRate, baseFees.fixedFee, SHOPEE_COMMISSION_CAP,
          "Shopee", `${sellerType.toUpperCase()} — Sem extras`,
          `Comissão ${(baseFees.commissionRate * 100).toFixed(0)}% + taxa fixa R$ ${baseFees.fixedFee.toFixed(2)}. Vendedor ${sellerType.toUpperCase()}.`),
        calcScenario(sale, cost, tax, freteVal, embalagemVal, outrosVal,
          withExtras.commissionRate, withExtras.fixedFee, SHOPEE_COMMISSION_CAP,
          "Shopee", `${sellerType.toUpperCase()} — Com extras`,
          `Comissão ${(withExtras.commissionRate * 100).toFixed(0)}% + taxa fixa R$ ${withExtras.fixedFee.toFixed(2)}. ${extraDesc || "Sem programas ativos."}`),
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
  }, [platform, sellerType, freeShipping, campaign, sponsored, sale, cost, tax, freteVal, embalagemVal, outrosVal]);

  const bestIdx = scenarios[0].netProfit >= scenarios[1].netProfit ? 0 : 1;
  const best = scenarios[bestIdx];

  // ── Strategic Prices ──
  const strategicPrices = useMemo(() => {
    const fees = platform === "shopee"
      ? getShopeeWithExtras(sale, sellerType, freeShipping, campaign, sponsored)
      : getMercadoLivreFees(adType);
    const calc = (m: number) => calcStrategicPrice(cost, tax, freteVal, embalagemVal, outrosVal, fees.commissionRate, fees.fixedFee, m);
    return {
      breakEven: calc(0),
      margin30: calc(30),
      margin40: calc(40),
      margin50: calc(50),
    };
  }, [platform, sellerType, adType, freeShipping, campaign, sponsored, cost, tax, sale, freteVal, embalagemVal, outrosVal]);

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
    name: s.subtitle.length > 20 ? s.subtitle.slice(0, 18) + "…" : s.subtitle,
    Lucro: parseFloat(s.netProfit.toFixed(2)),
    Custos: parseFloat(s.totalCosts.toFixed(2)),
  })) : [];

  const inputClass = "w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  const indicatorColors = {
    positive: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    negative: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Motor de Precificação</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Calcule lucro real, ROAS e encontre o preço ideal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        {/* ── LEFT COLUMN: Inputs (Accordion on mobile) ── */}
        <div className="xl:col-span-4 space-y-3">
          {/* Platform */}
          <AccordionSection title="Plataforma" icon={<Package className="h-4 w-4 text-primary" />} defaultOpen>
            <ToggleGroup value={platform} onChange={v => setPlatform(v as Platform)} options={[
              { value: "shopee", label: "Shopee" },
              { value: "mercadolivre", label: "Mercado Livre" },
            ]} />
          </AccordionSection>

          {/* Seller Type */}
          {platform === "shopee" && (
            <AccordionSection title="Tipo de Vendedor" icon={<Settings className="h-4 w-4 text-primary" />} defaultOpen>
              <ToggleGroup value={sellerType} onChange={v => setSellerType(v as SellerType)} options={[
                { value: "cpf", label: "CPF", sub: "Taxa fixa R$ 7,00" },
                { value: "cnpj", label: "CNPJ", sub: "Taxa fixa variável" },
              ]} />
              <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  {sellerType === "cpf"
                    ? "Vendedor CPF: taxa fixa de R$ 7,00 em todas as faixas de preço."
                    : "Vendedor CNPJ: taxa fixa varia de R$ 4,00 a R$ 26,00 conforme o preço."}
                </p>
              </div>
            </AccordionSection>
          )}

          {/* ML Ad Type */}
          {platform === "mercadolivre" && (
            <AccordionSection title="Tipo de Anúncio" icon={<Settings className="h-4 w-4 text-primary" />} defaultOpen>
              <ToggleGroup value={adType} onChange={v => setAdType(v as "classico" | "premium")} options={[
                { value: "classico", label: "Clássico", sub: "12% comissão" },
                { value: "premium", label: "Premium", sub: "17% comissão" },
              ]} />
            </AccordionSection>
          )}

          {/* Announcement Settings */}
          {platform === "shopee" && (
            <AccordionSection title="Configuração do Anúncio" icon={<Megaphone className="h-4 w-4 text-primary" />} defaultOpen={false}>
              <div className="space-y-2">
                <ToggleSwitch
                  label="Frete Grátis"
                  description="Adiciona +6% de comissão"
                  checked={freeShipping}
                  onChange={setFreeShipping}
                />
                <ToggleSwitch
                  label="Participação em Campanhas"
                  description="Adiciona +2% de comissão"
                  checked={campaign}
                  onChange={setCampaign}
                />
                <ToggleSwitch
                  label="Anúncio Patrocinado"
                  description="Adiciona +3% de comissão"
                  checked={sponsored}
                  onChange={setSponsored}
                />
              </div>
            </AccordionSection>
          )}

          {/* Cost Inputs */}
          <AccordionSection title="Custos do Produto" icon={<DollarSign className="h-4 w-4 text-primary" />} defaultOpen>
            <div className="space-y-3">
              {([
                { label: "Custo do Produto (R$)", value: costPrice, setter: setCostPrice, ph: "0,00" },
                { label: "Preço de Venda (R$)", value: salePrice, setter: setSalePrice, ph: "0,00" },
                { label: "Alíquota de Impostos (%)", value: taxRate, setter: setTaxRate, ph: "7" },
                { label: "Frete (R$)", value: frete, setter: setFrete, ph: "0,00" },
                { label: "Embalagem (R$)", value: embalagem, setter: setEmbalagem, ph: "0,00" },
                { label: "Outros Custos (R$)", value: outrosCustos, setter: setOutrosCustos, ph: "0,00" },
              ] as const).map(f => (
                <div key={f.label}>
                  <label className="text-sm text-muted-foreground block mb-1">{f.label}</label>
                  <input type="number" value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.ph} className={inputClass} />
                </div>
              ))}
            </div>
          </AccordionSection>
        </div>

        {/* ── RIGHT COLUMN: Results ── */}
        <div className="xl:col-span-8 space-y-4 sm:space-y-5">
          {hasInput ? (
            <>
              {/* Decision Indicators */}
              {indicators.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {indicators.map((ind, i) => (
                    <div key={i} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${indicatorColors[ind.type]}`}>
                      {ind.icon}
                      <span className="text-xs sm:text-sm font-medium">{ind.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <MetricCard label="Lucro Líquido" value={`R$ ${best.netProfit.toFixed(2)}`} sub={best.subtitle} variant={best.netProfit >= 0 ? "positive" : "negative"} />
                <MetricCard label="Margem de Lucro" value={`${best.margin.toFixed(1)}%`} sub="Sobre o preço de venda" variant={best.margin >= 0 ? "positive" : "negative"} />
                <MetricCard label="ROI" value={`${best.roi.toFixed(1)}%`} sub="Retorno sobre investimento" variant={best.roi >= 50 ? "positive" : "default"} />
                <MetricCard label="Break-even" value={`R$ ${best.breakEven.toFixed(2)}`} sub="Preço mínimo sem prejuízo" />
              </div>

              {/* ROAS & Ad Engine */}
              {adMetrics && (
                <AccordionSection title="Motor de Anúncios e ROAS" icon={<Megaphone className="h-4 w-4 text-primary" />} defaultOpen>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <MetricCard label="Gasto Máximo por Venda" value={`R$ ${adMetrics.maxAdCost.toFixed(2)}`} sub="Máximo sem ter prejuízo" variant="primary" />
                      <MetricCard label="ROAS Mínimo" value={adMetrics.minROAS.toFixed(2)} sub="Para não ter prejuízo" variant={adMetrics.minROAS <= 3 ? "positive" : "negative"} />
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Simulador de ROAS</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        {adMetrics.roasLevels.map(r => (
                          <div key={r.roas} className={`rounded-xl border p-3 sm:p-4 ${r.profitAfterAds >= 0 ? "border-border bg-card" : "border-destructive/30 bg-destructive/5"}`}>
                            <p className="text-xs text-muted-foreground font-medium">ROAS {r.roas}</p>
                            <p className="text-[10px] sm:text-sm text-muted-foreground mt-2">Custo</p>
                            <p className="text-sm sm:text-base font-bold text-foreground">R$ {r.adCostPerSale.toFixed(2)}</p>
                            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">Lucro</p>
                            <p className={`text-sm sm:text-base font-bold ${r.profitAfterAds >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {r.profitAfterAds.toFixed(2)}</p>
                            <p className={`text-xs font-semibold mt-1 ${r.marginAfterAds >= 0 ? "text-emerald-600" : "text-destructive"}`}>{r.marginAfterAds.toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionSection>
              )}

              {/* Plan Comparison */}
              <AccordionSection title="Comparação de Planos" icon={<BarChart3 className="h-4 w-4 text-primary" />} defaultOpen>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scenarios.map((s, i) => (
                    <div key={i} className={`bg-muted/10 border rounded-xl p-4 sm:p-5 relative ${i === bestIdx ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
                      {i === bestIdx && (
                        <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">Melhor Opção</span>
                      )}
                      <h4 className="font-bold text-foreground">{s.label}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{s.subtitle}</p>

                      <div className="mt-3 space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Preço de Venda</span><span className="font-medium text-foreground">R$ {sale.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Custo do Produto</span><span className="text-foreground">- R$ {cost.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Comissão ({(s.commissionRate * 100).toFixed(0)}%)</span><span className="text-foreground">- R$ {s.commission.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Taxa Fixa</span><span className="text-foreground">- R$ {s.fixedFee.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Impostos ({tax}%)</span><span className="text-foreground">- R$ {s.taxAmount.toFixed(2)}</span></div>
                        {freteVal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className="text-foreground">- R$ {freteVal.toFixed(2)}</span></div>}
                        {embalagemVal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Embalagem</span><span className="text-foreground">- R$ {embalagemVal.toFixed(2)}</span></div>}
                        {outrosVal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Outros</span><span className="text-foreground">- R$ {outrosVal.toFixed(2)}</span></div>}
                      </div>

                      <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-foreground text-sm">Lucro Líquido</span>
                        <span className={`text-lg sm:text-xl font-bold ${s.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>R$ {s.netProfit.toFixed(2)}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Margem</p>
                          <p className={`text-sm sm:text-base font-bold ${s.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>{s.margin.toFixed(1)}%</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">ROI</p>
                          <p className={`text-sm sm:text-base font-bold ${s.roi >= 0 ? "text-emerald-600" : "text-destructive"}`}>{s.roi.toFixed(1)}%</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Break-even</p>
                          <p className="text-sm sm:text-base font-bold text-foreground">R$ {s.breakEven.toFixed(0)}</p>
                        </div>
                      </div>

                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-3">{s.description}</p>
                    </div>
                  ))}
                </div>
              </AccordionSection>

              {/* Strategic Price Engine */}
              <AccordionSection title="Preços Estratégicos Recomendados" icon={<Target className="h-4 w-4 text-primary" />} defaultOpen>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-muted/20 border border-border rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Preço Mínimo</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-1">R$ {strategicPrices.breakEven.toFixed(2)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Break-even</p>
                  </div>
                  <div className="bg-muted/20 border border-border rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Margem 30%</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-1">R$ {strategicPrices.margin30.toFixed(2)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Lucro: R$ {(strategicPrices.margin30 * 0.30).toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Margem 40%</p>
                    <p className="text-lg sm:text-xl font-bold text-primary mt-1">R$ {strategicPrices.margin40.toFixed(2)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Lucro: R$ {(strategicPrices.margin40 * 0.40).toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span className="text-[10px] sm:text-xs text-primary font-medium">Recomendado</span>
                    </div>
                  </div>
                  <div className="bg-muted/20 border border-border rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Margem 50%</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-1">R$ {strategicPrices.margin50.toFixed(2)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Lucro: R$ {(strategicPrices.margin50 * 0.50).toFixed(2)}</p>
                  </div>
                </div>
              </AccordionSection>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Distribuição de Custos</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Lucro por Plano</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${v}`} />
                      <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Bar dataKey="Lucro" fill="hsl(150, 60%, 40%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Custos" fill="hsl(0, 65%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Analysis */}
              <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise da Precificação</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      O plano {best.label} {best.subtitle} oferece o melhor lucro de R$ {best.netProfit.toFixed(2)} com margem de {best.margin.toFixed(1)}%.
                    </p>
                  </div>
                  {best.margin < 0 && (
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-xs sm:text-sm text-destructive">Atenção: operação com prejuízo. Aumente o preço ou reduza custos.</p>
                    </div>
                  )}
                  {best.margin >= 0 && best.margin < 10 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Margem abaixo de 10%. Considere otimizar custos ou reajustar o preço.</p>
                    </div>
                  )}
                  {adMetrics && (
                    <div className="flex items-start gap-2">
                      <Megaphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Para anúncios pagos, seu ROAS mínimo é {adMetrics.minROAS.toFixed(2)}. Gasto máximo por venda: R$ {adMetrics.maxAdCost.toFixed(2)}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 sm:p-12 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha o custo do produto e o preço de venda para ver os resultados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
