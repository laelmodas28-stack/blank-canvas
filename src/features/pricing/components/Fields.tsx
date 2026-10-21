import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
export const inputClass = "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
/** Parses user text accepting comma or dot decimals; empty or invalid text is "not informed". */
export function parseDecimal(text: string | number | undefined | null): number | undefined {
  if (text === undefined || text === null) return undefined;
  const s = String(text).trim().replace(",", ".");
  if (s === "" || s === "." || s === "-") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
const sanitize = (raw: string) => {
  let s = raw.replace(/[^0-9.,]/g, "");
  const i = s.search(/[.,]/);
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, "");
  return s.replace(/^0+(?=\d)/, "");
};
/** Text-backed numeric field. Emits a dot-normalized string ("" when cleared). */
export function NumberField({ label, value, onChange, hint, placeholder, min = 0, max }: { label: string; value: number | string | undefined; onChange: (v: string) => void; hint?: string; placeholder?: string; min?: number; max?: number }) {
  const id = useId();
  const [text, setText] = useState(value === undefined || value === null ? "" : String(value).replace(".", ","));
  useEffect(() => {
    if (parseDecimal(text) !== parseDecimal(value as string)) setText(value === undefined || value === "" ? "" : String(value).replace(".", ","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const emit = (t: string) => { setText(t); const n = parseDecimal(t); onChange(t.replace(",", ".")); };
  return <div className="min-w-0"><label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label><input id={id} type="text" inputMode="decimal" autoComplete="off" placeholder={placeholder} aria-valuemin={min} aria-valuemax={max} value={text} onFocus={e => e.currentTarget.select()} onChange={e => emit(sanitize(e.target.value))}  className={inputClass} />{hint && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{hint}</p>}</div>;
}
export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-3 py-2 text-sm cursor-pointer"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-primary shrink-0" /><span>{label}</span></label>;
}
export function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map(o => <Button key={o.value} variant="outline" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className={value === o.value ? "platform-selected flex-1" : "flex-1"}>{o.label}</Button>)}</div>;
}
