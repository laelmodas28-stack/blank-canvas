export const PLATFORMS = ["shopee", "mercadolivre", "tiktok", "magalu", "wholesale"] as const;
export type Platform = typeof PLATFORMS[number];
export const PLATFORM_NAMES: Record<Platform, string> = { shopee: "Shopee", mercadolivre: "Mercado Livre", tiktok: "TikTok Shop", magalu: "Magalu", wholesale: "Atacado" };
export interface Tier { min: number; max: number | null; commission: number; fixed: number; }
export interface WeightFee { maxWeight: number; minPrice: number; maxPrice: number | null; amount: number; }
export interface RateConfig {
  version: string; updatedAt: string;
  shopee: { tiers: Tier[]; lowPriceThreshold: number; lowPriceFixedPercent: number; cpfExtra: number; cpfOrderThreshold: number; campaign: number; advanceReduction: number; freight: number; };
  mercadolivre: { classic: number; premium: number; categories: Record<string, { classic: number | null; premium: number | null }>; reduced: number | null; reducedMin: number; reducedMax: number; variableMin: number; variableFee: number; weightFees: WeightFee[]; freight: number; advance: number; };
  tiktok: { tiers: Tier[]; shippingPercent: number; shippingCap: number; affiliate: number; freight: number; };
  magalu: { commission: number; fixed: number; newSeller: number; freight: number; };
  wholesale: { freight: number; };
  recommendedAdsPercent: number;
}
export const DEFAULT_RATES: RateConfig = {
  version: "2026-10-01", updatedAt: "2026-10-01T00:00:00Z",
  shopee: { tiers: [{ min: 0, max: 79.99, commission: 20, fixed: 4.5 }, { min: 80, max: 99.99, commission: 14, fixed: 16 }, { min: 100, max: 199.99, commission: 14, fixed: 20 }, { min: 200, max: null, commission: 14, fixed: 26 }], lowPriceThreshold: 9, lowPriceFixedPercent: 50, cpfExtra: 3, cpfOrderThreshold: 450, campaign: 2.5, advanceReduction: 0, freight: 0 },
  mercadolivre: { classic: 14, premium: 19, categories: { vestidos: { classic: null, premium: null }, bodies: { classic: null, premium: null } }, reduced: null, reducedMin: 150, reducedMax: 700, variableMin: 19, variableFee: 0, weightFees: [], freight: 0, advance: 0 },
  tiktok: { tiers: [{ min: 0, max: 49.99, commission: 10, fixed: 4 }, { min: 50, max: null, commission: 6, fixed: 6 }], shippingPercent: 6, shippingCap: 50, affiliate: 0, freight: 0 },
  magalu: { commission: 16, fixed: 5, newSeller: 9.9, freight: 0 },
  wholesale: { freight: 0 }, recommendedAdsPercent: 40,
};
export const cloneDefaults = (): RateConfig => structuredClone(DEFAULT_RATES);
