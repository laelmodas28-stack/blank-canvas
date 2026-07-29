import { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceProducts, useFinanceFeeRule, useFinanceSettings } from "../hooks/useFinanceData";
import { calculateFees, type FeeRules } from "../lib/feeEngine";
import { toast } from "sonner";

const brl = (n: number) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Draft {
  name: string;
  category: string;
  sku: string;
  supplier: string;
  manufacturing_cost: number;
  packaging_cost: number;
  operational_cost: number;
  sale_price: number;
  target_margin: number;
}

const empty: Draft = {
  name: "", category: "", sku: "", supplier: "",
  manufacturing_cost: 0, packaging_cost: 0, operational_cost: 0,
  sale_price: 0, target_margin: 20,
};

export function ProductsManager() {
  const { products, refresh } = useFinanceProducts();
  const { rule } = useFinanceFeeRule();
  const { settings } = useFinanceSettings();
  const [draft, setDraft] = useState<Draft>(empty);
  const rules = (rule?.rules as unknown as FeeRules) ?? undefined;
  const taxPercent = settings?.default_tax_percent ?? 6;

  const totalCost = draft.manufacturing_cost + draft.packaging_cost + draft.operational_cost;
  const preview = draft.sale_price > 0 ? calculateFees({
    grossPrice: draft.sale_price,
    quantity: 1,
    productCost: totalCost,
    taxPercent,
    rules,
  }) : null;

  const save = async () => {
    if (!draft.name) return toast.error("Informe o nome");
    const { error } = await supabase.from("finance_products").insert(draft);
    if (error) return toast.error("Erro ao salvar");
    toast.success("Produto cadastrado");
    setDraft(empty);
    refresh();
  };

  const del = async (id: string) => {
    await supabase.from("finance_products").delete().eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Cadastrar produto</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <F label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} span="col-span-2" />
          <F label="Categoria" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} />
          <F label="SKU" value={draft.sku} onChange={(v) => setDraft({ ...draft, sku: v })} />
          <F label="Fornecedor" value={draft.supplier} onChange={(v) => setDraft({ ...draft, supplier: v })} span="col-span-2" />
          <F label="Preço de venda" type="number" value={draft.sale_price} onChange={(v) => setDraft({ ...draft, sale_price: Number(v) || 0 })} />
          <F label="Margem desejada (%)" type="number" value={draft.target_margin} onChange={(v) => setDraft({ ...draft, target_margin: Number(v) || 0 })} />
          <F label="Custo fabricação" type="number" value={draft.manufacturing_cost} onChange={(v) => setDraft({ ...draft, manufacturing_cost: Number(v) || 0 })} />
          <F label="Custo embalagem" type="number" value={draft.packaging_cost} onChange={(v) => setDraft({ ...draft, packaging_cost: Number(v) || 0 })} />
          <F label="Custo operacional" type="number" value={draft.operational_cost} onChange={(v) => setDraft({ ...draft, operational_cost: Number(v) || 0 })} />
        </div>
        {preview && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><p className="text-muted-foreground">Custo total</p><p className="font-semibold">{brl(totalCost)}</p></div>
            <div><p className="text-muted-foreground">Taxas Shopee</p><p className="font-semibold">{brl(preview.commission)}</p></div>
            <div><p className="text-muted-foreground">Lucro líquido</p><p className={`font-semibold ${preview.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{brl(preview.netProfit)}</p></div>
            <div><p className="text-muted-foreground">Margem real</p><p className={`font-semibold ${preview.marginPercent >= draft.target_margin ? "text-emerald-600" : "text-amber-600"}`}>{preview.marginPercent.toFixed(1)}%</p></div>
          </div>
        )}
        <button onClick={save} className="mt-4 py-2 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Salvar produto</button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Package className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Catálogo ({products.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">Produto</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-right p-3">Custo total</th>
                <th className="text-right p-3">Preço</th>
                <th className="text-right p-3">Margem alvo</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{p.sku ?? "—"}</td>
                  <td className="p-3 text-right">{brl(Number(p.manufacturing_cost) + Number(p.packaging_cost) + Number(p.operational_cost))}</td>
                  <td className="p-3 text-right">{brl(Number(p.sale_price))}</td>
                  <td className="p-3 text-right">{Number(p.target_margin).toFixed(1)}%</td>
                  <td className="p-3"><button onClick={() => del(p.id)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Nenhum produto cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
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
