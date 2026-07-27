import { supabase } from "@/integrations/supabase/client";

export type StrategyMode =
  | "executive_summary"
  | "recommendations"
  | "business_score"
  | "alerts"
  | "simulation_interpretation"
  | "forecasts";

export async function callStrategyAdvisor<T = unknown>(
  mode: StrategyMode,
  context: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("strategy-advisor", {
    body: { mode, context },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }
  return (data as { result: T }).result;
}
