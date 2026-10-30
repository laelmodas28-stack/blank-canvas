import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calculator, SlidersHorizontal, Save, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORMS, PLATFORM_NAMES, type Platform } from "@/features/pricing/lib/config";
import { calculatePrice, solvePrice, nextTierScenario, thresholdAlerts, type PricingInput } from "@/features/pricing/lib/engine";
import { usePricingStore, savePrice, type SavedPrice } from "@/features/pricing/hooks/usePricingStore";
import { NumberField, Segmented, inputClass, parseDecimal } from "@/features/pricing/components/Fields";
import { PlatformOptions } from "@/features/pricing/components/PlatformOptions";
import { PriceBreakdown, brl, percent, profitLabel } from "@/features/pricing/components/PriceBreakdown";
import { AppliedRule } from "@/features/pricing/components/AppliedRule";
import { ShippingFields, shippingInput } from "@/features/pricing/components/ShippingFields";
import { RealSaleCheck } from "@/features/pricing/components/RealSaleCheck";
import { toast } from "sonner";
import { resolveDefaults } from "@/features/pricing/lib/profile";
import { EstimateBadge } from "@/features/pricing/components/EstimateBadge";
import { runPricingAudit } from "@/features/pricing/lib/audit";
import { ExplainPrice } from "@/features/pricing/components/ExplainPrice";
import { CompactPlatformCard } from "@/features/pricing/components/CompactPlatformCard";
export function Metric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) { return <div className="border border-border rounded-lg p-4 min-w-0"><p className="text-xs text-muted-foreground mb-2">{label}</p><p className={`text-xl font-bold break-words ${positive ? "text-success" : "text-foreground"}`}>{value}</p></div>; }
export default function Precificacao({ idealMode = false }: { idealMode?: boolean }) {
  const { rates: liveRates, saved, profile } = usePricingStore();
  const location = useLocation();
  const restored = (location.state as { savedPrice?: SavedPrice } | null)?.savedPrice;
  const rates = restored?.rates ?? liveRates;
  const auditFailures = runPricingAudit().filter(check => !check.passed);
  const [platform, setPlatform] = useState<Platform>(restored?.platform ?? (PLATFORMS.includes(profile.defaultPlatform as Platform) ? profile.defaultPlatform as Platform : "shopee"));
  const [view, setView] = useState("compare");
  const [product, setProduct] = useState(restored?.product ?? "");
  const [mode, setMode] = useState(idealMode ? "margin" : "price");
  const str = (n?: number) => n === undefined ? "" : String(n);
  const [cost, setCost] = useState(str(restored?.input.cost));
  const [tax, setTax] = useState(str(restored?.input.tax));
  const [packaging, setPackaging] = useState(str(restored?.input.packaging));
  const [ads, setAds] = useState(str(restored?.input.ads));
  const [adsMode, setAdsMode] = useState<"percent" | "fixed">(restored?.input.adsMode ?? "percent");
  const [salePrice, setSalePrice] = useState(str(restored?.price));
  const [margin, setMargin] = useState("");
  const [freights, setFreights] = useState<Partial<Record<Platform, string>>>(restored ? { [restored.platform]: str(restored.input.freight) } : {});
  const [shippingTexts, setShippingTexts] = useState<Partial<Record<Platform, Record<string,string>>>>(restored ? { [restored.platform]: Object.fromEntries(Object.entries(restored.input.tierShipping ?? {}).map(([k,v]) => [k,str(v)])) } : {});
  const [bonuses, setBonuses] = useState<Partial<Record<Platform,string>>>(restored ? { [restored.platform]: str(restored.input.bonus) } : {});
  const [discounts, setDiscounts] = useState<Partial<Record<Platform,string>>>(restored ? { [restored.platform]: str(restored.input.discount) } : {});
  const [options, setOptions] = useState<Partial<Record<Platform, Partial<PricingInput>>>>(restored ? { [restored.platform]: restored.input } : {});
  const [testPrices, setTestPrices] = useState<Partial<Record<Platform, string>>>({});
  const [marketText, setMarket] = useState("");
  const market = parseDecimal(marketText) ?? 0;
  const [targetRoasText, setTargetRoas] = useState("");
  const targetRoas = parseDecimal(targetRoasText) ?? 0;
  const [desiredRoasText, setDesiredRoas] = useState("");
  const desiredRoas = parseDecimal(desiredRoasText) ?? 0;
  const [quantityText, setQuantity] = useState("");
  const quantity = parseDecimal(quantityText) ?? 0;
  const costN = parseDecimal(cost), hasCost = costN !== undefined;
  const marginInput = parseDecimal(margin), marginUsed = marginInput ?? profile.margin ?? 30;
  const marginLabel = `Preço para margem de ${percent(marginUsed)}${marginInput === undefined ? " (padrão)" : ""}`;
  const informed = parseDecimal(salePrice), hasPrice = informed !== undefined && informed > 0;
  const inputFor = (p: Platform): PricingInput => {
    const raw: PricingInput = { document: "cnpj", category: "vestidos", ...options[p], cost: costN ?? 0, tax: parseDecimal(tax) ?? 0, packaging: parseDecimal(packaging) ?? 0, ads: parseDecimal(ads) ?? 0, adsMode, freight: parseDecimal(freights[p]), tierShipping: shippingInput(shippingTexts[p] ?? {}), bonus: parseDecimal(bonuses[p]), discount: parseDecimal(discounts[p]) };
    const resolved = resolveDefaults(raw, profile, { tax: parseDecimal(tax) === undefined, packaging: parseDecimal(packaging) === undefined, ads: parseDecimal(ads) === undefined });
    if (restored?.platform === p) return { ...resolved, origins: { ...resolved.origins, ...restored.input.origins }, weightDefault: restored.input.weightDefault ?? resolved.weightDefault };
    return resolved;
  };
  const input = inputFor(platform);
  const margin_ = marginUsed;
  const update = (patch: Partial<PricingInput>) => setOptions(previous => ({ ...previous, [platform]: { ...previous[platform], ...patch } }));
  const ideal = solvePrice(platform, input, margin_, rates);
  const currentPrice = mode === "margin" || !hasPrice ? (ideal?.price ?? 0) + (input.discount ?? 0) : informed;
  const result = calculatePrice(platform, currentPrice, input, rates);
  const breakEven = solvePrice(platform, input, 0, rates);
  const beforeAds = calculatePrice(platform, currentPrice, { ...input, ads: 0 }, rates);
  const minRoas = beforeAds.profit > 0 ? result.price / beforeAds.profit : null;
  const next = nextTierScenario(platform, result.price, { ...input, discount: 0 }, rates);
  const nextResult = next ? calculatePrice(platform, next.price, { ...input, discount: 0 }, rates) : null;
  const comparisons = PLATFORMS.map(p => {
    const data = inputFor(p), target = solvePrice(p, data, marginUsed, rates), tested = parseDecimal(testPrices[p]);
    const targetResult = target ? calculatePrice(p, target.price, { ...data, discount: 0 }, rates) : null;
    const informedResult = hasPrice ? calculatePrice(p, informed, data, rates) : null;
    const usedPrice = tested ?? (mode === "price" && hasPrice ? informed : (target?.price ?? 0) + (data.discount ?? 0));
    const displayed = calculatePrice(p, usedPrice, data, rates);
    const rankProfit = displayed.profit;
    return { platform: p, input: data, target, targetResult, informedResult, rankProfit, result: calculatePrice(p, usedPrice, data, rates), minimum: solvePrice(p, data, 0, rates) };
  });
  const best = [...comparisons].sort((a,b) => b.rankProfit - a.rankProfit)[0];
  const winner = hasCost && best && Number.isFinite(best.rankProfit) ? best.platform : undefined;
  const persist = (p: Platform, price: number) => {
    if (!product.trim()) { toast.error("Informe o nome ou SKU do produto para salvar o preço."); document.getElementById("product-name")?.focus(); return; }
    try { const normalized = { ...inputFor(p), discount: 0 }; savePrice(product, p, normalized, calculatePrice(p, price, normalized, rates), rates); toast.success("Preço salvo neste dispositivo."); } catch { toast.error("Não foi possível salvar neste dispositivo."); }
  };
  const missingCosts = [[input.tax,"Imposto"],[input.packaging,"embalagem"],[input.ads,"ads"]].filter(([v]) => v === 0).map(([,l]) => l as string);
  const valid = input.tax <= 100 && marginUsed < 100;
  return <div className={`max-w-[1500px] mx-auto min-w-0 platform-${platform}`}>
    {auditFailures.length > 0 && <div role="alert" className="mb-4 border border-destructive text-destructive rounded p-3 text-sm">Auditoria de cálculo falhou: {auditFailures.map(c => c.id).join(", ")}. Revise os resultados antes de decidir.</div>}
    <header className="flex flex-wrap items-center justify-between gap-4 mb-6"><div className="flex items-center gap-3 min-w-0"><div className="platform-header rounded-lg p-3 shrink-0"><Calculator className="h-5 w-5" /></div><div><h1 className="text-xl sm:text-2xl font-bold">{idealMode ? "Preço Ideal" : "Calculadora de Precificação"}</h1><p className="text-xs text-muted-foreground mt-1">{PLATFORM_NAMES[platform]} · Taxas {rates.version.split("T")[0]}</p></div></div><Button asChild variant="outline"><Link to="/taxas"><SlidersHorizontal className="h-4 w-4" />Taxas</Link></Button></header>
    <div className="mb-6"><Segmented value={view} onChange={setView} options={[{ value: "individual", label: "Calculadora individual" }, { value: "compare", label: "Comparar plataformas" }, { value: "real", label: "Conferir venda real" }]} /></div>
    <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
      <aside className="min-w-0 space-y-5">
        <section className="border-b border-border pb-5 space-y-4"><h2 className="text-sm font-semibold">Seu produto</h2><NumberField label="Custo do produto (R$)" placeholder="10,00" value={cost} onChange={setCost} /><NumberField label="Preço de venda (R$)" placeholder="29,90" value={salePrice} onChange={setSalePrice} /><NumberField label="Margem alvo (%)" placeholder="30" value={margin} max={99} onChange={setMargin} /></section>
        <details className="border-b border-border pb-5"><summary className="text-sm font-semibold cursor-pointer">Mais opções</summary><div className="space-y-5 mt-4"><div className="space-y-4"><h2 className="text-xs font-semibold text-muted-foreground">PLATAFORMA PRINCIPAL</h2><div className="grid grid-cols-2 gap-2">{PLATFORMS.map(p => <Button key={p} variant="outline" aria-pressed={platform === p} onClick={() => setPlatform(p)} className={platform === p ? `platform-${p} platform-selected` : ""}>{PLATFORM_NAMES[p]}</Button>)}</div><PlatformOptions platform={platform} input={{ ...input, weight: options[platform]?.weight, reputation: options[platform]?.reputation }} rates={rates} onChange={update} /></div><div className="space-y-4"><div><label htmlFor="product-name" className="text-xs font-medium text-muted-foreground block mb-1.5">Nome ou SKU do produto</label><input id="product-name" className={inputClass} value={product} onChange={e => setProduct(e.target.value)} placeholder="Nome ou código do produto" /></div><Segmented value={mode} onChange={setMode} options={[{ value: "price", label: "Definir Preço" }, { value: "margin", label: "Definir Margem" }]} /><NumberField label="Alíquota de Impostos (%)" placeholder="7" value={tax} max={100} onChange={setTax} /><NumberField label="Embalagem e etiqueta (R$)" placeholder="0,00" value={packaging} onChange={setPackaging} /><div className="space-y-3"><h3 className="text-xs font-semibold text-muted-foreground">ENVIO · {PLATFORM_NAMES[platform]}</h3><ShippingFields platform={platform} rates={rates} values={platform === "mercadolivre" ? shippingTexts[platform] ?? {} : { freight: freights[platform] ?? "" }} onChange={(key,text) => platform === "mercadolivre" ? setShippingTexts(old => ({ ...old,[platform]:{ ...old[platform],[key]:text } })) : setFreights(old => ({ ...old,[platform]:text }))} /></div><NumberField label="Descontos e bônus recebidos (R$)" value={bonuses[platform] ?? ""} onChange={v => setBonuses(old => ({ ...old,[platform]:v }))} /><Segmented options={[{ value: "percent", label: "Ads em %" }, { value: "fixed", label: "Ads em R$" }]} value={adsMode} onChange={v => setAdsMode(v as "percent" | "fixed")} /><NumberField label={adsMode === "percent" ? "Ads (%)" : "Ads por venda (R$)"} placeholder="0" value={ads} onChange={setAds} /><NumberField label="Desconto do vendedor (R$)" value={discounts[platform] ?? ""} onChange={v => setDiscounts(old => ({ ...old,[platform]:v }))} /></div></div></details>
        <details className="border-b border-border pb-5" open={quantity > 0}><summary className="text-sm font-semibold cursor-pointer">Projeção de Vendas</summary><div className="space-y-3 mt-4"><NumberField label="Preço Médio do Mercado (R$)" value={marketText} onChange={setMarket} /><NumberField label="Meta de ROAS" value={targetRoasText} onChange={setTargetRoas} /><NumberField label="ROAS Desejado (opcional)" value={desiredRoasText} onChange={setDesiredRoas} /><NumberField label="Estimativa de Vendas no Mês" value={quantityText} onChange={setQuantity} /></div></details>
        <p className="text-xs text-muted-foreground">Preços e taxas salvos neste dispositivo. Confira sempre na Central do Vendedor de cada plataforma.</p>
      </aside>
      <main className="min-w-0 space-y-6">
        {view === "real" ? <RealSaleCheck platform={platform} product={product} inputFor={inputFor} rates={rates} /> : !hasCost ? <p className="text-sm text-warning border border-warning/30 rounded-lg p-6 text-center">Custo do produto ainda não preenchido.</p> : !valid ? <p className="text-destructive">Revise os valores: custos não podem ser negativos e a margem precisa ser menor que 100%.</p> : view === "compare" ? <>
          {missingCosts.length > 0 && <p role="status" className="text-xs text-warning border border-warning/30 rounded-lg px-3 py-2">{missingCosts.length > 1 ? `${missingCosts.slice(0,-1).join(", ")} e ${missingCosts[missingCosts.length-1]}` : missingCosts[0]} não {missingCosts.length > 1 ? "preenchidos" : "preenchido"}: o lucro é antes desses custos.</p>}
          <section className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-xs text-muted-foreground text-left"><th className="py-2 font-medium">Plataforma</th><th className="py-2 font-medium text-right">Você recebe</th><th className="py-2 font-medium text-right">Lucro</th><th className="py-2 font-medium text-right">Margem</th></tr></thead><tbody>{[...comparisons].sort((x,y) => y.rankProfit - x.rankProfit).map(c => <tr key={c.platform} className={`border-t border-border ${winner === c.platform ? "font-semibold" : ""}`}><td className="py-2">{PLATFORM_NAMES[c.platform]}{winner === c.platform && <span className="ml-2 text-[10px] text-success border border-success/30 rounded px-1.5 py-0.5">Mais lucrativa</span>}</td><td className="py-2 text-right whitespace-nowrap">{brl(c.result.payout)}</td><td className={`py-2 text-right whitespace-nowrap ${c.result.profit >= 0 ? "text-success" : "text-destructive"}`}>{brl(c.result.profit)}</td><td className="py-2 text-right">{percent(c.result.margin)}</td></tr>)}</tbody></table></section>
          <div className="flex flex-col md:grid md:grid-cols-2 2xl:grid-cols-3 gap-4">{comparisons.map(c => {
            const last = saved.find(s => s.platform === c.platform && s.product === product.trim());
            const alerts = thresholdAlerts(c.platform,c.result.price,c.input,rates);
            return <CompactPlatformCard key={c.platform} platform={c.platform} result={c.result} winner={winner === c.platform} minimum={c.minimum?.price} target={c.target?.price} targetMargin={marginUsed}>
              <ExplainPrice platform={c.platform} result={c.result} input={c.input} />
              {(alerts.length > 0 || c.target?.atStep) && <div className="mt-3 space-y-1">{c.target?.atStep && <p className="text-xs text-warning">Preço alvo fica no início de uma faixa; margem real {percent(c.targetResult?.margin ?? 0)}.</p>}{alerts.map(a => <p key={a.threshold} className="text-xs text-warning">Em {brl(a.threshold)} o lucro {a.profitLoss > 0 ? "cai" : "sobe"} {brl(Math.abs(a.profitLoss))}.</p>)}</div>}
              <div className="mt-4"><NumberField label="Testar outro preço" placeholder={c.result.price ? c.result.price.toFixed(2).replace(".", ",") : ""} value={testPrices[c.platform] ?? ""} onChange={v => setTestPrices(previous => ({ ...previous, [c.platform]: v }))} /></div>
              <div className="mt-4 flex items-center justify-between gap-2"><p className="text-[11px] text-muted-foreground">{last ? `Salvo ${brl(last.price)}` : "Nenhum preço salvo"}</p><Button className="platform-selected shrink-0 text-xs px-3" disabled={c.result.price <= 0} onClick={() => persist(c.platform, c.result.price)}><Save className="h-3 w-3" />Salvar {brl(c.result.price)}</Button></div>
            </CompactPlatformCard>;
          })}</div>
        </> : <>
          {(hasPrice || mode === "margin") && <><div className={`flex items-center gap-2 text-sm ${result.margin >= 15 ? "text-success" : "text-warning"}`}>{result.margin >= 15 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}<span>{result.margin >= 15 ? "Margem saudável" : result.profit < 0 ? "Risco de prejuízo" : "Margem baixa — considere ajustar o preço"}</span></div>
          {mode === "margin" && !ideal && <p className="text-destructive">Margem inviável com estes custos e taxas.</p>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label={profitLabel(result,input)} value={brl(result.profit)} positive={result.profit >= 0} /><Metric label="Margem de Lucro" value={percent(result.margin)} positive={result.margin >= 15} /><Metric label="Custo Total" value={brl(result.totalCosts)} /><Metric label="Break-even" value={breakEven ? brl(breakEven.price) : "Inviável"} /></div>
          <section className="border-b border-border pb-6"><div className="flex flex-wrap justify-between items-start gap-4"><div><h2 className="text-lg font-semibold">{PLATFORM_NAMES[platform]} · {brl(result.price)}</h2><EstimateBadge result={result} /><AppliedRule platform={platform} result={result} /><p className="text-xs text-muted-foreground mt-1">Comissão: {brl(result.commission)} · Tarifa fixa: {brl(result.fixed)} · ROI: {percent(result.roi)}</p></div><Button className="platform-selected" onClick={() => persist(platform, result.price)} disabled={result.price <= 0}><Save className="h-4 w-4" />Salvar preço</Button></div><div className="max-w-xl mt-4"><PriceBreakdown result={result} input={input} /></div></section>
          </>}
          {!hasPrice && mode === "price" && <div className="grid grid-cols-2 gap-3"><Metric label="Mínimo sem prejuízo" value={breakEven ? brl(breakEven.price) : "Inviável"} /><Metric label={marginLabel} value={ideal ? brl(ideal.price) : "Inviável"} /><p className="col-span-2 text-xs text-muted-foreground">{ideal ? `Margem alvo na faixa a partir de ${brl(calculatePrice(platform,ideal.price,{...input,discount:0},rates).tier?.min ?? 0)}.` : ""}</p></div>}
          {(hasPrice || mode === "margin") && thresholdAlerts(platform, result.price, input, rates).map(a => <div key={a.threshold} className="text-sm text-warning border-l-2 border-warning pl-4"><p>{platform === "mercadolivre" ? `Em ${brl(a.threshold)} o custo muda de ${brl(a.beforeShipping)} (custo por unidade) para ${brl(a.afterShipping)} (frete).` : `Em ${brl(a.threshold)} a taxa fixa muda de ${brl(a.beforeFee)} para ${brl(a.afterFee)}.`}</p><p className="text-xs mt-1">{a.profitLoss > 0 ? `Ao cruzar, o lucro cai ${brl(a.profitLoss)}.` : `Ao cruzar, o lucro aumenta ${brl(-a.profitLoss)} pela mudança de custos e comissão.`}</p>{platform === "mercadolivre" && <p className="text-xs mt-1">{a.missingShipping ? "Comparação com frete estimado; confirme os valores da tabela." : a.profitLoss > 0 ? `Mais lucrativo antes do degrau: ${brl(a.suggestedPrice)}.` : `Não há queda de lucro neste degrau; preço logo abaixo: ${brl(a.suggestedPrice)}.`}</p>}</div>)}
          {(hasPrice || mode === "margin") && <><section><h2 className="text-sm font-semibold mb-3">Comparação de planos · mesma plataforma</h2><div className="grid sm:grid-cols-2 gap-3"><Metric label="Preço atual / lucro" value={`${brl(result.price)} / ${brl(result.profit)}`} />{nextResult ? <Metric label="Próxima faixa: preço mínimo para manter o lucro" value={`${brl(nextResult.price)} / ${brl(nextResult.profit)}`} /> : <div className="text-sm text-muted-foreground border border-border rounded-lg p-4">Não há próxima faixa viável para esta configuração.</div>}</div></section>
          <section><h2 className="text-sm font-semibold mb-4">Motor de Anúncios e ROAS</h2><div className="grid grid-cols-2 lg:grid-cols-3 gap-3"><Metric label="Gasto Máximo por Venda" value={brl(Math.max(0, beforeAds.profit))} /><Metric label="ROAS Mínimo" value={minRoas ? minRoas.toFixed(2).replace(".", ",") : "Inviável"} /><Metric label={`Gasto Recomendado (${rates.recommendedAdsPercent}%)`} value={brl(Math.max(0, result.profit * rates.recommendedAdsPercent / 100))} /></div><h3 className="text-xs font-semibold text-muted-foreground mt-5 mb-3">SIMULADOR DE ROAS</h3><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[2,3,4,5].map(roas => { const spend = result.price/roas, profit = beforeAds.profit-spend; return <div key={roas} className="rounded-lg border border-border p-4"><p className="text-xs font-semibold">ROAS {roas}</p><p className="text-xs text-muted-foreground mt-3">Custo do Anúncio</p><p className="text-sm font-semibold">{brl(spend)}</p><p className="text-xs text-muted-foreground mt-2">Lucro Final</p><p className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{brl(profit)}</p><p className="text-xs text-muted-foreground">{percent(result.price > 0 ? profit / result.price * 100 : 0)}</p></div>; })}</div></section>
          {idealMode && <section><h2 className="text-sm font-semibold mb-3">Preços por Margem</h2><div className="grid grid-cols-3 gap-3">{[30,40,50].map(m => <Metric key={m} label={`Margem ${m}%`} value={solvePrice(platform, input, m, rates) ? brl(solvePrice(platform, input, m, rates)?.price ?? 0) : "Inviável"} />)}</div></section>}
          {market > 0 && <p className={`text-sm ${result.price > market ? "text-warning" : "text-success"}`}>{result.price > market ? "Seu preço está acima da média do mercado" : "Seu preço está competitivo no mercado"} ({brl(market)}).</p>}
          {quantity > 0 && <section><h2 className="text-sm font-semibold mb-3">Projeção de Vendas e Faturamento</h2><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Estimativa de Vendas" value={`${quantity} un.`} /><Metric label="Faturamento Estimado" value={brl(result.price * quantity)} /><Metric label="Investimento em Anúncios" value={brl((desiredRoas || targetRoas) > 0 ? result.price * quantity / (desiredRoas || targetRoas) : result.adsAmount * quantity)} /><Metric label="Lucro Líquido Mensal após Anúncios" value={brl((desiredRoas || targetRoas) > 0 ? beforeAds.profit * quantity - result.price * quantity / (desiredRoas || targetRoas) : result.profit * quantity)} /></div></section>}
          </>}
        </>}
      </main>
    </div>
  </div>;
}
