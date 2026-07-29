// Normalizes CSV/XLSX rows from Shopee/Mercado Livre sales reports.
import * as XLSX from "xlsx";

export interface NormalizedSaleRow {
  sale_date: string;
  order_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  gross_price: number;
  discount: number;
  commission: number;
  extra_fees: number;
  ads_cost: number;
  shipping_cost: number;
  tax: number;
  net_revenue: number;
  raw: Record<string, unknown>;
}

const HEADER_ALIASES: Record<keyof NormalizedSaleRow, string[]> = {
  sale_date: ["data", "data venda", "data do pedido", "order date", "date"],
  order_id: ["pedido", "numero do pedido", "order id", "order_id", "id pedido"],
  product_name: ["produto", "nome produto", "item", "product", "titulo", "descricao"],
  sku: ["sku", "codigo", "cod produto"],
  quantity: ["quantidade", "qtd", "qtde", "quantity", "qty"],
  gross_price: ["valor produto", "preco unitario", "valor unitario", "preco", "preço", "valor venda", "valor bruto"],
  discount: ["desconto", "discount"],
  commission: ["comissao", "comissão", "commission", "taxa comissao"],
  extra_fees: ["taxas", "taxa", "outras taxas", "fees"],
  ads_cost: ["ads", "anuncios", "publicidade", "advertising", "custo ads"],
  shipping_cost: ["frete", "shipping", "coparticipacao frete"],
  tax: ["imposto", "impostos", "tax"],
  net_revenue: ["valor recebido", "valor liquido", "líquido", "net", "recebido"],
  raw: [],
};

const normalizeKey = (k: string) =>
  k.toString().toLowerCase().trim().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ");

const parseNumber = (v: unknown): number => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const parseDate = (v: unknown): string => {
  if (!v) return new Date().toISOString().slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
};

function mapRow(row: Record<string, unknown>): NormalizedSaleRow {
  const map = new Map<string, unknown>();
  Object.entries(row).forEach(([k, v]) => map.set(normalizeKey(k), v));

  const pick = (aliases: string[]): unknown => {
    for (const a of aliases) {
      const n = normalizeKey(a);
      for (const [k, v] of map) if (k === n || k.includes(n)) return v;
    }
    return undefined;
  };

  const qty = parseNumber(pick(HEADER_ALIASES.quantity)) || 1;
  const gross = parseNumber(pick(HEADER_ALIASES.gross_price));
  const net = parseNumber(pick(HEADER_ALIASES.net_revenue));

  return {
    sale_date: parseDate(pick(HEADER_ALIASES.sale_date)),
    order_id: (pick(HEADER_ALIASES.order_id) as string) ?? null,
    product_name: (pick(HEADER_ALIASES.product_name) as string) ?? "Produto sem nome",
    sku: (pick(HEADER_ALIASES.sku) as string) ?? null,
    quantity: qty,
    gross_price: gross,
    discount: parseNumber(pick(HEADER_ALIASES.discount)),
    commission: parseNumber(pick(HEADER_ALIASES.commission)),
    extra_fees: parseNumber(pick(HEADER_ALIASES.extra_fees)),
    ads_cost: parseNumber(pick(HEADER_ALIASES.ads_cost)),
    shipping_cost: parseNumber(pick(HEADER_ALIASES.shipping_cost)),
    tax: parseNumber(pick(HEADER_ALIASES.tax)),
    net_revenue: net,
    raw: row,
  };
}

export async function parseSalesFile(file: File): Promise<NormalizedSaleRow[]> {
  const buffer = await file.arrayBuffer();
  const ext = file.name.toLowerCase().split(".").pop() ?? "";

  if (["xlsx", "xls"].includes(ext)) {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });
    return rows.map(mapRow);
  }

  // CSV / txt
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.includes("\uFFFD")) text = new TextDecoder("latin1").decode(buffer);

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = [",", ";", "\t"].reduce((best, d) =>
    lines[0].split(d).length > lines[0].split(best).length ? d : best,
  ",");
  const headers = lines[0].split(delim).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(delim).map((c) => c.replace(/^"|"$/g, "").trim());
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => (obj[h] = cells[i]));
    return obj;
  });
  return rows.map(mapRow);
}
