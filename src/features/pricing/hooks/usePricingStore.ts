import { useSyncExternalStore } from "react";
import { cloneDefaults, upgradeRates, type Platform, type RateConfig } from "../lib/config";
import { type PricingInput, type PriceResult } from "../lib/engine";
export interface SavedPrice { id: string; product: string; platform: Platform; price: number; input: PricingInput; result: PriceResult; rates: RateConfig; createdAt: string; }
interface Store { rates: RateConfig; saved: SavedPrice[]; }
const KEY = "sellsmart-pricing-v2026";
function load(): Store {
  try { const data = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (data?.rates?.shopee?.tiers && Array.isArray(data.saved)) return { ...data, rates: upgradeRates(data.rates) }; } catch { /* Retain functional defaults if storage is unavailable. */ }
  return { rates: cloneDefaults(), saved: [] };
}
let state = load();
const listeners = new Set<() => void>();
function notify() { listeners.forEach(listener => listener()); }
function persist(next: Store) { localStorage.setItem(KEY, JSON.stringify(next)); state = next; notify(); }
window.addEventListener("storage", event => { if (event.key === KEY) { state = load(); notify(); } });
export function usePricingStore() { return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => state); }
export function saveRates(rates: RateConfig) {
  const now = new Date().toISOString(); persist({ ...state, rates: { ...rates, updatedAt: now, version: `2026-${now}` } });
}
export function savePrice(product: string, platform: Platform, input: PricingInput, result: PriceResult, rates: RateConfig) {
  const record: SavedPrice = { id: crypto.randomUUID(), product: product.trim(), platform, input: structuredClone(input), result, price: result.price, rates: structuredClone(rates), createdAt: new Date().toISOString() };
  persist({ ...state, saved: [record, ...state.saved] }); return record;
}
export function deletePrice(id: string) { persist({ ...state, saved: state.saved.filter(item => item.id !== id) }); }
