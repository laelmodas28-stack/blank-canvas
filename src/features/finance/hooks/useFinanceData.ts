import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Sale = Tables<"finance_sales">;
type Product = Tables<"finance_products">;
type AdsCampaign = Tables<"finance_ads_campaigns">;
type FeeRule = Tables<"finance_fee_rules">;
type Settings = Tables<"finance_settings">;

export function useFinanceSales() {
  const [data, setData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("finance_sales").select("*").order("sale_date", { ascending: false }).limit(1000);
    setData(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { sales: data, loading, refresh };
}

export function useFinanceProducts() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("finance_products").select("*").order("created_at", { ascending: false });
    setData(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { products: data, loading, refresh };
}

export function useFinanceAds() {
  const [data, setData] = useState<AdsCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("finance_ads_campaigns").select("*").order("created_at", { ascending: false });
    setData(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { campaigns: data, loading, refresh };
}

export function useFinanceFeeRule() {
  const [rule, setRule] = useState<FeeRule | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("finance_fee_rules").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setRule(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { rule, loading, refresh };
}

export function useFinanceSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("finance_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    setSettings(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { settings, loading, refresh };
}
