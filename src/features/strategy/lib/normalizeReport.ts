// Report normalizer for Shopee / Mercado Livre exports.
// Supports CSV, TXT, XLSX/XLS (via SheetJS) and best-effort PDF text extraction.
import * as XLSX from "xlsx";

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
  const tabCount = first.match(/\t/g)?.length ?? 0;
  const semiCount = first.match(/;/g)?.length ?? 0;
  const commaCount = first.match(/,/g)?.length ?? 0;
  let delimiter = ",";
  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) delimiter = "\t";
  else if (semiCount > commaCount) delimiter = ";";
  const headers = parseCsvLine(first, delimiter).map((h) => h.replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < nonEmpty.length && i <= 5000; i++) {
    const values = parseCsvLine(nonEmpty[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").replace(/^"|"$/g, "");
    });
    rows.push(row);
  }
  return { headers, rows };
};

const parseXlsx = (buffer: ArrayBuffer) => {
  const wb = XLSX.read(buffer, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return { headers: [], rows: [], sample: "" };
  const sheet = wb.Sheets[first];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (json.length === 0) return { headers: [], rows: [], sample: "" };
  const headers = Object.keys(json[0]);
  const rows = json.slice(0, 5000).map((r) => {
    const row: Record<string, string> = {};
    headers.forEach((h) => {
      row[h] = String(r[h] ?? "");
    });
    return row;
  });
  const sample = [headers.join(" | ")]
    .concat(rows.slice(0, 20).map((r) => headers.map((h) => r[h]).join(" | ")))
    .join("\n");
  return { headers, rows, sample };
};

const parsePdfText = async (buffer: ArrayBuffer): Promise<string> => {
  // Best-effort: extract ASCII/latin text streams. Complex PDFs need OCR (future).
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 10 || c === 13 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255)) {
      text += String.fromCharCode(c);
    } else {
      text += " ";
    }
  }
  return text.replace(/\s+/g, " ").slice(0, 20000);
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

const readAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

const decodeText = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  // Try UTF-8 first, then fallback to latin1 if replacement chars appear
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("iso-8859-1").decode(bytes);
};

export const normalizeReport = async (file: File): Promise<NormalizedReport> => {
  const name = file.name.toLowerCase();
  const buffer = await readAsArrayBuffer(file);

  let headers: string[] = [];
  let rows: Record<string, string>[] = [];
  let rawSample = "";
  let sniffText = name;

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const parsed = parseXlsx(buffer);
    headers = parsed.headers;
    rows = parsed.rows;
    rawSample = parsed.sample;
    sniffText = `${name}\n${headers.join(" ")}\n${parsed.sample.slice(0, 4000)}`;
  } else if (name.endsWith(".pdf")) {
    const text = await parsePdfText(buffer);
    rawSample = text.slice(0, 2000);
    sniffText = `${name}\n${text.slice(0, 4000)}`;
  } else {
    // CSV / TXT / unknown text
    const text = decodeText(buffer);
    rawSample = text.slice(0, 2000);
    const parsed = parseCsv(text);
    headers = parsed.headers;
    rows = parsed.rows;
    sniffText = `${name}\n${text.slice(0, 4000)}`;
  }

  const detectedType = detectType(sniffText);

  return {
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    detectedType,
    rowCount: rows.length,
    headers,
    rows,
    summary: buildSummary(headers, rows),
    rawSample,
  };
};
