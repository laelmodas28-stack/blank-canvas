import { PLATFORMS, type Platform, type RateConfig } from "./config";
import { calculatePrice, EMPTY_INPUT, roundMoney } from "./engine";
import { resolveDefaults, type StoreProfile } from "./profile";
import type { SavedPrice } from "../hooks/usePricingStore";

export const DEFAULT_RATE_STATUS: Record<Platform, string> = {
  shopee: "Confirmado com extrato",
  mercadolivre: "Confirmado com extrato (frete a partir de R$79) e tabela oficial abaixo de R$79",
  tiktok: "Pesquisado, aguardando extrato",
  magalu: "Pesquisado, aguardando extrato",
  wholesale: "Sem taxa",
};
export function formatRateDate(value: string) {
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0].split("-").reverse().join("/") : "—";
}
export function quickComparison(cost: number, price: number, profile: StoreProfile, rates: RateConfig) {
  const input = resolveDefaults({ ...EMPTY_INPUT, document: "cnpj", category: "vestidos", cost }, profile, { tax: true, packaging: true, ads: true });
  const rows = PLATFORMS.map(platform => ({ platform, result: calculatePrice(platform, price, input, rates) }));
  return { ranked: rows.filter(row => row.platform !== "wholesale").sort((a, b) => b.result.profit - a.result.profit), wholesale: rows.find(row => row.platform === "wholesale") };
}
export function savedIndicators(saved: SavedPrice[], threshold = 10) {
  if (!saved.length) return null;
  const grouped = PLATFORMS.map(platform => {
    const rows = saved.filter(row => row.platform === platform);
    return { platform, count: rows.length, average: rows.length ? rows.reduce((total, row) => total + row.result.margin, 0) / rows.length : 0 };
  }).filter(group => group.count > 0).sort((a, b) => b.average - a.average);
  return { count: saved.length, average: roundMoney(saved.reduce((total, row) => total + row.result.margin, 0) / saved.length), best: grouped[0]?.platform, low: saved.filter(row => row.result.margin < threshold).length };
}
export function marginTone(margin: number, threshold = 10) {
  return margin < threshold ? "text-destructive" : margin > 20 ? "text-success" : "text-foreground";
}