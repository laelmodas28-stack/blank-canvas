import { DEFAULT_RATES, type RateConfig } from "@/features/pricing/lib/config";

// Shopee 2026 fee engine — calculates commissions, extras, freight split and net revenue.

export interface FeeTier {
  maxPrice: number | null;
  commissionPercent: number;
  fixedFee: number;
}

export interface FreightTier {
  maxPrice: number | null;
  couponMax: number;
  sellerShare: number;
}

export interface FeeRules {
  tiers: FeeTier[];
  extras: {
    campanhaDestaque: { percent: number; enabled: boolean };
    adsFacil: { percent: number; enabled: boolean };
  };
  freight: FreightTier[];
  lowPriceThreshold?: number;
  lowPriceFixedPercent?: number;
}

export const DEFAULT_SHOPEE_2026_RULES: FeeRules = {
  tiers: [
    ...DEFAULT_RATES.shopee.tiers.map(t => ({ maxPrice: t.max, commissionPercent: t.commission, fixedFee: t.fixed })),
  ],
  extras: {
    campanhaDestaque: { percent: DEFAULT_RATES.shopee.campaign, enabled: false },
    adsFacil: { percent: 1.5, enabled: false },
  },
  freight: [
    { maxPrice: 79.99, couponMax: 20, sellerShare: 0.25 },
    { maxPrice: 199.99, couponMax: 30, sellerShare: 0.25 },
    { maxPrice: null, couponMax: 40, sellerShare: 0.25 },
  ],
};

const pickTier = <T extends { maxPrice: number | null }>(price: number, tiers: T[]): T =>
  tiers.find((t) => t.maxPrice === null || price <= t.maxPrice) ?? tiers[tiers.length - 1];

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface FeeInput {
  grossPrice: number;
  quantity: number;
  discount?: number;
  productCost?: number;
  adsCost?: number;
  taxPercent?: number;
  extraFeesOverride?: number;
  freightCoupon?: number;
  rules?: FeeRules;
}

export interface FeeBreakdown {
  gross: number;
  discount: number;
  commission: number;
  fixedFees: number;
  extraFees: number;
  ads: number;
  freight: number;
  tax: number;
  productCost: number;
  netRevenue: number;
  netProfit: number;
  discountPercent: number;
  marginPercent: number;
}

export function calculateFees(input: FeeInput): FeeBreakdown {
  const rules = input.rules ?? DEFAULT_SHOPEE_2026_RULES;
  const qty = input.quantity || 1;
  const gross = input.grossPrice * qty;
  const discount = input.discount ?? 0;
  const priceAfterDiscount = gross - discount;

  const effectiveUnitPrice = Math.max(0, priceAfterDiscount / qty);
  const tier = pickTier(effectiveUnitPrice, rules.tiers);
  let commissionRate = tier.commissionPercent / 100;
  if (rules.extras.campanhaDestaque.enabled) commissionRate += rules.extras.campanhaDestaque.percent / 100;
  if (rules.extras.adsFacil.enabled) commissionRate += rules.extras.adsFacil.percent / 100;

  const commission = priceAfterDiscount * commissionRate;
  const fixedFees = (effectiveUnitPrice < (rules.lowPriceThreshold ?? DEFAULT_RATES.shopee.lowPriceThreshold) ? effectiveUnitPrice * (rules.lowPriceFixedPercent ?? DEFAULT_RATES.shopee.lowPriceFixedPercent) / 100 : tier.fixedFee) * qty;

  const freightTier = pickTier(input.grossPrice, rules.freight);
  const freightSellerCost =
    input.freightCoupon != null
      ? Math.min(input.freightCoupon, freightTier.couponMax) * freightTier.sellerShare
      : 0;

  const tax = priceAfterDiscount * ((input.taxPercent ?? 0) / 100);
  const ads = input.adsCost ?? 0;
  const extraFees = input.extraFeesOverride ?? 0;
  const productCost = (input.productCost ?? 0) * qty;

  const netRevenue = priceAfterDiscount - commission - fixedFees - extraFees - ads - freightSellerCost - tax;
  const netProfit = netRevenue - productCost;

  return {
    gross: round2(gross),
    discount: round2(discount),
    commission: round2(commission + fixedFees),
    fixedFees: round2(fixedFees),
    extraFees: round2(extraFees),
    ads: round2(ads),
    freight: round2(freightSellerCost),
    tax: round2(tax),
    productCost: round2(productCost),
    netRevenue: round2(netRevenue),
    netProfit: round2(netProfit),
    discountPercent: gross > 0 ? round2(((gross - netRevenue) / gross) * 100) : 0,
    marginPercent: gross > 0 ? round2((netProfit / gross) * 100) : 0,
  };
}

export function calculateFreightSplit(grossPrice: number, coupon: number, rules: FeeRules = DEFAULT_SHOPEE_2026_RULES) {
  const tier = pickTier(grossPrice, rules.freight);
  const effective = Math.min(coupon, tier.couponMax);
  return {
    coupon: effective,
    sellerPays: round2(effective * tier.sellerShare),
    platformPays: round2(effective * (1 - tier.sellerShare)),
    sellerPercent: tier.sellerShare * 100,
    tier,
  };
}

// Adapt the central pricing rates while retaining finance-only freight incentives and options.
export function financeRulesFromRates(rates: RateConfig, previous?: FeeRules): FeeRules {
  return {
    ...DEFAULT_SHOPEE_2026_RULES,
    ...previous,
    tiers: rates.shopee.tiers.map(t => ({ maxPrice: t.max, commissionPercent: Math.max(0, t.commission - rates.shopee.advanceReduction), fixedFee: t.fixed })),
    extras: { campanhaDestaque: { percent: rates.shopee.campaign, enabled: previous?.extras?.campanhaDestaque?.enabled ?? false }, adsFacil: previous?.extras?.adsFacil ?? DEFAULT_SHOPEE_2026_RULES.extras.adsFacil },
    lowPriceThreshold: rates.shopee.lowPriceThreshold,
    lowPriceFixedPercent: rates.shopee.lowPriceFixedPercent,
  };
}
