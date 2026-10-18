import { useId } from "react";
import { Button } from "@/components/ui/button";
export const inputClass = "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function NumberField({ label, value, onChange, hint, min = 0, max }: { label: string; value: number | string; onChange: (v: string) => void; hint?: string; min?: number; max?: number }) {
  const id = useId(); return <div className="min-w-0"><label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label><input id={id} type="number" step="0.01" min={min} max={max} value={value} onChange={e => onChange(e.target.value)} className={inputClass} />{hint && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{hint}</p>}</div>;
}
export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-3 py-2 text-sm cursor-pointer"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-primary shrink-0" /><span>{label}</span></label>;
}
export function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map(o => <Button key={o.value} variant="outline" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className={value === o.value ? "platform-selected flex-1" : "flex-1"}>{o.label}</Button>)}</div>;
}
