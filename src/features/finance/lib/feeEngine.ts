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
}

export const DEFAULT_SHOPEE_2026_RULES: FeeRules = {
  tiers: [
    { maxPrice: 79.99, commissionPercent: 20, fixedFee: 4 },
    { maxPrice: 99.99, commissionPercent: 14, fixedFee: 16 },
    { maxPrice: 199.99, commissionPercent: 14, fixedFee: 20 },
    { maxPrice: null, commissionPercent: 14, fixedFee: 26 },
  ],
  extras: {
    campanhaDestaque: { percent: 3.5, enabled: false },
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

  const tier = pickTier(input.grossPrice, rules.tiers);
  let commissionRate = tier.commissionPercent / 100;
  if (rules.extras.campanhaDestaque.enabled) commissionRate += rules.extras.campanhaDestaque.percent / 100;
  if (rules.extras.adsFacil.enabled) commissionRate += rules.extras.adsFacil.percent / 100;

  const commission = priceAfterDiscount * commissionRate;
  const fixedFees = tier.fixedFee * qty;

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
