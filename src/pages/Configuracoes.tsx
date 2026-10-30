import { User, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberField, parseDecimal, inputClass } from "@/features/pricing/components/Fields";
import { usePricingStore, saveProfile } from "@/features/pricing/hooks/usePricingStore";
import { PLATFORMS, PLATFORM_NAMES } from "@/features/pricing/lib/config";
import { type StoreProfile } from "@/features/pricing/lib/profile";
import { toast } from "sonner";

export default function Configuracoes() {
  const { profile } = usePricingStore();
  const [draft, setDraft] = useState<StoreProfile>(() => ({ ...profile }));
  const [texts, setTexts] = useState(() => ({ tax: String(profile.tax ?? ""), packaging: String(profile.packaging ?? ""), ads: String(profile.ads ?? ""), margin: String(profile.margin ?? "") }));
  const change = (key: "tax" | "packaging" | "ads" | "margin", value: string) => { setTexts(old => ({ ...old,[key]:value })); setDraft(old => ({ ...old,[key]:parseDecimal(value) })); };
  const save = () => {
    if ((draft.tax ?? 0)>100 || (draft.ads ?? 0)>100 || (draft.margin ?? 30)>=100) { toast.error("Imposto e Ads até 100%; margem menor que 100%."); return; }
    try { saveProfile(draft); toast.success("Perfil da loja salvo neste dispositivo."); } catch { toast.error("Não foi possível salvar o Perfil da loja."); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil da loja</h1>
          <p className="text-sm text-muted-foreground">Padrões da loja · salvos neste dispositivo</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="border-b border-border pb-6 space-y-4">
          <h2 className="font-semibold text-foreground">Informações Pessoais</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Nome Completo</label>
            <input type="text" value={draft.name} onChange={(e) => setDraft(old => ({ ...old,name:e.target.value }))} placeholder="Sua loja" className={inputClass} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">E-mail</label>
            <input type="email" value={draft.email} onChange={(e) => setDraft(old => ({ ...old,email:e.target.value }))} placeholder="seu@email.com" className={inputClass} />
          </div>
        </section>

        <section className="border-b border-border pb-6 space-y-4">
          <h2 className="font-semibold text-foreground">Configurações de Venda</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Plataforma Padrão</label>
            <select aria-label="Plataforma Padrão" value={draft.defaultPlatform} onChange={(e) => setDraft(old => ({ ...old,defaultPlatform:e.target.value }))} className={inputClass}>
              {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_NAMES[p]}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <NumberField label="Imposto padrão (%)" value={texts.tax} onChange={v => change("tax",v)} placeholder="0,00" max={100} />
            <NumberField label="Embalagem e etiqueta padrão (R$)" value={texts.packaging} onChange={v => change("packaging",v)} placeholder="0,00" />
            <NumberField label="Ads padrão (%)" value={texts.ads} onChange={v => change("ads",v)} placeholder="0,00" max={100} />
            <NumberField label="Margem alvo padrão (%)" value={texts.margin} onChange={v => change("margin",v)} placeholder="30,00" max={99} />
            <label className="text-xs font-medium text-muted-foreground">Classe de peso padrão<select aria-label="Classe de peso padrão" value={draft.weight ?? ""} onChange={e => setDraft(old => ({ ...old,weight:parseDecimal(e.target.value) }))} className={`${inputClass} mt-1.5`}><option value="">0,5 a 1 kg (padrão)</option>{[[0.3,"Até 0,3 kg"],[0.5,"0,3 a 0,5 kg"],[1,"0,5 a 1 kg"],[1.5,"1 a 1,5 kg"],[2,"1,5 a 2 kg"],[3,"2 a 3 kg"],[5,"4 a 5 kg"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-medium text-muted-foreground">Reputação do Mercado Livre<select aria-label="Reputação do Mercado Livre" value={draft.reputation ?? ""} onChange={e => setDraft(old => ({ ...old,reputation:e.target.value || undefined }))} className={`${inputClass} mt-1.5`}><option value="">Não definida</option>{["Verde","Amarela","Laranja","Vermelha"].map(v => <option key={v}>{v}</option>)}</select></label>
          </div>
        </section>

        <Button onClick={save} className="w-full">
          <Save className="h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
