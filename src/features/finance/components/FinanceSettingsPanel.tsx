import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceSettings } from "../hooks/useFinanceData";
import { toast } from "sonner";

export function FinanceSettingsPanel() {
  const { settings, refresh } = useFinanceSettings();
  const [form, setForm] = useState({
    monthly_revenue_goal: 0,
    monthly_profit_goal: 0,
    min_margin: 15,
    min_roas: 3,
    max_ads_percent: 20,
    default_tax_percent: 6,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        monthly_revenue_goal: Number(settings.monthly_revenue_goal),
        monthly_profit_goal: Number(settings.monthly_profit_goal),
        min_margin: Number(settings.min_margin),
        min_roas: Number(settings.min_roas),
        max_ads_percent: Number(settings.max_ads_percent),
        default_tax_percent: Number(settings.default_tax_percent),
      });
    }
  }, [settings]);

  const save = async () => {
    const payload = { ...form, updated_at: new Date().toISOString() };
    const { error } = settings
      ? await supabase.from("finance_settings").update(payload).eq("id", settings.id)
      : await supabase.from("finance_settings").insert(payload);
    if (error) return toast.error("Erro ao salvar");
    toast.success("Configurações atualizadas");
    refresh();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 max-w-2xl">
      <h3 className="text-sm font-semibold mb-4">Metas e limites da empresa</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <F label="Meta faturamento mensal (R$)" value={form.monthly_revenue_goal} onChange={(v) => setForm({ ...form, monthly_revenue_goal: v })} />
        <F label="Meta lucro mensal (R$)" value={form.monthly_profit_goal} onChange={(v) => setForm({ ...form, monthly_profit_goal: v })} />
        <F label="Margem mínima aceitável (%)" value={form.min_margin} onChange={(v) => setForm({ ...form, min_margin: v })} />
        <F label="ROAS mínimo" value={form.min_roas} onChange={(v) => setForm({ ...form, min_roas: v })} />
        <F label="% máximo de Ads sobre faturamento" value={form.max_ads_percent} onChange={(v) => setForm({ ...form, max_ads_percent: v })} />
        <F label="Alíquota padrão de imposto (%)" value={form.default_tax_percent} onChange={(v) => setForm({ ...form, default_tax_percent: v })} />
      </div>
      <button onClick={save} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
        <Save className="h-4 w-4" /> Salvar configurações
      </button>
    </div>
  );
}

function F({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label>
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background" />
    </label>
  );
}
