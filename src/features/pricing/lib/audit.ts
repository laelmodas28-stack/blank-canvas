import { calculatePrice, EMPTY_INPUT, solvePrice, thresholdAlerts } from "./engine";
import { cloneDefaults, PLATFORMS } from "./config";
import { EMPTY_PROFILE, resolveDefaults } from "./profile";
export function runPricingAudit() {
  const rates = cloneDefaults();
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
    {id:"TA3",passed:c.freight===14.45 && c.estimated && c.shippingNote.includes("peso padrão") && c.profit===12.94},
    {id:"TA4",passed:equals([d.commission,d.fixed,d.payout,d.profit,Number(d.margin.toFixed(1))],[12.6,16,61.39,11.39,12.7])},
    {id:"TA5",passed:equals([e.commission,e.fixed,e.payout,e.profit],[5.4,6,78.59,28.59])},
    {id:"TA6",passed:equals([f.payout,f.profit],[89.99,39.99])},
    {id:"TA7",passed:PLATFORMS.every(p => { const minimum=solvePrice(p,base,0,rates), target=solvePrice(p,base,30,rates); return minimum !== null && target !== null && calculatePrice(p,minimum.price,base,rates).profit>=0 && calculatePrice(p,target.price,base,rates).margin>=30; })},
    {id:"TA8",passed:before.variable===8.45 && after.freight===14.45 && thresholdAlerts("mercadolivre",79,base,rates).some(a => a.threshold===79 && a.beforeShipping===8.45 && a.afterShipping===14.45)},
    ...lucroCertoChecks(),
    ...telaCalculadoraChecks(),
  ];
}
/** Screen acceptance cases: cost R$16, price R$29,99, blank tax, weight class 0,5 a 1 kg. */
export function telaCalculadoraChecks() {
  const rates = cloneDefaults();
  const input = () => resolveDefaults({ ...EMPTY_INPUT, cost: 16, weight: 0.8, adType: "classic", document: "cnpj", category: "vestidos" }, EMPTY_PROFILE, { tax: true, packaging: true, ads: true });
  const r = (p: typeof PLATFORMS[number], price = 29.99) => calculatePrice(p, price, input(), rates);
  const m = (p: typeof PLATFORMS[number], margin: number) => solvePrice(p, input(), margin, rates)?.price;
  const eq = (actual: (number | undefined)[], expected: number[]) => actual.every((v,i) => v !== undefined && Math.abs(v-expected[i]) < 0.001);
  const pct = (n: number) => Number(n.toFixed(1));
  const feesPct = (x: ReturnType<typeof calculatePrice>) => pct(x.price > 0 ? (x.commission + x.fixed + x.variable + x.freight + x.extra) / x.price * 100 : 0);
  const s = r("shopee"), ml = r("mercadolivre"), t = r("tiktok"), mg = r("magalu"), w = r("wholesale"), ml60 = r("mercadolivre", 60);
  return [
    { id: "TC-Shopee", passed: eq([s.payout,s.profit,pct(s.margin),feesPct(s),m("shopee",30)],[19.49,3.49,11.6,35.0,41.00]) },
    { id: "TC-ML", passed: eq([ml.payout,ml.profit,pct(ml.margin),feesPct(ml),m("mercadolivre",30)],[18.64,2.64,8.8,37.8,41.34]) },
    { id: "TC-TikTok", passed: eq([t.payout,t.profit,pct(t.margin),feesPct(t),m("tiktok",30)],[22.99,6.99,23.3,23.3,33.34]) },
    { id: "TC-Magalu", passed: eq([mg.payout,mg.profit,pct(mg.margin),feesPct(mg),m("magalu",30),m("magalu",0)],[20.19,4.19,14.0,32.7,38.89,25.00]) },
    { id: "TC-Atacado", passed: eq([w.payout,w.profit,pct(w.margin),m("wholesale",30)],[29.99,13.99,46.6,22.86]) },
    { id: "TC-ML60", passed: eq([ml60.commission,ml60.variable+ml60.freight,ml60.payout,ml60.profit],[8.40,8.45,43.15,27.15]) },
  ];
}
/** Acceptance cases: cost R$10, price R$34,20, blank tax, default weight class 0,5 a 1 kg. */
export function lucroCertoChecks() {
  const rates = cloneDefaults();
  const input = (p: string) => resolveDefaults({ ...EMPTY_INPUT, cost: 10, adType: "classic", document: "cnpj", category: "vestidos" }, EMPTY_PROFILE, { tax: true, packaging: true, ads: true });
  const r = (p: typeof PLATFORMS[number]) => calculatePrice(p, 34.2, input(p), rates);
  const m = (p: typeof PLATFORMS[number], margin: number) => solvePrice(p, input(p), margin, rates)?.price;
  const eq = (actual: (number | undefined)[], expected: number[]) => actual.every((v,i) => v !== undefined && Math.abs(v-expected[i]) < 0.001);
  const pct = (n: number) => Number(n.toFixed(1));
  const s = r("shopee"), ml = r("mercadolivre"), t = r("tiktok"), mg = r("magalu"), w = r("wholesale");
  return [
    { id: "LC-Shopee", passed: eq([s.payout,s.profit,pct(s.margin),m("shopee",0),m("shopee",30)],[22.86,12.86,37.6,18.13,29]) },
    { id: "LC-ML", passed: eq([ml.commission,ml.variable+ml.freight,ml.fixed,ml.payout,ml.profit,pct(ml.margin),m("mercadolivre",0),m("mercadolivre",30)],[4.79,7.15,0,22.26,12.26,35.8,19.95,30.63]) },
    { id: "LC-TikTok", passed: eq([t.payout,t.profit,pct(t.margin)],[26.78,16.78,49.1]) },
    { id: "LC-Magalu", passed: eq([mg.commission,mg.payout,mg.profit,pct(mg.margin)],[5.47,23.73,13.73,40.1]) },
    { id: "LC-Atacado", passed: eq([w.payout,w.profit,pct(w.margin)],[34.2,24.2,70.8]) },
  ];
}