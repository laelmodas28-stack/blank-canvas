import { calculatePrice, EMPTY_INPUT, solvePrice, thresholdAlerts } from "./engine";
import { cloneDefaults, PLATFORMS } from "./config";
import { EMPTY_PROFILE, resolveDefaults } from "./profile";
export function runPricingAudit() {
  const rates = cloneDefaults();
  rates.mercadolivre.shippingColumns = rates.mercadolivre.shippingColumns?.map(c => c.min === 79 ? { ...c, adjustment: 0.6 } : c);
  const base = { ...EMPTY_INPUT, cost: 50, weight: 0.8, adType: "classic" as const };
  const a = calculatePrice("mercadolivre",89.99,base,rates);
  const b = calculatePrice("mercadolivre",89.99,{...base,tax:7,packaging:1.5},rates);
  const c = calculatePrice("mercadolivre",89.99,resolveDefaults({...base,weight:undefined},EMPTY_PROFILE,{tax:true,packaging:true,ads:true}),rates);
  const d = calculatePrice("shopee",89.99,base,rates), e = calculatePrice("tiktok",89.99,base,rates), f = calculatePrice("wholesale",89.99,base,rates);
  const before = calculatePrice("mercadolivre",78.99,base,rates), after = calculatePrice("mercadolivre",79,base,rates);
  const equals = (actual: number[], expected: number[]) => actual.every((v,i) => Math.abs(v-expected[i]) < 0.001);
  return [
    {id:"TA1",passed:equals([a.freight,a.commission,a.payout,a.profit,Number(a.margin.toFixed(1))],[14.45,12.6,62.94,12.94,14.4])},
    {id:"TA2",passed:equals([b.taxAmount,b.profit,Number(b.margin.toFixed(1))],[6.3,5.14,5.7])},
    {id:"TA3",passed:c.freight===13.85 && c.estimated && c.shippingNote.includes("peso padrão") && c.profit===13.54},
    {id:"TA4",passed:equals([d.commission,d.fixed,d.payout,d.profit,Number(d.margin.toFixed(1))],[12.6,16,61.39,11.39,12.7])},
    {id:"TA5",passed:equals([e.commission,e.fixed,e.payout,e.profit],[5.4,6,78.59,28.59])},
    {id:"TA6",passed:equals([f.payout,f.profit],[89.99,39.99])},
    {id:"TA7",passed:PLATFORMS.every(p => { const minimum=solvePrice(p,base,0,rates), target=solvePrice(p,base,30,rates); return minimum !== null && target !== null && calculatePrice(p,minimum.price,base,rates).profit>=0 && calculatePrice(p,target.price,base,rates).margin>=30; })},
    {id:"TA8",passed:before.variable===7.85 && after.freight===14.45 && thresholdAlerts("mercadolivre",79,base,rates).some(a => a.threshold===79 && a.beforeShipping===7.85 && a.afterShipping===14.45)},
  ];
}