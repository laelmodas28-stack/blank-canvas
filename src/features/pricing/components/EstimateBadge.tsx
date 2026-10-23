import { type PriceResult } from "../lib/engine";
export function EstimateBadge({ result }: { result: PriceResult }) {
  if (!result.estimated) return <span className="text-[10px] border border-success/30 text-success rounded px-2 py-1">Confirmado</span>;
  return <details className="relative text-[10px] text-warning group"><summary title={`A confirmar: ${result.estimates.join(", ")}`} className="cursor-pointer list-none border border-warning/30 rounded px-2 py-1">Estimado</summary><div className="absolute right-0 top-full z-20 mt-1 w-48 bg-background border border-border shadow-md rounded p-3 text-xs text-foreground"><p className="font-semibold mb-1">A confirmar</p><ul className="space-y-1">{result.estimates.map(s => <li key={s}>{s}</li>)}</ul></div></details>;
}