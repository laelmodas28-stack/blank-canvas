import { useState } from "react";
import { Link } from "react-router-dom";
import { Save, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckField, NumberField } from "@/features/pricing/components/Fields";
import { useFinanceFeeRule } from "../hooks/useFinanceData";
import { type FeeRules } from "../lib/feeEngine";
import { toast } from "sonner";
export function FeeRulesEditor() {
  const { rule, refresh } = useFinanceFeeRule();
  const rules = rule.rules as unknown as FeeRules;
  const [campaign, setCampaign] = useState<boolean | undefined>();
  const [adsEnabled, setAdsEnabled] = useState<boolean | undefined>();
  const [adsPercent, setAdsPercent] = useState<number | undefined>();
  const save = async () => {
    const next = { ...rules, extras: { campanhaDestaque: { ...rules.extras.campanhaDestaque, enabled: campaign ?? rules.extras.campanhaDestaque.enabled }, adsFacil: { percent: adsPercent ?? rules.extras.adsFacil.percent, enabled: adsEnabled ?? rules.extras.adsFacil.enabled } } };
    if (next.extras.adsFacil.percent < 0 || next.extras.adsFacil.percent > 100) return toast.error("Percentual inválido.");
    if (rule.id === "device-local") return toast.error("Não foi possível carregar as opções financeiras. Tente novamente quando a conexão estiver disponível.");
    const { error } = await supabase.from("finance_fee_rules").update({ rules: JSON.parse(JSON.stringify(next)) }).eq("id", rule.id);
    if (error) return toast.error("Não foi possível salvar as opções financeiras.");
    toast.success("Opções financeiras salvas."); refresh();
  };
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5"><h3 className="text-sm font-semibold">Taxas Shopee da configuração central</h3><Button asChild variant="outline"><Link to="/taxas"><SlidersHorizontal className="h-4 w-4" />Editar taxas</Link></Button></div><div className="space-y-3">{rules.tiers.map((tier,index) => <div key={index} className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{tier.maxPrice !== null ? `Até R$ ${tier.maxPrice.toFixed(2).replace('.', ',')}` : "Última faixa"}</span><span>{tier.commissionPercent}% + R$ {tier.fixedFee.toFixed(2).replace('.', ',')}</span></div>)}</div><section className="border-t border-border pt-5 max-w-lg"><h3 className="font-semibold text-sm mb-3">Opções de lançamento financeiro</h3><CheckField label={`Campanha de destaque (+${rules.extras.campanhaDestaque.percent}%)`} checked={campaign ?? rules.extras.campanhaDestaque.enabled} onChange={setCampaign} /><CheckField label="Programa Ads Fácil" checked={adsEnabled ?? rules.extras.adsFacil.enabled} onChange={setAdsEnabled} /><NumberField label="Adicional Ads Fácil (%)" value={adsPercent ?? rules.extras.adsFacil.percent} onChange={v => setAdsPercent(Number(v))} /><Button onClick={save} className="mt-4"><Save className="h-4 w-4" />Salvar opções</Button></section></div>;
}
