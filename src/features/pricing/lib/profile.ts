import { type PricingInput } from "./engine";
export type CostOrigin = "automatic" | "profile" | "informed" | "estimated" | "real";
export const ORIGIN_LABELS: Record<CostOrigin, string> = { automatic: "automático", profile: "do Perfil", informed: "informado", estimated: "estimado", real: "venda real" };
export interface StoreProfile { name: string; email: string; defaultPlatform: string; tax?: number; packaging?: number; ads?: number; margin?: number; weight?: number; reputation?: string; }
export const EMPTY_PROFILE: StoreProfile = { name: "", email: "", defaultPlatform: "shopee" };
export function resolveDefaults(input: PricingInput, profile: StoreProfile, blank: { tax: boolean; packaging: boolean; ads: boolean }): PricingInput {
  const origins = { ...input.origins };
  const resolve = (key: "tax" | "packaging" | "ads") => {
    origins[key] = blank[key] ? profile[key] === undefined ? "estimated" : "profile" : "informed";
    return blank[key] ? profile[key] ?? 0 : input[key];
  };
  const tax = resolve("tax"), packaging = resolve("packaging"), ads = resolve("ads");
  const weightOrigin = input.weight === undefined ? profile.weight === undefined ? "estimated" : "profile" : "informed";
  return { ...input, tax, packaging, ads, adsMode: blank.ads ? "percent" : input.adsMode, taxInformed: true, weight: input.weight ?? profile.weight ?? 1,
    weightDefault: input.weight === undefined, reputation: input.reputation ?? profile.reputation ?? "Verde", origins: { ...origins, weight: weightOrigin, reputation: input.reputation ? "informed" : profile.reputation ? "profile" : "estimated" } };
}