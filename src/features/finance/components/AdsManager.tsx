import { useMemo, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceAds, useFinanceSettings } from "../hooks/useFinanceData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Draft {
  campaign_name: string;
  product_name: string;
  investment: number;
  revenue: number;
  orders: number;
  campaign_type: string;
}

const empty: Draft = { campaign_name: "", product_name: "", investment: 0, revenue: 0, orders: 0, campaign_type: "manual" };

function classify(roas: number, minRoas: number): { label: string; color: string } {
  if (roas === 0) return { label: "Sem dados", color: "text-muted-foreground" };
  if (roas < 1) return { label: "Prejuízo", color: "text-rose-600" };
  if (roas < minRoas) return { label: "Reduzindo margem", color: "text-amber-600" };
  return { label: "Saudável", color: "text-emerald-600" };
}

export function AdsManager() {
  const { campaigns, refresh } = useFinanceAds();
  const { settings } = useFinanceSettings();
  const [draft, setDraft] = useState<Draft>(empty);
  const minRoas = settings?.min_roas ?? 3;

  const totals = useMemo(() => {
    const inv = campaigns.reduce((a, c) => a + Number(c.investment), 0);
    const rev = campaigns.reduce((a, c) => a + Number(c.revenue), 0);
    const orders = campaigns.reduce((a, c) => a + c.orders, 0);
    return { inv, rev, orders, roas: inv > 0 ? rev / inv : 0, tacos: rev > 0 ? (inv / rev) * 100 : 0, cpa: orders > 0 ? inv / orders : 0 };
  }, [campaigns]);

  const save = async () => {
    if (!draft.campaign_name) return toast.error("Informe o nome da campanha");
    const { error } = await supabase.from("finance_ads_campaigns").insert({ ...draft, start_date: new Date().toISOString().slice(0, 10) });
    if (error) return toast.error("Erro ao salvar");
    toast.success("Campanha registrada");
    setDraft(empty);
    refresh();
  };

  const del = async (id: string) => {
    await supabase.from("finance_ads_campaigns").delete().eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Investimento total" value={brl(totals.inv)} />
        <Kpi label="Receita gerada" value={brl(totals.rev)} />
        <Kpi label="ROAS médio" value={totals.roas.toFixed(2)} />
        <Kpi label="TACOS" value={`${totals.tacos.toFixed(1)}%`} />
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Registrar campanha</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <F label="Nome da campanha" value={draft.campaign_name} onChange={(v) => setDraft({ ...draft, campaign_name: v })} span="md:col-span-2" />
          <label>
            <span className="text-xs text-muted-foreground">Tipo</span>
            <select value={draft.campaign_type} onChange={(e) => setDraft({ ...draft, campaign_type: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background">
              <option value="manual">Manual</option>
              <option value="automatica">Automática</option>
              <option value="gmv_max">GMV Max</option>
              <option value="produto">Produto</option>
              <option value="palavra_chave">Palavra-chave</option>
            </select>
          </label>
          <F label="Produto" value={draft.product_name} onChange={(v) => setDraft({ ...draft, product_name: v })} span="md:col-span-3" />
          <F label="Investimento (R$)" type="number" value={draft.investment} onChange={(v) => setDraft({ ...draft, investment: Number(v) || 0 })} />
          <F label="Receita gerada (R$)" type="number" value={draft.revenue} onChange={(v) => setDraft({ ...draft, revenue: Number(v) || 0 })} />
          <F label="Pedidos" type="number" value={draft.orders} onChange={(v) => setDraft({ ...draft, orders: Number(v) || 0 })} />
        </div>
        <button onClick={save} className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Salvar campanha</button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Campanhas ({campaigns.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">Campanha</th>
                <th className="text-left p-3">Produto</th>
                <th className="text-right p-3">Invest.</th>
                <th className="text-right p-3">Receita</th>
                <th className="text-right p-3">ROAS</th>
                <th className="text-right p-3">CPA</th>
                <th className="text-right p-3">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const roas = Number(c.investment) > 0 ? Number(c.revenue) / Number(c.investment) : 0;
                const cpa = c.orders > 0 ? Number(c.investment) / c.orders : 0;
                const status = classify(roas, minRoas);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3">{c.campaign_name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c.product_name ?? "—"}</td>
                    <td className="p-3 text-right">{brl(Number(c.investment))}</td>
                    <td className="p-3 text-right">{brl(Number(c.revenue))}</td>
                    <td className="p-3 text-right">{roas.toFixed(2)}</td>
                    <td className="p-3 text-right">{brl(cpa)}</td>
                    <td className={cn("p-3 text-right text-xs font-medium", status.color)}>{status.label}</td>
                    <td className="p-3"><button onClick={() => del(c.id)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                );
              })}
              {campaigns.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">Nenhuma campanha registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
function F({ label, value, onChange, type = "text", span = "" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; span?: string }) {
  return (
    <label className={span}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background" />
    </label>
  );
}
