import { useState, type ReactNode } from "react";
import { TrendingUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAMES, type Platform } from "../lib/config";
import { type PriceResult } from "../lib/engine";
import { brl, percent } from "./PriceBreakdown";

const KEY = "pricing-card-open";
const readOpen = (): Record<string, boolean> => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };

export function CompactPlatformCard({ platform, result, winner, minimum, target, targetMargin, children }: {
  platform: Platform; result: PriceResult; winner: boolean; minimum?: number; target?: number; targetMargin: number; children: ReactNode;
}) {
  const [open, setOpenState] = useState(() => !!readOpen()[platform]);
  const setOpen = (v: boolean) => { setOpenState(v); try { sessionStorage.setItem(KEY, JSON.stringify({ ...readOpen(), [platform]: v })); } catch { /* session only */ } };
  const shipping = result.variable + result.freight;
  return <article className={`platform-${platform} rounded-lg overflow-hidden min-w-0 border border-border ${winner ? "order-first md:order-none" : ""}`}>
    <div className="platform-header px-4 py-3 flex flex-wrap justify-between items-center gap-2"><h2 className="text-sm font-bold flex items-center gap-2">{PLATFORM_NAMES[platform]}{winner && <TrendingUp className="h-4 w-4" aria-label="Mais lucrativa" />}</h2><p className="text-xs">{platform === "wholesale" ? "Sem taxa" : `${percent(result.percent)}${result.fixed > 0 ? ` + ${brl(result.fixed)}` : ""}${shipping > 0 ? ` · frete ${brl(shipping)}` : ""}`}</p></div>
    <div className="p-4">
      {winner && <p className="text-[11px] font-semibold text-success mb-2">Mais lucrativa</p>}
      <dl className="grid grid-cols-3 gap-2">
        <div className="min-w-0"><dt className="text-[10px] font-semibold text-muted-foreground uppercase">Você recebe</dt><dd className="text-base sm:text-lg font-bold mt-1 break-words">{brl(result.payout)}</dd></div>
        <div className="min-w-0"><dt className="text-[10px] font-semibold text-muted-foreground uppercase">Lucro</dt><dd className={`text-base sm:text-lg font-bold mt-1 break-words ${result.profit >= 0 ? "text-success" : "text-destructive"}`}>{brl(result.profit)}</dd></div>
        <div className="min-w-0"><dt className="text-[10px] font-semibold text-muted-foreground uppercase">Margem</dt><dd className={`text-base sm:text-lg font-bold mt-1 ${result.margin >= 0 ? "text-foreground" : "text-destructive"}`}>{percent(result.margin)}</dd></div>
      </dl>
      <p className="text-[11px] text-muted-foreground mt-3">Preço mínimo {minimum !== undefined ? brl(minimum) : "inviável"} · Preço para {percent(targetMargin).replace(",0", "")} de margem {target !== undefined ? brl(target) : "inviável"}</p>
      {open && <div className="mt-4 border-t border-border pt-4">{children}</div>}
      <Button variant="outline" className="w-full mt-4 text-xs" aria-expanded={open} onClick={() => setOpen(!open)}><ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />{open ? "Fechar explicação" : "Como chegamos nesse valor?"}</Button>
    </div>
  </article>;
}
