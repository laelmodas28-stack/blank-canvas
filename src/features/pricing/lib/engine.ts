import { DEFAULT_RATES, ML_LOW_COLUMN_CAP_PERCENT, upgradeRates, type Platform, type RateConfig, type Tier } from "./config";
import { type CostOrigin } from "./profile";
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export interface PricingInput {
  cost: number; tax: number; packaging: number; freight?: number; ads: number; adsMode: "percent" | "fixed";
  discount?: number; document?: "cnpj" | "cpf"; highOrders?: boolean; campaign?: boolean; advanceReduction?: number;
  adType?: "classic" | "premium"; category?: string; reducedCategory?: boolean; variableFee?: number; weight?: number; advanceEnabled?: boolean;
  shippingProgram?: boolean; affiliate?: number; newSeller?: boolean;
  tierShipping?: Record<string, number | undefined>; logistics?: "standard" | "flex"; reputation?: string;
  bonus?: number; shippingDiscount?: number; taxInformed?: boolean;
  origins?: Partial<Record<string, CostOrigin>>; weightDefault?: boolean; shopeeLogistics?: "standard" | "seller";
}
export const EMPTY_INPUT: PricingInput = { cost: 0, tax: 0, packaging: 0, ads: 0, adsMode: "percent" };
export const findTier = (price: number, tiers: Tier[]) => tiers.find(t => price >= t.min && (t.max === null || price <= t.max));
export function platformFees(platform: Platform, price: number, input: PricingInput, config: RateConfig = DEFAULT_RATES) {
  const rates = upgradeRates(config), tier = findTier(price, rates[platform].tiers);
  let basePercent = tier?.commission ?? 0, fixed = tier?.fixed ?? 0, otherPercent = 0, extra = 0;
  let shipping = input.freight ?? tier?.shipping ?? undefined;
  let shippingKind = tier?.shippingKind ?? "freight";
  let shippingOrigin: CostOrigin = input.freight !== undefined ? "informed" : tier?.calibrated ? "real" : tier?.shipping != null ? "automatic" : "estimated";
  let shippingNote = "";
  if (platform === "shopee") {
    const r = rates.shopee;
    if (price < r.lowPriceThreshold) fixed = price * r.lowPriceFixedPercent / 100;
    if (input.document === "cpf" && input.highOrders) fixed += r.cpfExtra;
    basePercent = Math.max(0, basePercent - (input.advanceReduction ?? r.advanceReduction));
    if (input.campaign) otherPercent += r.campaign;
    if (input.freight === undefined && input.shopeeLogistics !== "seller" && tier?.shipping == null) { shipping = 0; shippingOrigin = "automatic"; }
  } else if (platform === "mercadolivre") {
    const r = rates.mercadolivre, type = input.adType ?? "classic";
    basePercent = (r.categories[input.category ?? ""]?.[type] ?? r[type]) + ((tier?.commission ?? r.classic) - r.classic);
    if (input.reducedCategory && r.reduced !== null && price >= r.reducedMin && price <= r.reducedMax) basePercent = r.reduced;
    if (input.advanceEnabled) otherPercent += r.advance;
    if (tier) {
      const custom = input.tierShipping?.[String(tier.min)];
      const flex = input.logistics === "flex" && shippingKind === "unit" ? findTier(price, r.flexTiers)?.shipping : undefined;
      const weight = input.weight ?? 0.5;
      const row = [...r.weightFees].sort((a,b) => a.maxWeight - b.maxWeight).find(t => weight <= t.maxWeight && price >= t.minPrice && (t.maxPrice === null || price <= t.maxPrice));
      const column = r.shippingColumns?.find(c => price >= c.min && (c.max === null || price <= c.max));
      const manual = custom ?? (shippingKind === "unit" ? input.variableFee : input.freight);
      const rawTable = row ? roundMoney(row.amount + (column?.adjustment ?? 0)) : undefined;
      const table = rawTable !== undefined && row && row.minPrice === 0 ? roundMoney(Math.min(rawTable, price * ML_LOW_COLUMN_CAP_PERCENT / 100)) : rawTable;
      const calibratedShipping = tier.calibrated ? tier.shipping : null;
      shipping = manual ?? calibratedShipping ?? flex ?? table ?? tier.shipping ?? undefined;
      shippingOrigin = manual !== undefined ? "informed" : tier.calibrated ? "real" : flex !== undefined ? "automatic" : table !== undefined ? (input.weightDefault || input.weight === undefined ? "estimated" : "automatic") : tier.shipping != null ? "automatic" : "estimated";
      if (table !== undefined && (input.weightDefault || input.weight === undefined)) shippingNote = "Frete estimado, peso padrão";
      else if (shipping === undefined) shippingNote = "Frete estimado em R$0; célula da tabela não cadastrada";
    }
  } else if (platform === "tiktok") {
    if (input.newSeller) basePercent = 0;
    otherPercent += input.affiliate ?? rates.tiktok.affiliate;
    if (input.shippingProgram) extra += Math.min(price * rates.tiktok.shippingPercent / 100, rates.tiktok.shippingCap);
  } else if (platform === "magalu") {
    if (input.newSeller) basePercent = rates.magalu.newSeller;
    if (shipping !== undefined) shipping *= 1 - Math.min(100, input.shippingDiscount ?? 0) / 100;
  } else if (platform === "wholesale") { basePercent = 0; fixed = 0; shipping = 0; shippingKind = "freight"; shippingOrigin = "automatic"; }
  extra = roundMoney(extra + roundMoney(price * otherPercent / 100));
  const missingShipping = shipping === undefined;
  if (missingShipping && !shippingNote) shippingNote = "frete estimado em R$0";
  return { percent: basePercent + otherPercent, basePercent, fixed: roundMoney(fixed), variable: shippingKind === "unit" ? roundMoney(shipping ?? 0) : 0,
    freight: shippingKind === "freight" ? roundMoney(shipping ?? 0) : 0, extra, otherPercent, missingShipping, shippingKind, tier, shippingOrigin, shippingNote };
}
export function calculatePrice(platform: Platform, salePrice: number, input: PricingInput, rates: RateConfig = DEFAULT_RATES) {
  const price = roundMoney(Math.max(0, salePrice - (input.discount ?? 0))), fees = platformFees(platform, price, input, rates);
  const commission = roundMoney(price * fees.basePercent / 100), taxAmount = roundMoney(price * input.tax / 100);
  const adsAmount = roundMoney(input.adsMode === "percent" ? price * input.ads / 100 : input.ads), bonus = roundMoney(input.bonus ?? 0);
  const payout = roundMoney(price - commission - fees.fixed - fees.variable - fees.extra - fees.freight + bonus);
  const profit = roundMoney(payout - input.cost - input.packaging - taxAmount - adsAmount), totalCosts = roundMoney(price - profit);
  const origins: Record<string, CostOrigin> = { product: "informed", commission: fees.tier?.calibrated ? "real" : "automatic", fixed: fees.tier?.calibrated ? "real" : "automatic", shipping: fees.shippingOrigin, extra: "automatic", bonus: input.bonus === undefined ? "automatic" : "informed", tax: input.origins?.tax ?? "informed", packaging: input.origins?.packaging ?? "informed", ads: input.origins?.ads ?? "informed" };
  const labels: Record<string,string> = { shipping: fees.shippingNote || "Frete", tax: "Imposto", packaging: "Embalagem", ads: "Ads" };
  const estimates = Object.entries(origins).filter(([,v]) => v === "profile" || v === "estimated").map(([key]) => labels[key] ?? key);
  return { price, commission, taxAmount, adsAmount, bonus, payout, totalCosts, profit, margin: price > 0 ? profit / price * 100 : 0, roi: input.cost > 0 ? profit / input.cost * 100 : 0, ...fees, origins, estimates, estimated: estimates.length > 0 };
}
export type PriceResult = ReturnType<typeof calculatePrice>;
export function priceBoundaries(platform: Platform, input: PricingInput, config: RateConfig): number[] {
  const rates = upgradeRates(config), points = [0, ...rates[platform].tiers.map(t => t.min)];
  if (platform === "shopee") points.push(rates.shopee.lowPriceThreshold);
  if (platform === "tiktok" && input.shippingProgram && rates.tiktok.shippingPercent > 0) points.push(rates.tiktok.shippingCap * 100 / rates.tiktok.shippingPercent);
  if (platform === "mercadolivre") {
    if (input.logistics === "flex") points.push(...rates.mercadolivre.flexTiers.map(t => t.min));
    if (input.reducedCategory && rates.mercadolivre.reduced !== null) points.push(rates.mercadolivre.reducedMin, rates.mercadolivre.reducedMax + 0.01);
    for (const t of rates.mercadolivre.weightFees) { points.push(t.minPrice); if (t.maxPrice !== null) points.push(t.maxPrice + 0.01); }
    points.push(...(rates.mercadolivre.shippingColumns ?? []).map(c => c.min));
  }
  return [...new Set(points.filter(p => Number.isFinite(p) && p >= 0))].sort((a,b) => a-b);
}
export function solvePrice(platform: Platform, input: PricingInput, margin: number, rates: RateConfig = DEFAULT_RATES, minimum = 0, targetProfit = 0): { price: number; atStep: boolean } | null {
  if (margin < 0 || margin >= 100 || Object.values(input).some(v => typeof v === "number" && (!Number.isFinite(v) || v < 0))) return null;
  const normalized = { ...input, discount: 0 }, boundaries = priceBoundaries(platform, normalized, rates);
  const ledger = (p: number) => calculatePrice(platform, p, normalized, rates);
  // Exact (unrounded) profit so prices always round up to the next cent.
  const exactProfit = (p: number) => { const l = ledger(p); return l.profit + (l.commission - l.price * l.basePercent / 100) + (l.taxAmount - l.price * normalized.tax / 100) + (normalized.adsMode === "percent" ? l.adsAmount - l.price * normalized.ads / 100 : 0); };
  const meets = (p: number) => exactProfit(p) + 0.000001 >= p * margin / 100 + targetProfit;
  const candidates: { price: number; atStep: boolean }[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const low = Math.max(boundaries[i], minimum), high = i + 1 < boundaries.length ? boundaries[i+1] - 0.01 : Infinity;
    if (low > high) continue;
    const probe = Math.min(high, Math.max(low + 0.1, low * 1.01)), f = platformFees(platform, probe, normalized, rates);
    const small = platform === "shopee" && probe < rates.shopee.lowPriceThreshold ? rates.shopee.lowPriceFixedPercent / 100 : 0;
    const ship = platform === "tiktok" && input.shippingProgram && probe * rates.tiktok.shippingPercent / 100 < rates.tiktok.shippingCap ? rates.tiktok.shippingPercent / 100 : 0;
    const slope = 1 - f.percent/100 - input.tax/100 - (input.adsMode === "percent" ? input.ads/100 : 0) - small - ship - margin/100;
    if (slope <= 0 && !meets(low)) continue;
    const constant = input.cost + input.packaging + f.fixed - probe * small + f.variable + f.freight + f.extra - probe * (f.otherPercent/100 + ship) + (input.adsMode === "fixed" ? input.ads : 0) - (input.bonus ?? 0) + targetProfit;
    let candidate = meets(low) ? low : Math.max(low, Math.ceil((constant / slope - 1e-8) * 100) / 100);
    if (!Number.isFinite(candidate) || candidate > high) continue;
    for (let j = 0; j < 20 && roundMoney(candidate - 0.01) >= low && meets(roundMoney(candidate - 0.01)); j++) candidate = roundMoney(candidate - 0.01);
    for (let j = 0; j < 20 && candidate <= high; j++, candidate = roundMoney(candidate + 0.01)) {
      if (meets(candidate)) { candidates.push({ price: candidate, atStep: candidate === low && low > 0 }); break; }
    }
  }
  // Prefer actual target roots; only fall back to a valid tier start when discontinuities leave no root.
  const exact = margin > 0 ? candidates.filter(c => !c.atStep || Math.abs(ledger(c.price).margin - margin) < 0.1) : candidates;
  if (margin > 0 && exact.length === 0) return candidates.sort((a,b) => a.price-b.price)[0] ?? null;
  const roots = exact;
  return (margin > 0 ? roots.sort((a,b) => ledger(b.price).profit - ledger(a.price).profit) : candidates.sort((a,b) => a.price-b.price))[0] ?? null;
}
export function nextTierScenario(platform: Platform, currentPrice: number, input: PricingInput, rates: RateConfig) {
  const next = priceBoundaries(platform, input, rates).find(p => p > currentPrice);
  return next === undefined ? null : solvePrice(platform, { ...input, discount: 0 }, 0, rates, next, calculatePrice(platform, currentPrice, { ...input, discount: 0 }, rates).profit);
}
export function thresholdAlerts(platform: Platform, price: number, input: PricingInput, config: RateConfig) {
  const rates = upgradeRates(config);
  return priceBoundaries(platform,input,rates).filter(p => p > 0 && (platform === "mercadolivre" ? Math.abs(price-p) <= 11 : (platform === "shopee" || platform === "tiktok") && Math.abs(price-p) <= 5)).map(p => {
    const before = calculatePrice(platform, p - 0.01, { ...input, discount: 0 }, rates), after = calculatePrice(platform, p, { ...input, discount: 0 }, rates);
    return { threshold: p, beforeFee: before.fixed, afterFee: after.fixed, beforeShipping: before.freight + before.variable, afterShipping: after.freight + after.variable,
      profitLoss: roundMoney(before.profit - after.profit), suggestedPrice: p - 0.01, missingShipping: before.missingShipping || after.missingShipping, estimated: before.estimated || after.estimated };
  }).filter(a => a.beforeFee !== a.afterFee || a.beforeShipping !== a.afterShipping || Math.abs(a.profitLoss) > 0.02);
}
