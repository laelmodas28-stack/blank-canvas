import { useCallback, useState } from "react";
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeReport, type NormalizedReport } from "../lib/normalizeReport";
import { toast } from "sonner";

interface Props {
  onImported?: (importId: string, report: NormalizedReport) => void;
}

const REPORT_LABELS: Record<string, string> = {
  shopee_wallet: "Extrato de Carteira Shopee",
  shopee_settlement: "Repasse Shopee",
  shopee_ads: "Anúncios Shopee",
  shopee_orders: "Pedidos Shopee",
  ml_sales: "Vendas Mercado Livre",
  ml_ads: "Anúncios Mercado Livre",
  cancellations: "Cancelamentos",
  refunds: "Reembolsos",
  traffic: "Tráfego",
  campaigns: "Campanhas",
  financial: "Financeiro",
  generic: "Relatório genérico",
};

export function ReportImporter({ onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastImport, setLastImport] = useState<NormalizedReport | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setBusy(true);
      try {
        for (const file of Array.from(files)) {
          const normalized = await normalizeReport(file);
          const { data, error } = await supabase
            .from("strategy_imports")
            .insert({
              file_name: normalized.fileName,
              file_type: normalized.fileType,
              detected_type: normalized.detectedType,
              row_count: normalized.rowCount,
              normalized_data: {
                headers: normalized.headers,
                rows: normalized.rows.slice(0, 500),
                sample: normalized.rawSample,
              },
              summary: normalized.summary,
            })
            .select("id")
            .single();
          if (error) throw error;
          setLastImport(normalized);
          onImported?.(data.id, normalized);
          toast.success(`Relatório importado: ${REPORT_LABELS[normalized.detectedType] ?? normalized.detectedType}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha na importação");
      } finally {
        setBusy(false);
      }
    },
    [onImported]
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Importador de Relatórios</h3>
          <p className="text-xs text-muted-foreground">
            Envie relatórios da Shopee e Mercado Livre (CSV, XLSX, TXT, PDF). A IA detecta o tipo automaticamente.
          </p>
        </div>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={[
          "block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
        ].join(" ")}
      >
        <input
          type="file"
          multiple
          accept=".csv,.txt,.xlsx,.xls,.pdf,text/csv,text/plain,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          {busy ? (
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-sm text-foreground font-medium">
            {busy ? "Processando..." : "Toque para selecionar da galeria ou arraste arquivos aqui"}
          </p>
          <p className="text-xs text-muted-foreground">CSV, XLSX, TXT, PDF · até 10 arquivos</p>
        </div>
      </label>

      {lastImport && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-900">
              {lastImport.fileName}
            </p>
            <p className="text-xs text-emerald-700">
              Tipo detectado: {REPORT_LABELS[lastImport.detectedType] ?? lastImport.detectedType} ·{" "}
              {lastImport.rowCount} linhas
            </p>
          </div>
        </div>
      )}

      {lastImport && lastImport.rowCount === 0 && (
        <div className="mt-2 flex items-start gap-2 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Nenhuma linha estruturada foi detectada. Para PDFs complexos e planilhas Excel,
            recomendamos exportar como CSV.
          </span>
        </div>
      )}
    </div>
  );
}
