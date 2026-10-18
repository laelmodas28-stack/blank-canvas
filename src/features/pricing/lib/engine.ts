import { DEFAULT_RATES, type Platform, type RateConfig } from "./config";
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export interface PricingInput {
  cost: number; tax: number; packaging: number; freight?: number; ads: number; adsMode: "percent" | "fixed";
  discount?: number; document?: "cnpj" | "cpf"; highOrders?: boolean; campaign?: boolean; advanceReduction?: number;
  adType?: "classic" | "premium"; category?: string; reducedCategory?: boolean; variableFee?: number; weight?: number; advanceEnabled?: boolean;
  shippingProgram?: boolean; affiliate?: number; newSeller?: boolean;
}
export const EMPTY_INPUT: PricingInput = { cost: 0, tax: 0, packaging: 0, ads: 0, adsMode: "percent" };
export function platformFees(platform: Platform, price: number, input: PricingInput, rates: RateConfig = DEFAULT_RATES) {
  let percent = 0, fixed = 0, variable = 0, extra = 0;
  if (platform === "shopee") {
    const r = rates.shopee, tier = r.tiers.find(t => price >= t.min && (t.max === null || price <= t.max)) ?? r.tiers[r.tiers.length - 1];
    if (tier) { percent = tier.commission; fixed = price < r.lowPriceThreshold ? price * r.lowPriceFixedPercent / 100 : tier.fixed; }
    if (input.document === "cpf" && input.highOrders) fixed += r.cpfExtra;
    if (input.campaign) percent += r.campaign;
    percent = Math.max(0, percent - (input.advanceReduction ?? r.advanceReduction));
  } else if (platform === "mercadolivre") {
    const r = rates.mercadolivre, type = input.adType ?? "classic";
    percent = r.categories[input.category ?? ""]?.[type] ?? r[type];
    if (input.reducedCategory && r.reduced !== null && price >= r.reducedMin && price <= r.reducedMax) percent = r.reduced;
    if (input.advanceEnabled) percent += r.advance;
    if (price >= r.variableMin) {
      const row = [...r.weightFees].sort((a,b) => a.maxWeight - b.maxWeight).find(t => (input.weight ?? 0) <= t.maxWeight && price >= t.minPrice && (t.maxPrice === null || price <= t.maxPrice));
      variable = input.variableFee ?? row?.amount ?? r.variableFee;
    }
  } else if (platform === "tiktok") {
    const r = rates.tiktok, tier = r.tiers.find(t => price >= t.min && (t.max === null || price <= t.max)) ?? r.tiers[r.tiers.length - 1];
    if (tier) { percent = input.newSeller ? 0 : tier.commission; fixed = tier.fixed; }
    percent += input.affiliate ?? r.affiliate;
    if (input.shippingProgram) extra = Math.min(price * r.shippingPercent / 100, r.shippingCap);
  } else if (platform === "magalu") {
    percent = input.newSeller ? rates.magalu.newSeller : rates.magalu.commission; fixed = rates.magalu.fixed;
  }
  return { percent, fixed: roundMoney(fixed), variable: roundMoney(variable), extra: roundMoney(extra) };
}
export function calculatePrice(platform: Platform, salePrice: number, input: PricingInput, rates: RateConfig = DEFAULT_RATES) {
  const price = roundMoney(Math.max(0, salePrice - (input.discount ?? 0)));
  const fees = platformFees(platform, price, input, rates);
  const commission = roundMoney(price * fees.percent / 100);
  const taxAmount = roundMoney(price * input.tax / 100);
  const adsAmount = roundMoney(input.adsMode === "percent" ? price * input.ads / 100 : input.ads);
  const freight = platform === "wholesale" ? 0 : input.freight ?? rates[platform].freight;
  const totalCosts = roundMoney(input.cost + input.packaging + commission + fees.fixed + fees.variable + fees.extra + taxAmount + adsAmount + freight);
  const profit = roundMoney(price - totalCosts);
  return { price, commission, taxAmount, adsAmount, freight, totalCosts, profit, margin: price > 0 ? profit / price * 100 : 0, roi: input.cost > 0 ? profit / input.cost * 100 : 0, ...fees };
}
export type PriceResult = ReturnType<typeof calculatePrice>;
// Every discontinuity is an interval boundary. Within each interval the profit is linear;
// solving each interval avoids oscillating between commission tiers.
export function priceBoundaries(platform: Platform, input: PricingInput, rates: RateConfig): number[] {
  const points = [0];
  if (platform === "shopee") points.push(rates.shopee.lowPriceThreshold, ...rates.shopee.tiers.map(t => t.min));
  if (platform === "tiktok") {
    points.push(...rates.tiktok.tiers.map(t => t.min));
    if (input.shippingProgram && rates.tiktok.shippingPercent > 0) points.push(rates.tiktok.shippingCap * 100 / rates.tiktok.shippingPercent);
  }
  if (platform === "mercadolivre") {
    points.push(rates.mercadolivre.variableMin);
    if (input.reducedCategory && rates.mercadolivre.reduced !== null) points.push(rates.mercadolivre.reducedMin, rates.mercadolivre.reducedMax + 0.01);
    for (const t of rates.mercadolivre.weightFees) { points.push(t.minPrice); if (t.maxPrice !== null) points.push(t.maxPrice + 0.01); }
  }
  return [...new Set(points.filter(p => Number.isFinite(p) && p >= 0))].sort((a,b) => a-b);
}
export function solvePrice(platform: Platform, input: PricingInput, margin: number, rates: RateConfig = DEFAULT_RATES, minimum = 0, targetProfit = 0): { price: number; atStep: boolean } | null {
  if (margin < 0 || margin >= 100 || Object.values(input).some(v => typeof v === "number" && (!Number.isFinite(v) || v < 0))) return null;
  const normalized = { ...input, discount: 0 };
  const boundaries = priceBoundaries(platform, normalized, rates);
  const rawProfit = (p: number) => {
    const f = platformFees(platform, p, normalized, rates);
    const freight = platform === "wholesale" ? 0 : input.freight ?? rates[platform].freight;
    return p * (1 - f.percent / 100 - input.tax / 100 - (input.adsMode === "percent" ? input.ads / 100 : 0) - margin / 100) - input.cost - input.packaging - f.fixed - f.variable - f.extra - freight - (input.adsMode === "fixed" ? input.ads : 0) - targetProfit;
  };
  for (let i = 0; i < boundaries.length; i++) {
    const low = Math.max(boundaries[i], minimum), high = i + 1 < boundaries.length ? boundaries[i+1] - 0.01 : Infinity;
    if (low > high) continue;
    const probe = Math.min(high, Math.max(low + 0.1, low * 1.01));
    // Compute exact unrounded marginal fees, including proportional small-item and capped extras.
    const f = platformFees(platform, probe, normalized, rates);
    const smallFixedRate = platform === "shopee" && probe < rates.shopee.lowPriceThreshold ? rates.shopee.lowPriceFixedPercent / 100 : 0;
    const shippingRate = platform === "tiktok" && input.shippingProgram && probe * rates.tiktok.shippingPercent / 100 < rates.tiktok.shippingCap ? rates.tiktok.shippingPercent / 100 : 0;
    const slope = 1 - f.percent/100 - input.tax/100 - (input.adsMode === "percent" ? input.ads/100 : 0) - smallFixedRate - shippingRate - margin/100;
    let candidate: number;
    let atStep = false;
    if (rawProfit(low) >= -0.005) { candidate = low; atStep = low > 0 && boundaries.includes(low); }
    else {
      if (slope <= 0) continue;
      candidate = Math.max(low, Math.ceil((probe - rawProfit(probe) / slope - 1e-8) * 100) / 100);
    }
    if (!Number.isFinite(candidate) || candidate > high) continue;
    // Reconcile cents against the same rounded ledger used by all rendered results.
    for (let j = 0; j < 10 && candidate <= high; j++, candidate = roundMoney(candidate + 0.01)) {
      const result = calculatePrice(platform, candidate, normalized, rates);
      if (result.profit + 0.000001 >= candidate * margin / 100 + targetProfit) return { price: candidate, atStep };
    }
  }
  return null;
}
export function nextTierScenario(platform: Platform, currentPrice: number, input: PricingInput, rates: RateConfig) {
  const next = priceBoundaries(platform, input, rates).find(p => p > currentPrice);
  if (next === undefined) return null;
  return solvePrice(platform, { ...input, discount: 0 }, 0, rates, next, calculatePrice(platform, currentPrice, { ...input, discount: 0 }, rates).profit);
}
export function thresholdAlerts(platform: Platform, price: number, input: PricingInput, rates: RateConfig) {
  const tiers = platform === "shopee" ? rates.shopee.tiers : platform === "tiktok" ? rates.tiktok.tiers : [];
  return tiers.slice(1).filter(t => Math.abs(price - t.min) <= 5).map(t => {
    const before = calculatePrice(platform, t.min - 0.01, { ...input, discount: 0 }, rates);
    const after = calculatePrice(platform, t.min, { ...input, discount: 0 }, rates);
    return { threshold: t.min, beforeFee: before.fixed, afterFee: after.fixed, profitLoss: roundMoney(before.profit - after.profit) };
  });
}
