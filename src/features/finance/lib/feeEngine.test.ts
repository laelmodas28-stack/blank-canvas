import { it, expect } from "vitest";
import { calculateFees, financeRulesFromRates } from "./feeEngine";
import { cloneDefaults } from "@/features/pricing/lib/config";
it("Finance uses central October2026 commission and fixed fee", () => { const b = calculateFees({grossPrice:29.9,quantity:1,productCost:10,taxPercent:7,rules:financeRulesFromRates(cloneDefaults())});expect(b.fixedFees).toBe(4.5);expect(b.netProfit).toBe(7.33); });
it("Discounted sales choose the fee tier by final per-item price", () => { const b = calculateFees({grossPrice:85,quantity:2,discount:20,rules:financeRulesFromRates(cloneDefaults())});expect(b.fixedFees).toBe(9);expect(b.commission).toBe(39); });
it("Kit sold as one item incurs one fixed fee", () => { const b=calculateFees({grossPrice:29.9,quantity:1,productCost:10,rules:financeRulesFromRates(cloneDefaults())});expect(b.fixedFees).toBe(4.5); });
