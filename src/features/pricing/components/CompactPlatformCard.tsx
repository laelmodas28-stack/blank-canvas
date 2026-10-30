import { useState, type ReactNode } from "react";
import { TrendingUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAMES, type Platform } from "../lib/config";
import { type PriceResult } from "../lib/engine";
import { brl, percent } from "./PriceBreakdown";
import { CheckField } from "./Fields";

const KEY = "pricing-card-open";
const readOpen = (): Record<string, boolean> => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };

export function CompactPlatformCard({ platform, result, selected, winner, minimum, target, targetLabel, hasAlert, campaign, onCampaign, children }: {
  platform: Platform; result: PriceResult; selected: boolean; winner: boolean; minimum?: number; target?: number; targetLabel: string;
  hasAlert: boolean; campaign?: boolean; onCampaign?: (v: boolean) => void; children: ReactNode;
}) {
  const [open, setOpenState] = useState(() => !!readOpen()[platform]);
  const setOpen = (v: boolean) => { setOpenState(v); try { sessionStorage.setItem(KEY, JSON.stringify({ ...readOpen(), [platform]: v })); } catch { /* session only */ } };
  const optional = platform === "shopee" ? result.extra : 0;
  return <article className={`platform-${platform} rounded-lg overflow-hidden min-w-0 ${winner ? "order-first md:order-none" : ""} ${selected ? "border-2 border-[hsl(var(--platform))]" : "border border-border"}`}>
    <div className="platform-header px-4 py-3 flex flex-wrap justify-between items-center gap-2"><h2 className="text-sm font-bold">{PLATFORM_NAMES[platform]}</h2><p className="text-xs">{platform === "wholesale" ? "Sem taxa da plataforma" : `${percent(result.percent)} + ${brl(result.fixed + result.variable)} por item`}</p></div>
    <div className="p-4">
      <div className="flex flex-wrap gap-1 mb-3">
        {winner && <span className="text-[10px] font-semibold text-success border border-success/30 rounded px-2 py-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" />Mais lucrativa</span>}
        {result.estimated && <span className="text-[10px] text-warning border border-warning/30 rounded px-2 py-1">Estimado</span>}
        {hasAlert && <span className="text-[10px] text-warning border border-warning/30 rounded px-2 py-1">Degrau de preço</span>}
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <div className="min-w-0"><dt className="text-[10px] font-semibold text-muted-foreground uppercase">Valor a receber</dt><dd className="text-base sm:text-lg font-bold mt-1 break-words">{brl(result.payout)}</dd></div>
        <div className="min-w-0"><dt className="text-[10px] font-semibold text-muted-foreground uppercase">Lucro</dt><dd className={`text-base sm:text-lg font-bold mt-1 break-words ${result.profit >= 0 ? "text-success" : "text-destructive"}`}>{brl(result.profit)}</dd></div>
        <div className="min-w-0"><dt className="text-[10px] font-semibold text-muted-foreground uppercase">Margem</dt><dd className={`text-base sm:text-lg font-bold mt-1 ${result.margin >= 0 ? "text-foreground" : "text-destructive"}`}>{percent(result.margin)}</dd></div>
      </dl>
      <p className="text-[11px] text-muted-foreground mt-3">Mínimo sem prejuízo {minimum !== undefined ? brl(minimum) : "inviável"} · {targetLabel} {target !== undefined ? brl(target) : "inviável"}</p>
      {platform === "mercadolivre" && <p className="text-[11px] text-muted-foreground mt-1">Frete: {brl(result.freight + result.variable)}</p>}
      {platform === "shopee" && <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">Taxas opcionais: {brl(optional)}<button type="button" className="text-primary underline" onClick={() => setOpen(true)}>ajustar</button></p>}
      {open && <div className="mt-4 border-t border-border pt-4">
        {platform === "shopee" && onCampaign && <div className="mb-4 space-y-2"><h3 className="text-xs font-semibold">TAXAS OPCIONAIS</h3><div className="flex items-center justify-between gap-2"><CheckField label="Campanha de Destaque" checked={!!campaign} onChange={onCampaign} /><span className="text-xs whitespace-nowrap">{brl(result.extra)}</span></div></div>}
        {children}
      </div>}
      <Button variant="outline" className="w-full mt-4 text-xs" aria-expanded={open} onClick={() => setOpen(!open)}><ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />{open ? "Ocultar detalhes" : "Ver detalhes"}</Button>
    </div>
  </article>;
}
