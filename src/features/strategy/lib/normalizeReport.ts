// Lightweight CSV parser + report type detector for Shopee / Mercado Livre reports.
// XLSX and PDF are accepted but parsed as raw text (best-effort) since we avoid extra deps.

export interface NormalizedReport {
  fileName: string;
  fileType: string;
  detectedType: string;
  rowCount: number;
  headers: string[];
  rows: Record<string, string>[];
  summary: Record<string, number | string>;
  rawSample: string;
}

const REPORT_SIGNATURES: { type: string; keywords: string[] }[] = [
  { type: "shopee_wallet", keywords: ["carteira", "wallet", "saldo", "transacao"] },
  { type: "shopee_settlement", keywords: ["settlement", "repasse", "acerto", "escrow"] },
  { type: "shopee_ads", keywords: ["shopee ads", "roas", "acos", "impressoes", "cliques", "cpc"] },
  { type: "shopee_orders", keywords: ["numero do pedido", "pedido shopee", "order sn"] },
  { type: "ml_sales", keywords: ["mercado livre", "mlb", "venda ml"] },
  { type: "ml_ads", keywords: ["product ads", "mercado ads", "campanhas ml"] },
  { type: "cancellations", keywords: ["cancelamento", "cancelado", "cancellation"] },
  { type: "refunds", keywords: ["reembolso", "devolucao", "refund"] },
  { type: "traffic", keywords: ["visitas", "trafego", "impressoes", "visualizacoes"] },
  { type: "campaigns", keywords: ["campanha", "orcamento diario", "target roas"] },
  { type: "financial", keywords: ["fluxo de caixa", "financeiro", "dre", "receita liquida"] },
];

const detectType = (text: string): string => {
  const t = text.toLowerCase();
  for (const sig of REPORT_SIGNATURES) {
    if (sig.keywords.some((k) => t.includes(k))) return sig.type;
  }
  return "generic";
};

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

const parseCsv = (text: string) => {
  const nonEmpty = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const first = nonEmpty[0];
  const delimiter =
    (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = parseCsvLine(first, delimiter).map((h) => h.replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < nonEmpty.length && i <= 2000; i++) {
    const values = parseCsvLine(nonEmpty[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").replace(/^"|"$/g, "");
    });
    rows.push(row);
  }
  return { headers, rows };
};

const toNumber = (s: string | undefined): number => {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const buildSummary = (
  headers: string[],
  rows: Record<string, string>[]
): Record<string, number | string> => {
  const summary: Record<string, number | string> = { total_linhas: rows.length };
  const numericCandidates = headers.filter((h) =>
    /(valor|receita|custo|preco|lucro|gasto|orcamento|comissao|frete|imposto|roas|acos|ctr|cpc|impressao|clique|conversao|venda|total)/i.test(
      h
    )
  );
  for (const h of numericCandidates.slice(0, 12)) {
    const nums = rows.map((r) => toNumber(r[h])).filter((n) => !Number.isNaN(n));
    if (nums.length === 0) continue;
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    summary[`soma_${h}`] = Math.round(sum * 100) / 100;
    summary[`media_${h}`] = Math.round(avg * 100) / 100;
  }
  return summary;
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const normalizeReport = async (file: File): Promise<NormalizedReport> => {
  const text = await readFileAsText(file);
  const detectedType = detectType(`${file.name}\n${text.slice(0, 4000)}`);

  const looksLikeCsv =
    /\.csv$/i.test(file.name) ||
    /\.txt$/i.test(file.name) ||
    /,|;/.test(text.split("\n")[0] ?? "");

  let headers: string[] = [];
  let rows: Record<string, string>[] = [];
  if (looksLikeCsv) {
    const parsed = parseCsv(text);
    headers = parsed.headers;
    rows = parsed.rows;
  }

  return {
    fileName: file.name,
    fileType: file.type || "text/plain",
    detectedType,
    rowCount: rows.length,
    headers,
    rows,
    summary: buildSummary(headers, rows),
    rawSample: text.slice(0, 2000),
  };
};
