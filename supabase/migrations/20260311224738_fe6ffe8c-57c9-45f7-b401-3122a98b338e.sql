
CREATE TABLE public.produtos_analisados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendas INTEGER NOT NULL DEFAULT 0,
  avaliacoes INTEGER NOT NULL DEFAULT 0,
  avaliacao_media NUMERIC(3,2) DEFAULT 0,
  categoria TEXT,
  plataforma TEXT NOT NULL DEFAULT 'shopee',
  shopid BIGINT,
  itemid BIGINT,
  nome_loja TEXT,
  estoque INTEGER DEFAULT 0,
  score_oportunidade INTEGER DEFAULT 0,
  data_coleta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos_analisados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to produtos_analisados"
  ON public.produtos_analisados
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to produtos_analisados"
  ON public.produtos_analisados
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
