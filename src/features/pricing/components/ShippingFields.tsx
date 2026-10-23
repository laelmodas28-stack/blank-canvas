import { type Platform, type RateConfig } from "../lib/config";
import { type PricingInput } from "../lib/engine";
import { NumberField, parseDecimal, inputClass, Segmented } from "./Fields";
import { brl } from "./PriceBreakdown";
export function ShippingFields({ platform, rates, values, onChange }: { platform: Platform; rates: RateConfig; values: Record<string,string>; onChange: (key: string, text: string) => void }) {
  if (platform === "wholesale") return <p className="text-xs text-muted-foreground">Atacado: sem comissão e sem tarifa; frete por conta do cliente.</p>;
  if (platform === "mercadolivre") return (
    <div className="space-y-3">
      {rates.mercadolivre.tiers.map(t => {
        const costLabel = t.shippingKind === "unit" ? "Custo de envio/unidade" : "Frete Mercado Envios por sua conta";
        const rangeLabel = t.max === null ? `a partir de ${brl(t.min)}` : `${brl(t.min)} a ${brl(t.max)}`;
        return <NumberField key={t.min} label={`${costLabel} · ${rangeLabel}`} value={values[String(t.min)] ?? ""} onChange={text => onChange(String(t.min), text)} hint="Opcional; vazio usa a tabela de peso e preço." />;
      })}
    </div>
  );
  return <NumberField label={platform === "shopee" ? "Frete/custo a cargo do vendedor (R$)" : "Frete a cargo do vendedor (R$)"} value={values.freight ?? ""} onChange={text => onChange("freight", text)} hint="Opcional; frete não confirmado recebe selo de estimativa." />;
}
export function ShippingOptions({ input, onChange }: { input: PricingInput; onChange: (patch: Partial<PricingInput>) => void }) {
  return <div className="space-y-3"><Segmented value={input.logistics ?? "standard"} onChange={v => onChange({ logistics: v as "standard" | "flex" })} options={[{ value: "standard", label: "Coleta/Agências" }, { value: "flex", label: "Flex" }]} /><label className="block text-xs font-medium text-muted-foreground">Reputação<select className={`${inputClass} mt-1.5`} aria-label="Reputação" value={input.reputation ?? ""} onChange={e => onChange({ reputation: e.target.value || undefined })}><option value="">Padrão do Perfil</option>{["Verde", "Amarela", "Laranja", "Vermelha"].map(v => <option key={v}>{v}</option>)}</select></label>{input.logistics === "flex" && <p className="text-xs text-warning">Flex: valores de referência e limites editáveis em Taxas; confirme no anúncio.</p>}</div>;
}
export const shippingInput = (values: Record<string,string>): Record<string, number | undefined> => Object.fromEntries(Object.entries(values).map(([key,text]) => [key,parseDecimal(text)]));
