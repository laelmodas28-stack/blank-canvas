import { type Platform, type RateConfig } from "./config";
import { calculatePrice, roundMoney, type PricingInput } from "./engine";
export interface ReferenceValues { price: number; commission: number; fixed: number; shipping: number; bonus: number; received: number; other: number; }
export interface ReferenceSale { id: string; platform: Platform; product: string; values: ReferenceValues; input: PricingInput; rates: RateConfig; createdAt: string; }
export function reconcileSale(platform: Platform, values: ReferenceValues, input: PricingInput, rates: RateConfig) {
  const result = calculatePrice(platform, values.price, { ...input, discount: 0 }, rates);
  const expected = { price: result.price, commission: result.commission, fixed: result.fixed, shipping: result.freight + result.variable, bonus: result.bonus, received: result.payout, other: result.extra };
  return (Object.keys(expected) as (keyof ReferenceValues)[]).map(key => ({ key, expected: expected[key], actual: values[key], difference: roundMoney(values[key]-expected[key]), matches: Math.abs(roundMoney(values[key]-expected[key])) <= 0.01 }));
}
export function adjustedRates(platform: Platform, values: ReferenceValues, input: PricingInput, rates: RateConfig): RateConfig {
  if (values.price <= 0) throw new Error("Informe o preço da venda.");
  const next = structuredClone(rates), result = calculatePrice(platform, values.price, { ...input, discount: 0 }, rates);
  const tier = next[platform].tiers.find(t => values.price >= t.min && (t.max === null || values.price <= t.max));
  if (!tier || platform === "wholesale") throw new Error("Sem ajuste de tarifa para esta venda.");
  const rate = roundMoney(values.commission / values.price * 100);
  if (platform === "mercadolivre") {
    const type = input.adType ?? "classic", category = input.category ?? "vestidos";
    if (rate < (type === "classic" ? 10 : 15) || rate > (type === "classic" ? 14 : 19)) throw new Error("Comissão fora dos limites; confira os valores no extrato.");
    next.mercadolivre.categories[category] = { ...next.mercadolivre.categories[category], [type]: rate - (tier.commission - next.mercadolivre.classic) };
  } else {
    if (rate < 0 || rate >= 100) throw new Error("Comissão inválida.");
    tier.commission = rate + (platform === "shopee" ? input.advanceReduction ?? next.shopee.advanceReduction : 0);
    if (platform === "magalu" && (rate < 10 || rate > 20 || values.fixed < 3 || values.fixed > 5)) throw new Error("Confira os limites de comissão e tarifa da Magalu.");
  }
  tier.fixed = values.fixed - (platform === "shopee" && input.document === "cpf" && input.highOrders ? next.shopee.cpfExtra : 0);
  if (tier.fixed < 0) throw new Error("Tarifa fixa inválida.");
  tier.shipping = values.shipping / (platform === "magalu" ? 1 - (input.shippingDiscount ?? 0)/100 : 1);
  tier.calibrated = true;
  if (!Number.isFinite(tier.shipping)) throw new Error("Revise o desconto de frete.");
  // Extras and per-order bonuses are never inferred into global rates from a single sale.
  if (Math.abs(values.other - result.extra) > 0.01) throw new Error("Outras taxas divergem; revise campanha, afiliado e programa de envio em Taxas.");
  return next;
}
