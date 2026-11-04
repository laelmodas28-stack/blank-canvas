import { describe, expect, it } from "vitest";
import { cloneDefaults } from "./config";
import { EMPTY_PROFILE } from "./profile";
import { quickComparison, savedIndicators, marginTone, DEFAULT_RATE_STATUS } from "./dashboard";
import { calculatePrice, EMPTY_INPUT } from "./engine";
import { runPricingAudit } from "./audit";
import type { SavedPrice } from "../hooks/usePricingStore";

function record(platform: SavedPrice["platform"], price: number, cost: number): SavedPrice {
  const rates = cloneDefaults(), input = { ...EMPTY_INPUT, cost };
  return { id: `${platform}-${price}`, product: "Produto", platform, price, input, result: calculatePrice(platform, price, input, rates), rates, createdAt: "2026-11-04T00:00:00Z" };
}
describe("Dashboard shared pricing", () => {
  const comparison = quickComparison(10, 29.30, EMPTY_PROFILE, cloneDefaults());
  it.each([
    ["tiktok", 22.37, 12.37, 42.2], ["magalu", 19.61, 9.61, 32.8],
    ["shopee", 18.94, 8.94, 30.5], ["mercadolivre", 18.05, 8.05, 27.5],
    ["wholesale", 29.30, 19.30, 65.9],
  ] as const)("cost10/price29.30: %s", (platform, payout, profit, margin) => {
    const row = platform === "wholesale" ? comparison.wholesale : comparison.ranked.find(item => item.platform === platform);
    expect(row?.result.payout).toBe(payout); expect(row?.result.profit).toBe(profit);
    expect(Number(row?.result.margin.toFixed(1))).toBe(margin);
  });
  it("Ranks four marketplaces by profit and separates Atacado", () => {
    expect(comparison.ranked.map(row => row.platform)).toEqual(["tiktok", "magalu", "shopee", "mercadolivre"]);
    expect(comparison.wholesale?.platform).toBe("wholesale");
  });
  it("Uses Profile costs and locally edited rates", () => {
    const rates = cloneDefaults(); rates.shopee.tiers[0].fixed = 5;
    const row = quickComparison(10, 29.30, { ...EMPTY_PROFILE, tax: 7, packaging: 1, ads: 2 }, rates).ranked.find(row => row.platform === "shopee");
    expect(row?.result.profit).toBe(4.80);
  });
  it("Preserves all existing pricing audit checks", () => expect(runPricingAudit().filter(check => !check.passed)).toEqual([]));
});
describe("Saved-price indicators", () => {
  it("Has no indicators without saved prices", () => expect(savedIndicators([])).toBeNull());
  it("Counts saved snapshots and averages their original margins", () => {
    const rows = [record("wholesale", 100, 95), record("wholesale", 100, 85), record("shopee", 100, 50)];
    expect(savedIndicators(rows)).toEqual({ count: 3, average: 12, best: "shopee", low: 1 });
  });
  it("Defaults low-margin threshold to strictly below 10%", () => {
    expect(savedIndicators([record("wholesale", 100, 90), record("wholesale", 100, 90.01)])?.low).toBe(1);
  });
  it("Uses the editable Profile threshold", () => {
    expect(savedIndicators([record("wholesale", 100, 85), record("wholesale", 100, 80)], 20)?.low).toBe(1);
  });
  it("Colors below threshold red, strictly above20 green", () => {
    expect(marginTone(9.99)).toBe("text-destructive"); expect(marginTone(10)).toBe("text-foreground");
    expect(marginTone(20)).toBe("text-foreground"); expect(marginTone(20.01)).toBe("text-success");
    expect(marginTone(15, 20)).toBe("text-destructive");
  });
  it("Preserves user-specified default rate statuses", () => {
    expect(DEFAULT_RATE_STATUS.shopee).toBe("Confirmado com extrato");
    expect(DEFAULT_RATE_STATUS.mercadolivre).toBe("Confirmado com extrato (frete a partir de R$79) e tabela oficial abaixo de R$79");
    expect(DEFAULT_RATE_STATUS.tiktok).toBe("Pesquisado, aguardando extrato");
    expect(DEFAULT_RATE_STATUS.magalu).toBe("Pesquisado, aguardando extrato"); expect(DEFAULT_RATE_STATUS.wholesale).toBe("Sem taxa");
  });
});