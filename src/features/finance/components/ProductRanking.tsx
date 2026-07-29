import { useMemo, useState } from "react";
import { useFinanceSales } from "../hooks/useFinanceData";
import { productRanking } from "../lib/aggregations";
import { cn } from "@/lib/utils";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_STYLE: Record<string, string> = {
  escalar: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  ajustar: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  pausar: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
};
const STATUS_LABEL: Record<string, string> = { escalar: "Escalar", ajustar: "Ajustar", pausar: "Pausar" };

type SortKey = "profit" | "revenue" | "units" | "margin";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "profit", label: "Maior lucro" },
  { id: "revenue", label: "Maior faturamento" },
  { id: "units", label: "Mais vendidos" },
  { id: "margin", label: "Menor margem" },
];

export function ProductRanking() {
  const { sales } = useFinanceSales();
  const [sort, setSort] = useState<SortKey>("profit");

  const rows = useMemo(() => {
    const base = productRanking(sales);
    const sorted = [...base].sort((a, b) => sort === "margin" ? a.margin - b.margin : b[sort] - a[sort]);
    return sorted;
  }, [sales, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm border transition-colors",
              sort === s.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Produto</th>
                <th className="text-right p-3">Unidades</th>
                <th className="text-right p-3">Faturamento</th>
                <th className="text-right p-3">Lucro</th>
                <th className="text-right p-3">Margem</th>
                <th className="text-right p-3">Recomendação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.product_name + (r.sku ?? "")} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3">
                    <p className="font-medium">{r.product_name}</p>
                    <p className="text-xs text-muted-foreground">{r.sku ?? "sem SKU"}</p>
                  </td>
                  <td className="p-3 text-right">{r.units}</td>
                  <td className="p-3 text-right">{brl(r.revenue)}</td>
                  <td className={cn("p-3 text-right font-medium", r.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{brl(r.profit)}</td>
                  <td className="p-3 text-right">{r.margin.toFixed(1)}%</td>
                  <td className="p-3 text-right">
                    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs border", STATUS_STYLE[r.status])}>{STATUS_LABEL[r.status]}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">Registre vendas para gerar o ranking.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
