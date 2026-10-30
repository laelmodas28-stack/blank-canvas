import { PLATFORM_NAMES, type Platform } from "../lib/config";
import { type PricingInput, type PriceResult } from "../lib/engine";
import { brl, percent } from "./PriceBreakdown";

const isEstimated = (result: PriceResult, key: string) => result.origins?.[key] === "estimated" || result.origins?.[key] === "profile";

function Hint({ text }: { text: string }) {
  return <details className="relative inline-block align-middle"><summary aria-label="Explicação" className="list-none cursor-pointer inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[9px] text-muted-foreground">?</summary><span className="absolute left-0 top-full z-20 mt-1 w-56 rounded border border-border bg-background p-2 text-[11px] text-foreground shadow-md">{text}</span></details>;
}
function Approx({ text }: { text: string }) {
  return <details className="relative inline-block align-middle"><summary aria-label="Valor estimado" className="list-none cursor-pointer text-warning text-xs px-1">≈</summary><span className="absolute left-0 top-full z-20 mt-1 w-56 rounded border border-border bg-background p-2 text-[11px] text-foreground shadow-md">{text}</span></details>;
}

/** Plain-language step-by-step ledger: only non-zero lines, in reading order. */
export function ExplainPrice({ platform, result, input }: { platform: Platform; result: PriceResult; input: PricingInput }) {
  const shipping = result.variable + result.freight;
  const lines: { label: string; value: number; sign: string; hint: string; approx?: string; total?: boolean }[] = [
    { label: "Preço de venda", value: result.price, sign: "", hint: "Valor que o cliente paga pelo produto." },
    { label: `Comissão (${percent(result.basePercent)})`, value: result.commission, sign: "−", hint: "Percentual que a plataforma cobra sobre o preço de venda." },
    { label: "Taxa fixa", value: result.fixed, sign: "−", hint: "Valor fixo cobrado pela plataforma em cada venda." },
    { label: "Frete", value: shipping, sign: "−", hint: result.shippingKind === "unit" ? "Custo de envio por unidade que fica com você." : "Parte do frete grátis que a plataforma desconta de você.", approx: isEstimated(result, "shipping") ? "Frete calculado pela classe de peso padrão do Perfil da loja. Informe o peso para confirmar." : undefined },
    { label: "Outras taxas", value: result.extra, sign: "−", hint: "Taxas opcionais ligadas, como campanhas ou afiliados." },
    { label: "Descontos e bônus", value: result.bonus, sign: "+", hint: "Valores que a plataforma devolve ou paga a você." },
    { label: "Você recebe", value: result.payout, sign: "=", hint: "O que cai na sua conta depois das taxas e do frete.", total: true },
    { label: "Custo do produto", value: input.cost, sign: "−", hint: "Quanto você pagou para ter o produto." },
    { label: "Imposto", value: result.taxAmount, sign: "−", hint: "Percentual de imposto sobre o preço de venda.", approx: isEstimated(result, "tax") ? "Valor vindo do Perfil da loja." : undefined },
    { label: "Embalagem e etiqueta", value: input.packaging, sign: "−", hint: "Custo do material para embalar e etiquetar.", approx: isEstimated(result, "packaging") ? "Valor vindo do Perfil da loja." : undefined },
    { label: "Ads", value: result.adsAmount, sign: "−", hint: "Quanto você gasta em anúncios por venda.", approx: isEstimated(result, "ads") ? "Valor vindo do Perfil da loja." : undefined },
  ];
  const t = result.tier;
  const range = !t ? "" : t.max === null ? `a partir de ${brl(t.min)}` : t.min === 0 ? `até ${brl(t.max)}` : `de ${brl(t.min)} a ${brl(t.max)}`;
  return <div className="text-xs">
    <p className="text-muted-foreground mb-3">{platform === "wholesale" ? "Atacado: sem comissão nem taxa da plataforma." : `${PLATFORM_NAMES[platform]}, preço ${range}: ${percent(result.percent)} de comissão${result.fixed > 0 ? ` + ${brl(result.fixed)} de taxa fixa` : ""}${shipping > 0 ? ` + ${brl(shipping)} de frete` : ""}.`}</p>
    <dl className="space-y-2">
      {lines.filter(l => l.value !== 0 || l.total).map(l => <div key={l.label} className={`flex justify-between gap-3 ${l.total ? "border-t border-border pt-2 font-semibold text-sm" : ""}`}>
        <dt className="flex items-center gap-1 min-w-0">{l.label}<Hint text={l.hint} />{l.approx && <Approx text={l.approx} />}</dt>
        <dd className="whitespace-nowrap">{l.sign} {brl(l.value)}</dd>
      </div>)}
      <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold text-sm"><dt className="flex items-center gap-1">Lucro<Hint text="O que sobra para você depois de todos os custos." /></dt><dd className={`whitespace-nowrap ${result.profit >= 0 ? "text-success" : "text-destructive"}`}>= {brl(result.profit)}</dd></div>
    </dl>
  </div>;
}
