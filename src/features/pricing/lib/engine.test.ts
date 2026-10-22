import { describe, it, expect } from "vitest";
import { calculatePrice, solvePrice, nextTierScenario, thresholdAlerts, EMPTY_INPUT } from "./engine";
import { cloneDefaults, PLATFORMS } from "./config";
const input = { ...EMPTY_INPUT, cost: 10, tax: 7 };
describe("Marketplace rules specified for October 2026", () => {
  it("Shopee CNPJ: 29.90 - 10 - 5.98 - 4.50 - 2.09 = 7.33", () => {
    const result = calculatePrice("shopee", 29.9, input);
    expect(result.commission).toBe(5.98); expect(result.fixed).toBe(4.5); expect(result.taxAmount).toBe(2.09); expect(result.profit).toBe(7.33);
  });
  it.each([[79.99,20,4.5],[80,14,16],[99.99,14,16],[100,14,20],[199.99,14,20],[200,14,26]])("Shopee tier %s applies %s%% plus %s", (p,r,f) => { const v = calculatePrice("shopee",p,input); expect(v.percent).toBe(r); expect(v.fixed).toBe(f); });
  it("Shopee prices below 9 use half the price as fixed fee", () => { expect(calculatePrice("shopee",8,input).fixed).toBe(4); expect(calculatePrice("shopee",9,input).fixed).toBe(4.5); });
  it("Shopee has no commission cap", () => expect(calculatePrice("shopee",1000,input).commission).toBe(140));
  it("CPF adds 3 only with more than 450 orders", () => { expect(calculatePrice("shopee",29.9,{...input,document:"cpf"}).fixed).toBe(4.5); expect(calculatePrice("shopee",29.9,{...input,document:"cpf",highOrders:true}).fixed).toBe(7.5); expect(calculatePrice("shopee",29.9,{...input,document:"cnpj",highOrders:true}).fixed).toBe(4.5); });
  it("Shopee campaign adds 2.5 points and advance defaults to zero", () => { expect(calculatePrice("shopee",29.9,{...input,campaign:true}).percent).toBe(22.5); expect(calculatePrice("shopee",29.9,{...input,advanceReduction:2}).percent).toBe(18); });
  it("Uses price after seller discount to select the tier", () => { const v = calculatePrice("shopee",85,{...input,discount:10}); expect(v.percent).toBe(20); expect(v.fixed).toBe(4.5); expect(v.commission).toBe(15); });
  it.each([[49.99,10,4],[50,6,6]])("TikTok tier %s", (p,r,f) => { const v=calculatePrice("tiktok",p,input); expect(v.percent).toBe(r); expect(v.fixed).toBe(f); });
  it("TikTok shipping is 6 percent capped at 50", () => { expect(calculatePrice("tiktok",100,{...input,shippingProgram:true}).extra).toBe(6); expect(calculatePrice("tiktok",1000,{...input,shippingProgram:true}).extra).toBe(50); });
  it("TikTok exemption excludes only commission, not fixed or affiliate fees", () => { const v=calculatePrice("tiktok",100,{...input,newSeller:true,affiliate:5}); expect(v.percent).toBe(5); expect(v.fixed).toBe(6); });
  it("ML reference rates are Classic14 and Premium19 with blank categories", () => { expect(calculatePrice("mercadolivre",100,{...input,category:"vestidos"}).percent).toBe(14); expect(calculatePrice("mercadolivre",100,{...input,category:"bodies",adType:"premium"}).percent).toBe(19); });
  it("ML reduced commission applies to inclusive 150–700 only", () => { const r=cloneDefaults();r.mercadolivre.reduced=12; const i={...input,reducedCategory:true}; expect(calculatePrice("mercadolivre",149.99,i,r).percent).toBe(14);expect(calculatePrice("mercadolivre",150,i,r).percent).toBe(12);expect(calculatePrice("mercadolivre",700,i,r).percent).toBe(12);expect(calculatePrice("mercadolivre",700.01,i,r).percent).toBe(14); });
  it("ML variable fee starts at19 and total kit weight chooses fee", () => { const r=cloneDefaults();r.mercadolivre.weightFees=[{maxWeight:1,minPrice:19,maxPrice:100,amount:6},{maxWeight:3,minPrice:19,maxPrice:100,amount:9}]; expect(calculatePrice("mercadolivre",18.99,{...input,weight:2},r).variable).toBe(0);expect(calculatePrice("mercadolivre",60,{...input,weight:2},r).variable).toBe(9);expect(calculatePrice("mercadolivre",60,{...input,weight:2,variableFee:8},r).variable).toBe(8); });
  it("ML advance fee is off by default", () => { const r=cloneDefaults();r.mercadolivre.advance=2;expect(calculatePrice("mercadolivre",100,input,r).percent).toBe(14);expect(calculatePrice("mercadolivre",100,{...input,advanceEnabled:true},r).percent).toBe(16); });
  it("Magalu uses16%+5 or new-seller9.9%+5", () => { expect(calculatePrice("magalu",100,input).commission).toBe(16);expect(calculatePrice("magalu",100,input).fixed).toBe(5);expect(calculatePrice("magalu",100,{...input,newSeller:true}).commission).toBe(9.9); });
  it("Wholesale has no platform fee and seller freight is zero", () => { const v=calculatePrice("wholesale",100,{...input,freight:10});expect(v.commission).toBe(0);expect(v.fixed).toBe(0);expect(v.freight).toBe(0); });
  it("Subtracts freight packaging ads and tax from net profit", () => { const v=calculatePrice("shopee",29.9,{...input,packaging:1,freight:2,ads:1,adsMode:"fixed"});expect(v.profit).toBe(3.33); });
  it.each(PLATFORMS)("%s target price and break-even use their resulting tier", platform => { const s=solvePrice(platform,input,30);expect(s).not.toBeNull(); if(!s)return;expect(calculatePrice(platform,s.price,input).margin).toBeGreaterThanOrEqual(30);const b=solvePrice(platform,input,0);expect(b).not.toBeNull();if(b)expect(calculatePrice(platform,b.price,input).profit).toBeGreaterThanOrEqual(0); });
  it("Target solver selects the valid tier candidate with greater monetary profit", () => { const s=solvePrice("shopee",{...input,cost:30},30);expect(s?.price).toBe(102.05); expect(calculatePrice("shopee",s?.price ?? 0,{...input,cost:30}).profit).toBeGreaterThan(calculatePrice("shopee",93.88,{...input,cost:30}).profit); });
  it("Warns about fee change and actual profit lost at80", () => { const a=thresholdAlerts("shopee",79,input,cloneDefaults())[0];expect(a.threshold).toBe(80);expect(a.beforeFee).toBe(4.5);expect(a.afterFee).toBe(16);expect(a.profitLoss).toBe(6.69); });
  it("Next tier scenario preserves current monetary profit", () => { const s=nextTierScenario("shopee",79,input,cloneDefaults());expect(s).not.toBeNull();if(s){expect(s.price).toBeGreaterThanOrEqual(80);expect(calculatePrice("shopee",s.price,input).profit).toBeGreaterThanOrEqual(calculatePrice("shopee",79,input).profit);} });
  it("Impossible margin does not return a misleading sale price", () => expect(solvePrice("shopee",input,95)).toBeNull());
  it("Ads recommendation defaults to40%", () => expect(cloneDefaults().recommendedAdsPercent).toBe(40));
});
describe("final check: cost 10, tax 7%, price 29.90", () => {
  const i = { cost: 10, tax: 7, packaging: 0, freight: 0, ads: 0, adsMode: "percent" as const, document: "cnpj" as const };
  it("Shopee CNPJ", () => { const r = calculatePrice("shopee", 29.9, i); expect([r.commission, r.fixed, r.taxAmount, r.profit]).toEqual([5.98, 4.5, 2.09, 7.33]); });
  it("TikTok Shop", () => { const r = calculatePrice("tiktok", 29.9, i); expect([r.commission, r.fixed, r.taxAmount, r.profit]).toEqual([2.99, 4, 2.09, 10.82]); });
  it("Magalu", () => { const r = calculatePrice("magalu", 29.9, i); expect([r.commission, r.fixed, r.taxAmount, r.profit]).toEqual([4.78, 5, 2.09, 8.03]); });
  it("Atacado", () => { const r = calculatePrice("wholesale", 29.9, i); expect([r.commission, r.taxAmount, r.profit]).toEqual([0, 2.09, 17.81]); });
  it("break-even is the lowest cent without loss", () => { const s = solvePrice("shopee", i, 0); expect(s).not.toBeNull(); if (!s) return; const p = calculatePrice("shopee", s.price, i).profit; expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(0.01); expect(calculatePrice("shopee", s.price - 0.01, i).profit).toBeLessThan(0); });
});


describe("Uploaded tier and payout acceptance rules", () => {
  const base = { ...EMPTY_INPUT, taxInformed: false, category: "vestidos", adType: "classic" as const };
  it("A: ML89.99 shipping14.45 bonus0.09 payout63.03 profit13.03", () => {
    const r = calculatePrice("mercadolivre",89.99,{...base,cost:50,tierShipping:{79:14.45},bonus:0.09});
    expect(r.tier?.min).toBe(79); expect(r.commission).toBe(12.60); expect(r.variable).toBe(0); expect(r.freight).toBe(14.45); expect(r.bonus).toBe(0.09); expect(r.payout).toBe(63.03); expect(r.profit).toBe(13.03); expect(Number(r.margin.toFixed(1))).toBe(14.5);
  });
  it("B: ML29.90 unit6.50 payout19.21 profit9.21", () => {
    const r=calculatePrice("mercadolivre",29.90,{...base,cost:10,tierShipping:{19:6.50}});
    expect(r.tier?.min).toBe(19);expect(r.tier?.max).toBe(78.99);expect(r.commission).toBe(4.19);expect(r.variable).toBe(6.50);expect(r.freight).toBe(0);expect(r.payout).toBe(19.21);expect(r.profit).toBe(9.21);
  });
  it("C: Shopee89.99 commission12.60 fixed16.00", () => { const r=calculatePrice("shopee",89.99,base);expect(r.tier?.min).toBe(80);expect(r.commission).toBe(12.60);expect(r.fixed).toBe(16);expect(r.commission+r.fixed).toBe(28.60); });
  it("D: TikTok39.90 commission3.99 fixed4.00", () => {const r=calculatePrice("tiktok",39.90,base);expect(r.tier?.max).toBe(49.99);expect(r.commission).toBe(3.99);expect(r.fixed).toBe(4);});
  it("E: TikTok59.90 commission3.59 fixed6.00", () => {const r=calculatePrice("tiktok",59.90,base);expect(r.tier?.min).toBe(50);expect(r.commission).toBe(3.59);expect(r.fixed).toBe(6);});
  it("Unspecified active shipping is unknown while explicit zero is confirmed",()=>{expect(calculatePrice("mercadolivre",89.99,base).missingShipping).toBe(true);expect(calculatePrice("mercadolivre",89.99,{...base,tierShipping:{79:0}}).missingShipping).toBe(false);});
  it("Three ML product shipping values apply only to their own tier",()=>{const i={...base,tierShipping:{0:4,19:6.5,79:14.45}};expect(calculatePrice("mercadolivre",18.99,i).variable).toBe(4);expect(calculatePrice("mercadolivre",78.99,i).variable).toBe(6.5);expect(calculatePrice("mercadolivre",79,i).freight).toBe(14.45);});
  it("Flex references6.25/6.65/7.75 are tier-aware and stop at79",()=>{const i={...base,logistics:"flex" as const};expect(calculatePrice("mercadolivre",18.99,i).variable).toBe(6.25);expect(calculatePrice("mercadolivre",29.90,i).variable).toBe(6.65);expect(calculatePrice("mercadolivre",59.90,i).variable).toBe(7.75);expect(calculatePrice("mercadolivre",79,i).variable).toBe(0);expect(calculatePrice("mercadolivre",79,i).missingShipping).toBe(true);});
  it("ML alert compares78.99 and79 shipping with actual loss",()=>{const a=thresholdAlerts("mercadolivre",89.99,{...base,cost:50,tierShipping:{19:6.50,79:14.45}},cloneDefaults())[0];expect(a.threshold).toBe(79);expect(a.beforeShipping).toBe(6.5);expect(a.afterShipping).toBe(14.45);expect(a.profitLoss).toBe(7.94);expect(a.suggestedPrice).toBe(78.99);});
  it("Magalu timely shipping discount applies to shipping only",()=>{const r=calculatePrice("magalu",100,{...base,freight:10,shippingDiscount:20});expect(r.freight).toBe(8);expect(r.commission).toBe(16);expect(r.fixed).toBe(5);});
  it("Shopee campaign is other fee, not base commission",()=>{const r=calculatePrice("shopee",100,{...base,campaign:true});expect(r.commission).toBe(14);expect(r.extra).toBe(2.5);});
  it("Seller discount selects ML shipping tier using final price",()=>{const r=calculatePrice("mercadolivre",89.99,{...base,discount:20,tierShipping:{19:6.5,79:14.45}});expect(r.price).toBe(69.99);expect(r.variable).toBe(6.5);expect(r.freight).toBe(0);});
  it("Break-even is reconciled to zero when the rounded ledger permits",()=>{const i={...base,cost:10,tierShipping:{0:6.5,19:6.5,79:14.45}};const s=solvePrice("mercadolivre",i,0);expect(s).not.toBeNull();if(!s)return;expect(calculatePrice("mercadolivre",s.price,i).profit).toBe(0);expect(calculatePrice("mercadolivre",s.price-0.01,i).profit).toBeLessThan(0);});
});
