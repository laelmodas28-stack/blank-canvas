import { describe, it, expect } from "vitest";
import { runPricingAudit } from "./audit";
import { calculatePrice, EMPTY_INPUT } from "./engine";
import { EMPTY_PROFILE, resolveDefaults } from "./profile";
import { cloneDefaults } from "./config";
describe("Automatic pricing acceptance TA1–TA8", () => {
  for (const id of ["TA1","TA2","TA3","TA4","TA5","TA6","TA7","TA8"]) it(id, () => expect(runPricingAudit().find(c => c.id===id)?.passed).toBe(true));
  it("Empty fields use Profile values including explicit zero", () => {
    const r=resolveDefaults(EMPTY_INPUT,{...EMPTY_PROFILE,tax:7,packaging:1.5,ads:0,weight:1},{tax:true,packaging:true,ads:true});
    expect([r.tax,r.packaging,r.ads,r.weight]).toEqual([7,1.5,0,1]); expect(r.origins?.ads).toBe("profile");
  });
  it("Explicit inputs override Profile values", () => {
    const r=resolveDefaults({...EMPTY_INPUT,tax:0,weight:0.8},{...EMPTY_PROFILE,tax:7,weight:2},{tax:false,packaging:true,ads:true});
    expect(r.tax).toBe(0); expect(r.weight).toBe(0.8);expect(r.origins?.tax).toBe("informed");
  });
  it("Unknown seller shipping never blocks numeric profit, stays estimated", () => {
    const r=calculatePrice("shopee",89.99,{...EMPTY_INPUT,cost:50,shopeeLogistics:"seller"});
    expect(r.profit).toBe(11.39);expect(r.shippingOrigin).toBe("estimated");expect(r.estimated).toBe(true);
  });
  it("Table shipping with explicit weight and costs is confirmed", () => {
    const r=calculatePrice("mercadolivre",89.99,{...EMPTY_INPUT,cost:50,weight:0.8});
    expect(r.freight).toBe(13.85);expect(r.estimated).toBe(false);
  });
  it("Missing table cell is estimated zero, not a fabricated tariff", () => {
    const r=calculatePrice("mercadolivre",150,{...EMPTY_INPUT,cost:50,weight:2});
    expect(r.freight).toBe(0);expect(r.estimated).toBe(true);expect(r.shippingNote).toContain("não cadastrada");
  });
  it("Explicit freight overrides table and column adjustment", () => {
    const rates=cloneDefaults(); rates.mercadolivre.shippingColumns=rates.mercadolivre.shippingColumns?.map(c=>({...c,adjustment:5}));
    expect(calculatePrice("mercadolivre",89.99,{...EMPTY_INPUT,tierShipping:{79:0},weight:0.8},rates).freight).toBe(0);
  });
});