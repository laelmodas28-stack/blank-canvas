
CREATE TABLE public.strategy_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text,
  detected_type text,
  row_count integer DEFAULT 0,
  normalized_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_imports TO anon, authenticated;
GRANT ALL ON public.strategy_imports TO service_role;
ALTER TABLE public.strategy_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read strategy_imports" ON public.strategy_imports FOR SELECT USING (true);
CREATE POLICY "public insert strategy_imports" ON public.strategy_imports FOR INSERT WITH CHECK (true);
CREATE POLICY "public update strategy_imports" ON public.strategy_imports FOR UPDATE USING (true);
CREATE POLICY "public delete strategy_imports" ON public.strategy_imports FOR DELETE USING (true);

CREATE TABLE public.strategy_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid REFERENCES public.strategy_imports(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  reason text NOT NULL,
  suggested_action text NOT NULL,
  financial_impact numeric DEFAULT 0,
  estimated_improvement text,
  confidence integer DEFAULT 50,
  risk text DEFAULT 'medio',
  priority integer DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_recommendations TO anon, authenticated;
GRANT ALL ON public.strategy_recommendations TO service_role;
ALTER TABLE public.strategy_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read strategy_recommendations" ON public.strategy_recommendations FOR SELECT USING (true);
CREATE POLICY "public insert strategy_recommendations" ON public.strategy_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "public update strategy_recommendations" ON public.strategy_recommendations FOR UPDATE USING (true);
CREATE POLICY "public delete strategy_recommendations" ON public.strategy_recommendations FOR DELETE USING (true);

CREATE TABLE public.strategy_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_interpretation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_simulations TO anon, authenticated;
GRANT ALL ON public.strategy_simulations TO service_role;
ALTER TABLE public.strategy_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read strategy_simulations" ON public.strategy_simulations FOR SELECT USING (true);
CREATE POLICY "public insert strategy_simulations" ON public.strategy_simulations FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete strategy_simulations" ON public.strategy_simulations FOR DELETE USING (true);

CREATE TABLE public.strategy_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'info',
  category text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_alerts TO anon, authenticated;
GRANT ALL ON public.strategy_alerts TO service_role;
ALTER TABLE public.strategy_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read strategy_alerts" ON public.strategy_alerts FOR SELECT USING (true);
CREATE POLICY "public insert strategy_alerts" ON public.strategy_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "public update strategy_alerts" ON public.strategy_alerts FOR UPDATE USING (true);
CREATE POLICY "public delete strategy_alerts" ON public.strategy_alerts FOR DELETE USING (true);

CREATE TABLE public.strategy_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_score integer NOT NULL DEFAULT 0,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_scores TO anon, authenticated;
GRANT ALL ON public.strategy_scores TO service_role;
ALTER TABLE public.strategy_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read strategy_scores" ON public.strategy_scores FOR SELECT USING (true);
CREATE POLICY "public insert strategy_scores" ON public.strategy_scores FOR INSERT WITH CHECK (true);
