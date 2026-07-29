import { useRef, useState } from "react";
import { Upload, Plus, Trash2, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceSales, useFinanceFeeRule, useFinanceSettings, useFinanceProducts } from "../hooks/useFinanceData";
import { calculateFees, type FeeRules } from "../lib/feeEngine";
import { parseSalesFile } from "../lib/salesNormalizer";
import { toast } from "sonner";

const brl = (n: number) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ManualSale {
  product_name: string;
  sku: string;
  quantity: number;
  gross_price: number;
  discount: number;
  ads_cost: number;
  product_cost: number;
  freight_coupon: number;
}

const emptySale: ManualSale = {
  product_name: "",
  sku: "",
  quantity: 1,
  gross_price: 0,
  discount: 0,
  ads_cost: 0,
  product_cost: 0,
  freight_coupon: 0,
};

export function SalesManager() {
  const { sales, refresh } = useFinanceSales();
  const { rule } = useFinanceFeeRule();
  const { settings } = useFinanceSettings();
  const { products } = useFinanceProducts();
  const [manual, setManual] = useState<ManualSale>(emptySale);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const rules = (rule?.rules as unknown as FeeRules) ?? undefined;
  const taxPercent = settings?.default_tax_percent ?? 6;

  const preview = manual.gross_price > 0
    ? calculateFees({
        grossPrice: manual.gross_price,
        quantity: manual.quantity,
        discount: manual.discount,
        adsCost: manual.ads_cost,
        productCost: manual.product_cost,
        freightCoupon: manual.freight_coupon,
        taxPercent,
        rules,
      })
    : null;

  const saveManual = async () => {
    if (!manual.product_name || manual.gross_price <= 0) {
      toast.error("Informe produto e preço");
      return;
    }
    const b = calculateFees({
      grossPrice: manual.gross_price,
      quantity: manual.quantity,
      discount: manual.discount,
      adsCost: manual.ads_cost,
      productCost: manual.product_cost,
      freightCoupon: manual.freight_coupon,
      taxPercent,
      rules,
    });
    const { error } = await supabase.from("finance_sales").insert({
      product_name: manual.product_name,
      sku: manual.sku || null,
      quantity: manual.quantity,
      gross_price: manual.gross_price,
      discount: manual.discount,
      commission: b.commission,
      extra_fees: b.extraFees,
      ads_cost: b.ads,
      shipping_cost: b.freight,
      tax: b.tax,
      product_cost: b.productCost,
      net_revenue: b.netRevenue,
      net_profit: b.netProfit,
      source: "manual",
    });
    if (error) return toast.error("Erro ao salvar venda");
    toast.success("Venda registrada");
    setManual(emptySale);
    refresh();
  };

  const importFile = async (file: File) => {
    setImporting(true);
    try {
      const rows = await parseSalesFile(file);
      if (rows.length === 0) {
        toast.error("Nenhuma linha reconhecida no arquivo");
        return;
      }
      const { data: importRec } = await supabase
        .from("finance_imports")
        .insert({ file_name: file.name, file_type: file.type || file.name.split(".").pop(), detected_type: "sales", row_count: rows.length })
        .select()
        .single();

      const inserts = rows.map((r) => {
        const b = calculateFees({
          grossPrice: r.gross_price,
          quantity: r.quantity,
          discount: r.discount,
          adsCost: r.ads_cost,
          taxPercent,
          rules,
          extraFeesOverride: r.extra_fees || r.commission ? r.extra_fees : undefined,
        });
        const commissionFromFile = r.commission > 0 ? r.commission : b.commission;
        const netRevenue = r.net_revenue > 0 ? r.net_revenue : b.netRevenue;
        return {
          sale_date: r.sale_date,
          order_id: r.order_id,
          product_name: r.product_name,
          sku: r.sku,
          quantity: r.quantity,
          gross_price: r.gross_price,
          discount: r.discount,
          commission: commissionFromFile,
          extra_fees: r.extra_fees,
          ads_cost: r.ads_cost,
          shipping_cost: r.shipping_cost,
          tax: r.tax || b.tax,
          product_cost: 0,
          net_revenue: netRevenue,
          net_profit: netRevenue,
          source: "import",
          import_id: importRec?.id ?? null,
          raw: JSON.parse(JSON.stringify(r.raw)),
        };
      });
      const { error } = await supabase.from("finance_sales").insert(inserts);
      if (error) throw error;
      toast.success(`${rows.length} vendas importadas`);
      refresh();
    } catch (e) {
      toast.error("Falha ao importar arquivo");
      console.error(e);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteSale = async (id: string) => {
    await supabase.from("finance_sales").delete().eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Lançamento manual</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="col-span-2">
              <span className="text-xs text-muted-foreground">Produto</span>
              <input
                list="finance-products-list"
                value={manual.product_name}
                onChange={(e) => setManual({ ...manual, product_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background"
              />
              <datalist id="finance-products-list">
                {products.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
            </label>
            <Field label="SKU" value={manual.sku} onChange={(v) => setManual({ ...manual, sku: v })} />
            <Field label="Quantidade" type="number" value={manual.quantity} onChange={(v) => setManual({ ...manual, quantity: Number(v) || 1 })} />
            <Field label="Preço de venda (R$)" type="number" value={manual.gross_price} onChange={(v) => setManual({ ...manual, gross_price: Number(v) || 0 })} />
            <Field label="Desconto (R$)" type="number" value={manual.discount} onChange={(v) => setManual({ ...manual, discount: Number(v) || 0 })} />
            <Field label="Ads (R$)" type="number" value={manual.ads_cost} onChange={(v) => setManual({ ...manual, ads_cost: Number(v) || 0 })} />
            <Field label="Custo produto (R$)" type="number" value={manual.product_cost} onChange={(v) => setManual({ ...manual, product_cost: Number(v) || 0 })} />
            <Field label="Cupom frete (R$)" type="number" value={manual.freight_coupon} onChange={(v) => setManual({ ...manual, freight_coupon: Number(v) || 0 })} />
          </div>
          {preview && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-1 text-xs">
              <Row label="Bruto" value={brl(preview.gross)} />
              <Row label="Comissão + fixo" value={`- ${brl(preview.commission)}`} />
              <Row label="Ads" value={`- ${brl(preview.ads)}`} />
              <Row label="Frete (vendedor)" value={`- ${brl(preview.freight)}`} />
              <Row label={`Imposto (${taxPercent}%)`} value={`- ${brl(preview.tax)}`} />
              <div className="pt-2 border-t border-border flex justify-between font-semibold">
                <span>Receita líquida</span>
                <span>{brl(preview.netRevenue)}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Lucro líquido ({preview.marginPercent.toFixed(1)}%)</span>
                <span>{brl(preview.netProfit)}</span>
              </div>
              <div className="text-muted-foreground">Descontado: {preview.discountPercent.toFixed(1)}% do bruto</div>
            </div>
          )}
          <button onClick={saveManual} className="mt-4 w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Salvar venda
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Importar relatório</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Suporte a CSV, XLSX e XLS. Reconhece automaticamente colunas como Pedido, Produto, SKU, Quantidade, Valor, Desconto, Comissão, Taxas, Frete, Ads e Valor recebido.
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-accent/50 transition-colors">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm font-medium">{importing ? "Importando..." : "Selecionar arquivo"}</span>
            <span className="text-xs text-muted-foreground mt-1">CSV, XLSX, XLS</span>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">Vendas registradas ({sales.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Produto</th>
                <th className="text-right p-3">Qtd</th>
                <th className="text-right p-3">Bruto</th>
                <th className="text-right p-3">Líquido</th>
                <th className="text-right p-3">Lucro</th>
                <th className="text-right p-3">Origem</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 50).map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 text-xs">{new Date(s.sale_date).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">{s.product_name}</td>
                  <td className="p-3 text-right">{s.quantity}</td>
                  <td className="p-3 text-right">{brl(Number(s.gross_price) * s.quantity)}</td>
                  <td className="p-3 text-right">{brl(Number(s.net_revenue))}</td>
                  <td className={`p-3 text-right font-medium ${Number(s.net_profit) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{brl(Number(s.net_profit))}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">{s.source}</td>
                  <td className="p-3">
                    <button onClick={() => deleteSale(s.id)} className="text-muted-foreground hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">Nenhuma venda registrada ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <label>
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
