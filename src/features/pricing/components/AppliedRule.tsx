import { PLATFORM_NAMES, type Platform } from "../lib/config";
import { type PriceResult } from "../lib/engine";
import { brl, percent } from "./PriceBreakdown";
export function AppliedRule({ platform, result }: { platform: Platform; result: PriceResult }) {
  const t = result.tier;
  const range = t ? t.max === null ? `a partir de ${brl(t.min)}` : t.min === 0 ? `até ${brl(t.max)}` : `${brl(t.min)} a ${brl(t.max)}` : "sem faixa configurada";
  const payer = t?.payer === "buyer" ? "comprador" : t?.payer === "platform" ? "Mercado Livre" : t?.payer === "split" ? "dividido" : "vendedor";
  return <div className="text-xs space-y-2 mt-3 mb-4"><p className="text-muted-foreground"><span className="font-semibold text-foreground">Regra aplicada: </span>{PLATFORM_NAMES[platform]}, faixa {range}: comissão {percent(result.basePercent)} + taxa fixa {brl(result.fixed)} + {result.shippingKind === "unit" ? "custo por unidade" : "frete"} {result.missingShipping ? "não informado" : brl(result.freight + result.variable)}; frete pago por {payer}.{result.extra > 0 ? ` Outras taxas: ${brl(result.extra)}.` : ""}</p>{t?.note && <p className="text-muted-foreground">{t.note}</p>}{result.missingShipping && <p className="text-warning border-l-2 border-warning pl-2">Custo de envio desta faixa não informado, lucro superestimado</p>}</div>;
}
