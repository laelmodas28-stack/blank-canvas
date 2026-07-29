
-- Products
CREATE TABLE public.finance_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  sku text,
  supplier text,
  manufacturing_cost numeric NOT NULL DEFAULT 0,
  packaging_cost numeric NOT NULL DEFAULT 0,
  operational_cost numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  target_margin numeric NOT NULL DEFAULT 0,
  platform text NOT NULL DEFAULT 'shopee',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_products TO anon, authenticated;
GRANT ALL ON public.finance_products TO service_role;
ALTER TABLE public.finance_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all finance_products" ON public.finance_products FOR ALL USING (true) WITH CHECK (true);

-- Sales
CREATE TABLE public.finance_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  order_id text,
  product_id uuid REFERENCES public.finance_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text,
  quantity integer NOT NULL DEFAULT 1,
  gross_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  extra_fees numeric NOT NULL DEFAULT 0,
  ads_cost numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  product_cost numeric NOT NULL DEFAULT 0,
  net_revenue numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  platform text NOT NULL DEFAULT 'shopee',
  source text NOT NULL DEFAULT 'manual',
  import_id uuid,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_sales TO anon, authenticated;
GRANT ALL ON public.finance_sales TO service_role;
ALTER TABLE public.finance_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all finance_sales" ON public.finance_sales FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_finance_sales_date ON public.finance_sales(sale_date DESC);

-- Ads campaigns
CREATE TABLE public.finance_ads_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  product_name text,
  product_id uuid REFERENCES public.finance_products(id) ON DELETE SET NULL,
  investment numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  orders integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  platform text NOT NULL DEFAULT 'shopee',
  campaign_type text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_ads_campaigns TO anon, authenticated;
GRANT ALL ON public.finance_ads_campaigns TO service_role;
ALTER TABLE public.finance_ads_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all finance_ads_campaigns" ON public.finance_ads_campaigns FOR ALL USING (true) WITH CHECK (true);

-- Fee rules
CREATE TABLE public.finance_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'shopee',
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_fee_rules TO anon, authenticated;
GRANT ALL ON public.finance_fee_rules TO service_role;
ALTER TABLE public.finance_fee_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all finance_fee_rules" ON public.finance_fee_rules FOR ALL USING (true) WITH CHECK (true);

-- Settings
CREATE TABLE public.finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_revenue_goal numeric NOT NULL DEFAULT 0,
  monthly_profit_goal numeric NOT NULL DEFAULT 0,
  min_margin numeric NOT NULL DEFAULT 15,
  min_roas numeric NOT NULL DEFAULT 3,
  max_ads_percent numeric NOT NULL DEFAULT 20,
  default_tax_percent numeric NOT NULL DEFAULT 6,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_settings TO anon, authenticated;
GRANT ALL ON public.finance_settings TO service_role;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all finance_settings" ON public.finance_settings FOR ALL USING (true) WITH CHECK (true);

-- Imports
CREATE TABLE public.finance_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text,
  detected_type text,
  row_count integer NOT NULL DEFAULT 0,
  summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_imports TO anon, authenticated;
GRANT ALL ON public.finance_imports TO service_role;
ALTER TABLE public.finance_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all finance_imports" ON public.finance_imports FOR ALL USING (true) WITH CHECK (true);

-- Seed default Shopee 2026 fee rule
INSERT INTO public.finance_fee_rules (name, platform, rules, active) VALUES (
  'Shopee 2026 (padrão)',
  'shopee',
  '{
    "tiers": [
      {"maxPrice": 79.99, "commissionPercent": 20, "fixedFee": 4},
      {"maxPrice": 99.99, "commissionPercent": 14, "fixedFee": 16},
      {"maxPrice": 199.99, "commissionPercent": 14, "fixedFee": 20},
      {"maxPrice": null, "commissionPercent": 14, "fixedFee": 26}
    ],
    "extras": {
      "campanhaDestaque": {"percent": 3.5, "enabled": false},
      "adsFacil": {"percent": 1.5, "enabled": false}
    },
    "freight": [
      {"maxPrice": 79.99, "couponMax": 20, "sellerShare": 0.25},
      {"maxPrice": 199.99, "couponMax": 30, "sellerShare": 0.25},
      {"maxPrice": null, "couponMax": 40, "sellerShare": 0.25}
    ]
  }'::jsonb,
  true
);

-- Seed default settings row
INSERT INTO public.finance_settings (monthly_revenue_goal, monthly_profit_goal, min_margin, min_roas, max_ads_percent, default_tax_percent)
VALUES (0, 0, 15, 3, 20, 6);
