-- Create shopee_analysis table
CREATE TABLE public.shopee_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  shop_id TEXT,
  item_id TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopee_analysis ENABLE ROW LEVEL SECURITY;

-- Public read/insert/delete (no auth yet)
CREATE POLICY "Allow public read shopee_analysis"
  ON public.shopee_analysis FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert shopee_analysis"
  ON public.shopee_analysis FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete shopee_analysis"
  ON public.shopee_analysis FOR DELETE
  TO anon, authenticated
  USING (true);

-- Indexes
CREATE INDEX idx_shopee_analysis_created_at ON public.shopee_analysis (created_at DESC);
CREATE INDEX idx_shopee_analysis_item ON public.shopee_analysis (shop_id, item_id);