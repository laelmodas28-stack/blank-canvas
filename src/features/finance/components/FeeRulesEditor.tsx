import { useEffect, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceFeeRule } from "../hooks/useFinanceData";
import { DEFAULT_SHOPEE_2026_RULES, type FeeRules } from "../lib/feeEngine";
import { toast } from "sonner";

export function FeeRulesEditor() {
  const { rule, refresh } = useFinanceFeeRule();
  const [rules, setRules] = useState<FeeRules>(DEFAULT_SHOPEE_2026_RULES);

  useEffect(() => {
    if (rule?.rules) setRules(rule.rules as unknown as FeeRules);
  }, [rule]);

  const save = async () => {
    if (!rule) return;
    const { error } = await supabase.from("finance_fee_rules").update({ rules: JSON.parse(JSON.stringify(rules)) }).eq("id", rule.id);
    if (error) return toast.error("Erro ao salvar regras");
    toast.success("Regras atualizadas");
    refresh();
  };

  const reset = () => setRules(DEFAULT_SHOPEE_2026_RULES);

  const updateTier = (i: number, field: "commissionPercent" | "fixedFee", val: number) => {
    const next = { ...rules, tiers: rules.tiers.map((t, idx) => idx === i ? { ...t, [field]: val } : t) };
    setRules(next);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Comissão Shopee por faixa de preço</h3>
          <div className="flex gap-2">
            <button onClick={reset} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
              <RotateCcw className="h-3 w-3" /> Padrão 2026
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {rules.tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 items-center text-sm">
              <div className="text-muted-foreground">
                {i === 0 ? "Até R$79,99" : t.maxPrice ? `Até R$${t.maxPrice.toFixed(2).replace(".", ",")}` : "Acima de R$200"}
              </div>
              <label className="text-xs">
                <span className="text-muted-foreground">Comissão (%)</span>
                <input type="number" value={t.commissionPercent} onChange={(e) => updateTier(i, "commissionPercent", Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background" />
              </label>
              <label className="text-xs">
                <span className="text-muted-foreground">Tarifa fixa por item (R$)</span>
                <input type="number" value={t.fixedFee} onChange={(e) => updateTier(i, "fixedFee", Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Taxas adicionais</h3>
        <div className="space-y-3 text-sm">
          <ExtraToggle label="Campanha Destaque" percent={rules.extras.campanhaDestaque.percent} enabled={rules.extras.campanhaDestaque.enabled}
            onEnabled={(v) => setRules({ ...rules, extras: { ...rules.extras, campanhaDestaque: { ...rules.extras.campanhaDestaque, enabled: v } } })}
            onPercent={(v) => setRules({ ...rules, extras: { ...rules.extras, campanhaDestaque: { ...rules.extras.campanhaDestaque, percent: v } } })}
          />
          <ExtraToggle label="Programa Ads Fácil" percent={rules.extras.adsFacil.percent} enabled={rules.extras.adsFacil.enabled}
            onEnabled={(v) => setRules({ ...rules, extras: { ...rules.extras, adsFacil: { ...rules.extras.adsFacil, enabled: v } } })}
            onPercent={(v) => setRules({ ...rules, extras: { ...rules.extras, adsFacil: { ...rules.extras.adsFacil, percent: v } } })}
          />
        </div>
      </div>

      <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
        <Save className="h-4 w-4" /> Salvar regras
      </button>
    </div>
  );
}

function ExtraToggle({ label, percent, enabled, onEnabled, onPercent }: { label: string; percent: number; enabled: boolean; onEnabled: (v: boolean) => void; onPercent: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Adicional de {percent}% sobre a venda</p>
      </div>
      <div className="flex items-center gap-3">
        <input type="number" value={percent} onChange={(e) => onPercent(Number(e.target.value))} className="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm" />
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
          Ativa
        </label>
      </div>
    </div>
  );
}
