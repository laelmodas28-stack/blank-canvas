export const PLATFORMS = ["shopee", "mercadolivre", "tiktok", "magalu", "wholesale"] as const;
export type Platform = typeof PLATFORMS[number];
export const PLATFORM_NAMES: Record<Platform, string> = { shopee: "Shopee", mercadolivre: "Mercado Livre", tiktok: "TikTok Shop", magalu: "Magalu", wholesale: "Atacado" };
export type ShippingPayer = "buyer" | "seller" | "split" | "platform";
export interface Tier { min: number; max: number | null; commission: number; fixed: number; shipping?: number | null; shippingKind?: "unit" | "freight"; payer?: ShippingPayer; note?: string; calibrated?: boolean; }
export interface WeightFee { maxWeight: number; minPrice: number; maxPrice: number | null; amount: number; }
export interface ShippingColumn { min: number; max: number | null; adjustment: number; }
// Only cells supplied by the store are populated; other cells remain explicitly estimated.
export const SHIPPING_COLUMNS: ShippingColumn[] = [0,19,49,79,100,120,150,200].map((min,i,a) => ({ min, max: i+1 < a.length ? a[i+1]-0.01 : null, adjustment: 0 }));
export const REFERENCE_WEIGHT_FEES: WeightFee[] = [
  { maxWeight: 0.5, minPrice: 49, maxPrice: 78.99, amount: 7.85 },
  { maxWeight: 1, minPrice: 49, maxPrice: 78.99, amount: 7.85 },
  { maxWeight: 0.5, minPrice: 79, maxPrice: 99.99, amount: 13.25 },
  { maxWeight: 1, minPrice: 79, maxPrice: 99.99, amount: 13.85 },
];
export interface RateConfig {
  version: string; updatedAt: string;
  shopee: { tiers: Tier[]; lowPriceThreshold: number; lowPriceFixedPercent: number; cpfExtra: number; cpfOrderThreshold: number; campaign: number; advanceReduction: number; freight: number; };
  mercadolivre: { tiers: Tier[]; flexTiers: Tier[]; classic: number; premium: number; categories: Record<string, { classic: number | null; premium: number | null }>; reduced: number | null; reducedMin: number; reducedMax: number; variableMin: number; variableFee: number; weightFees: WeightFee[]; shippingColumns?: ShippingColumn[]; freight: number; advance: number; };
  tiktok: { tiers: Tier[]; shippingPercent: number; shippingCap: number; affiliate: number; freight: number; };
  magalu: { tiers: Tier[]; commission: number; fixed: number; newSeller: number; freight: number; };
  wholesale: { tiers: Tier[]; freight: number; };
  recommendedAdsPercent: number;
}
export const DEFAULT_RATES: RateConfig = {
  version: "2026-10-21", updatedAt: "2026-10-21T00:00:00Z",
  shopee: { tiers: [{ min: 0, max: 79.99, commission: 20, fixed: 4.5 }, { min: 80, max: 99.99, commission: 14, fixed: 16 }, { min: 100, max: 199.99, commission: 14, fixed: 20 }, { min: 200, max: null, commission: 14, fixed: 26 }], lowPriceThreshold: 9, lowPriceFixedPercent: 50, cpfExtra: 3, cpfOrderThreshold: 450, campaign: 2.5, advanceReduction: 0, freight: 0 },
  mercadolivre: { tiers: [
    { min: 0, max: 18.99, commission: 14, fixed: 0, shipping: null, shippingKind: "unit", payer: "buyer", note: "Comprador paga o frete; vendedor paga envio por unidade." },
    { min: 19, max: 78.99, commission: 14, fixed: 0, shipping: null, shippingKind: "unit", payer: "platform", note: "Frete grátis ao comprador oferecido pelo Mercado Livre; informe o custo por unidade do anúncio." },
    { min: 79, max: null, commission: 14, fixed: 0, shipping: null, shippingKind: "freight", payer: "seller", note: "Frete Mercado Envios por sua conta; confirme no Simulador de custos." },
  ], flexTiers: [
    { min: 0, max: 28.99, commission: 0, fixed: 0, shipping: 6.25, shippingKind: "unit", payer: "seller", note: "Flex: referência de custo por unidade; confirme no anúncio." },
    { min: 29, max: 49.99, commission: 0, fixed: 0, shipping: 6.65, shippingKind: "unit", payer: "seller", note: "Flex: referência de custo por unidade; confirme no anúncio." },
    { min: 50, max: 78.99, commission: 0, fixed: 0, shipping: 7.75, shippingKind: "unit", payer: "seller", note: "Flex: referência de custo por unidade; confirme no anúncio." },
  ], classic: 14, premium: 19, categories: { vestidos: { classic: 14, premium: 19 }, bodies: { classic: 14, premium: 19 } }, reduced: null, reducedMin: 150, reducedMax: 700, variableMin: 19, variableFee: 0, weightFees: REFERENCE_WEIGHT_FEES, shippingColumns: SHIPPING_COLUMNS, freight: 0, advance: 0 },
  tiktok: { tiers: [{ min: 0, max: 49.99, commission: 10, fixed: 4 }, { min: 50, max: null, commission: 6, fixed: 6 }], shippingPercent: 6, shippingCap: 50, affiliate: 0, freight: 0 },
  magalu: { tiers: [{ min: 0, max: null, commission: 16, fixed: 5, shipping: null, payer: "split", note: "Confira o frete por peso e região no Portal do Seller." }], commission: 16, fixed: 5, newSeller: 9.9, freight: 0 },
  wholesale: { tiers: [{ min: 0, max: null, commission: 0, fixed: 0, shipping: 0, payer: "buyer", note: "Frete por conta do cliente." }], freight: 0 }, recommendedAdsPercent: 40,
};
for (const platform of ["shopee", "tiktok"] as const) {
  DEFAULT_RATES[platform].tiers = DEFAULT_RATES[platform].tiers.map(t => ({ ...t, shipping: null, payer: "seller", note: platform === "shopee" ? "Frete grátis obrigatório, sem comissão extra; confirme no extrato de uma venda real." : "Confirme o frete a cargo do vendedor." }));
}
/** Upgrade older device-local settings without discarding edited fees. */
export function upgradeRates(rates: RateConfig): RateConfig {
  const defaults = structuredClone(DEFAULT_RATES);
  return { ...defaults, ...rates,
    mercadolivre: { ...defaults.mercadolivre, ...rates.mercadolivre },
    magalu: { ...defaults.magalu, ...rates.magalu, tiers: rates.magalu.tiers ?? defaults.magalu.tiers.map(t => ({ ...t, commission: rates.magalu.commission, fixed: rates.magalu.fixed })) },
    wholesale: { ...defaults.wholesale, ...rates.wholesale },
  };
}
export const cloneDefaults = (): RateConfig => structuredClone(DEFAULT_RATES);
