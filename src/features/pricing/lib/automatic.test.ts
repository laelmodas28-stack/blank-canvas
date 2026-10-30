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
    expect(r.freight).toBe(14.45);expect(r.estimated).toBe(false);
  });
  it("Official table fills every ML cell: R$150 at 1,5–2 kg is R$22,25", () => {
    const r=calculatePrice("mercadolivre",150,{...EMPTY_INPUT,cost:50,weight:2});
    expect(r.freight).toBe(22.25);expect(r.shippingNote).not.toContain("não cadastrada");
  });
  it("ML column A charges the lower of table and 50% of price", () => {
    expect(calculatePrice("mercadolivre",10,{...EMPTY_INPUT,weight:1}).variable).toBe(5);
    expect(calculatePrice("mercadolivre",18,{...EMPTY_INPUT,weight:1}).variable).toBe(6.05);
  });
  it("ML R$19–48,99 and R$49–78,99 are separate columns", () => {
    expect(calculatePrice("mercadolivre",34.2,{...EMPTY_INPUT,weight:1}).variable).toBe(7.15);
    expect(calculatePrice("mercadolivre",60,{...EMPTY_INPUT,weight:1}).variable).toBe(8.45);
  });
  it("Explicit freight overrides table and column adjustment", () => {
    const rates=cloneDefaults(); rates.mercadolivre.shippingColumns=rates.mercadolivre.shippingColumns?.map(c=>({...c,adjustment:5}));
    expect(calculatePrice("mercadolivre",89.99,{...EMPTY_INPUT,tierShipping:{79:0},weight:0.8},rates).freight).toBe(0);
  });
});
import { lucroCertoChecks } from "./audit";
describe("Lucro Certo acceptance: cost10, price34.20, default weight class", () => {
  it.each(lucroCertoChecks())("$id", c => expect(c.passed).toBe(true));
});
