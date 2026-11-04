import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calculator, Sparkles, ImagePlus, ArrowUpRight, ArrowRight, History, CheckCircle2, Clock3, ShieldCheck, Package, Percent, Trophy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePricingStore } from "@/features/pricing/hooks/usePricingStore";
import { PLATFORMS, PLATFORM_NAMES, type Platform } from "@/features/pricing/lib/config";
import { NumberField, parseDecimal } from "@/features/pricing/components/Fields";
import { brl, percent } from "@/features/pricing/components/PriceBreakdown";
import { DEFAULT_RATE_STATUS, formatRateDate, quickComparison, savedIndicators, marginTone } from "@/features/pricing/lib/dashboard";

const shortcuts = [
  { title: "Criar Anúncio com IA", icon: Sparkles, url: "/criar-anuncio" },
  { title: "Gerador de Imagens IA", icon: ImagePlus, url: "/gerador-imagens" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { rates, saved, profile } = usePricingStore();
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  useEffect(() => {
    if (document.getElementById("dashboard-font")) return;
    const link = document.createElement("link");
    link.id = "dashboard-font"; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
  const costNumber = parseDecimal(cost), priceNumber = parseDecimal(price);
  const ready = costNumber !== undefined && priceNumber !== undefined && priceNumber > 0;
  const comparison = ready ? quickComparison(costNumber, priceNumber, profile, rates) : null;
  const threshold = profile.lowMarginThreshold ?? 10;
  const indicators = savedIndicators(saved, threshold);
  const recent = [...saved].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const metrics = [
    { label: "Preços salvos", value: indicators ? String(indicators.count) : "—", icon: Package },
    { label: "Margem média", value: indicators ? percent(indicators.average) : "—", icon: Percent },
    { label: "Plataforma com melhor margem média", value: indicators?.best ? PLATFORM_NAMES[indicators.best] : "—", icon: Trophy },
    { label: "Atenção: margem baixa", value: indicators ? String(indicators.low) : "—", icon: AlertTriangle, warning: true },
  ];
  const resultRow = (platform: Platform, best = false) => {
    const row = platform === "wholesale" ? comparison?.wholesale : comparison?.ranked.find(item => item.platform === platform);
    return <tr key={platform} className={`border-t border-border ${best ? "bg-success/5" : ""}`}>
      <td className="py-3 pl-3 sm:pl-5"><span className="block text-xs sm:text-sm font-medium">{PLATFORM_NAMES[platform]}</span>{best && <span className="inline-flex mt-1 text-[9px] sm:text-[10px] font-semibold text-success">Mais lucrativa</span>}</td>
      <td className="py-3 text-right text-xs sm:text-sm tabular-nums">{row ? brl(row.result.payout) : "—"}</td>
      <td className={`py-3 text-right text-xs sm:text-sm font-semibold tabular-nums ${row && row.result.profit < 0 ? "text-destructive" : "text-success"}`}>{row ? brl(row.result.profit) : "—"}</td>
      <td className="py-3 pr-3 sm:pr-5 text-right text-xs sm:text-sm tabular-nums">{row ? percent(row.result.margin) : "—"}</td>
    </tr>;
  };
  return <div className="max-w-[1200px] mx-auto min-w-0 space-y-6 sm:space-y-8">
    <header className="pt-1"><p className="text-xs font-semibold text-primary mb-2">PrecificaPro</p><h1 className="text-2xl sm:text-3xl font-bold leading-tight">Olá! Quanto sobra nas suas vendas?</h1><p className="text-sm text-muted-foreground mt-3">Calcule o lucro real com as taxas e o frete de cada marketplace</p></header>
    <div className="grid grid-cols-12 gap-6 items-start">
      <section aria-label="Calculadora rápida" className="dashboard-panel col-span-12 lg:col-span-8 overflow-hidden">
        <div className="p-5 sm:p-6"><div className="flex items-center gap-3 mb-5"><div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Calculator className="h-5 w-5" /></div><h2 className="text-lg font-semibold">Calculadora rápida</h2></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><NumberField label="Custo do produto (R$)" value={cost} onChange={setCost} placeholder="0,00" /><NumberField label="Preço de venda (R$)" value={price} onChange={setPrice} placeholder="0,00" /></div></div>
        <table className="w-full table-fixed"><colgroup><col className="w-[34%]" /><col className="w-[25%]" /><col className="w-[24%]" /><col className="w-[17%]" /></colgroup><thead className="bg-secondary/50"><tr className="text-[10px] sm:text-xs text-muted-foreground"><th className="pl-3 sm:pl-5 py-3 text-left font-medium">Plataforma</th><th className="py-3 text-right font-medium">Você recebe</th><th className="py-3 text-right font-medium">Lucro</th><th className="pr-3 sm:pr-5 py-3 text-right font-medium">Margem</th></tr></thead><tbody>{(comparison?.ranked.map(row => row.platform) ?? PLATFORMS.filter(p => p !== "wholesale")).map((p, i) => resultRow(p, Boolean(comparison && i === 0)))}<tr className="border-t border-border"><td colSpan={4} className="px-3 sm:px-5 pt-4 pb-1 text-[10px] text-muted-foreground">VENDA DIRETA · SEM TAXA DE MARKETPLACE</td></tr>{resultRow("wholesale")}</tbody></table>
        <div className="p-5 sm:p-6 border-t border-border space-y-3">{ready && <p className="text-xs text-muted-foreground">{comparison?.ranked.some(row => row.result.estimated) ? "Valores estimados com os padrões da loja; confirme custos e frete." : "Valores calculados com os padrões da loja."}</p>}<Button className="w-full sm:w-auto" onClick={() => navigate("/precificacao", { state: { quickPrice: { cost, price } } })}>Abrir no Lucro Certo<ArrowRight className="h-4 w-4" /></Button></div>
      </section>
      <aside aria-label="Status das taxas" className="dashboard-panel col-span-12 lg:col-span-4 p-5 sm:p-6"><div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="text-base font-semibold">Status das taxas</h2></div><p className="text-[11px] text-muted-foreground mb-5">Situação informada pela loja</p><div className="divide-y divide-border">{PLATFORMS.map(p => {
        const status = rates.status?.[p]?.label ?? DEFAULT_RATE_STATUS[p];
        const confirmed = status.startsWith("Confirmado") || p === "wholesale";
        return <div key={p} className="py-3 first:pt-0"><div className="flex justify-between gap-2 mb-2"><span className="text-sm font-semibold">{PLATFORM_NAMES[p]}</span><time className="text-[10px] text-muted-foreground shrink-0">{formatRateDate(rates.status?.[p]?.date ?? rates.updatedAt)}</time></div><span className={`inline-flex items-start gap-1.5 text-[10px] leading-relaxed rounded-md px-2 py-1 ${confirmed ? "text-success bg-success/5" : "text-warning bg-warning/5"}`}>{confirmed ? <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" /> : <Clock3 className="h-3 w-3 shrink-0 mt-0.5" />}{status}</span></div>;
      })}</div><Button asChild variant="ghost" className="px-0 h-auto mt-4 text-primary"><Link to="/taxas">Ver taxas<ArrowUpRight className="h-4 w-4" /></Link></Button></aside>
      <section aria-label="Indicadores dos preços salvos" className="col-span-12"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{metrics.map(metric => <article key={metric.label} className="dashboard-panel p-5"><div className="flex justify-between gap-3 items-start mb-4"><p className="text-xs text-muted-foreground leading-relaxed">{metric.label}</p><metric.icon className={`h-4 w-4 shrink-0 ${metric.warning ? "text-destructive" : "text-primary"}`} /></div><p className={`text-xl font-semibold ${metric.warning && indicators?.low ? "text-destructive" : "text-foreground"}`}>{metric.value}</p></article>)}</div>{!indicators && <p className="text-xs text-muted-foreground mt-3">Salve um preço no Lucro Certo para ver os indicadores</p>}</section>
      <section className="dashboard-panel col-span-12 overflow-hidden"><div className="flex items-center justify-between flex-wrap gap-3 p-5 sm:p-6"><h2 className="text-base font-semibold">Preços salvos recentemente</h2><Button asChild variant="ghost" className="text-primary h-auto p-0"><Link to="/historico"><History className="h-3.5 w-3.5" />Ver todos<ArrowUpRight className="h-3.5 w-3.5" /></Link></Button></div>{!recent.length ? <div className="border-t border-border py-10 text-center text-sm text-muted-foreground">Nenhum preço salvo ainda.</div> : <table className="w-full table-fixed text-xs sm:text-sm"><thead className="text-muted-foreground bg-secondary/50"><tr>{["Produto", "Plataforma", "Preço", "Lucro", "Margem"].map(label => <th key={label} className="px-2 sm:px-5 py-3 text-left font-medium">{label}</th>)}</tr></thead><tbody>{recent.map(item => <tr key={item.id} className="border-t border-border"><td className="px-2 sm:px-5 py-4 font-medium break-words">{item.product}</td><td className="px-2 sm:px-5 py-4 break-words">{PLATFORM_NAMES[item.platform]}</td><td className="px-2 sm:px-5 py-4 tabular-nums">{brl(item.price)}</td><td className={`px-2 sm:px-5 py-4 tabular-nums ${item.result.profit < 0 ? "text-destructive" : "text-success"}`}>{brl(item.result.profit)}</td><td className={`px-2 sm:px-5 py-4 tabular-nums font-medium ${marginTone(item.result.margin, threshold)}`}>{percent(item.result.margin)}</td></tr>)}</tbody></table>}</section>
      <section aria-label="Atalhos" className="col-span-12"><h2 className="text-base font-semibold mb-4">Atalhos</h2><div className="grid sm:grid-cols-2 gap-4">{shortcuts.map(shortcut => <Button key={shortcut.url} asChild variant="outline" className="dashboard-panel h-auto p-5 justify-start gap-4 whitespace-normal"><Link to={shortcut.url}><span className="p-2.5 bg-primary/10 text-primary rounded-lg"><shortcut.icon className="h-5 w-5" /></span><span className="text-sm font-semibold flex-1 text-left">{shortcut.title}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" /></Link></Button>)}</div></section>
    </div><p className="text-[11px] text-muted-foreground pb-2">Seus preços, padrões e taxas ficam salvos apenas neste dispositivo.</p>
  </div>;
}
