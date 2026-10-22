import { it, expect } from "vitest";
import { adjustedRates, reconcileSale } from "./reconciliation";
import { cloneDefaults } from "./config";
import { EMPTY_INPUT, calculatePrice } from "./engine";
const values={price:89.99,commission:12.6,fixed:0,shipping:14.45,bonus:0.09,received:63.03,other:0};
it("Reference A compares all payout lines to the real sale",()=>{const rows=reconcileSale("mercadolivre",values,{...EMPTY_INPUT,cost:50,bonus:0.09,tierShipping:{79:14.45}},cloneDefaults());expect(rows.length).toBe(7);expect(rows.every(r=>r.matches)).toBe(true);});
it("Explicit real-sale adjustment changes only the active shipping tier",()=>{const r=cloneDefaults();const next=adjustedRates("mercadolivre",values,{...EMPTY_INPUT,category:"vestidos"},r);expect(next.mercadolivre.tiers[2].shipping).toBe(14.45);expect(next.mercadolivre.tiers[1].shipping).toBeNull();expect(r.mercadolivre.tiers[2].shipping).toBeNull();expect(calculatePrice("mercadolivre",89.99,{...EMPTY_INPUT,bonus:0.09},next).payout).toBe(63.03);});
it("Reference checker detects a mismatched received amount",()=>{const rows=reconcileSale("mercadolivre",{...values,received:60},{...EMPTY_INPUT,bonus:0.09,tierShipping:{79:14.45}},cloneDefaults());expect(rows.find(r=>r.key==="received")?.matches).toBe(false);expect(rows.find(r=>r.key==="received")?.difference).toBe(-3.03);});
