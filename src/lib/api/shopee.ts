import { supabase } from '@/integrations/supabase/client';

export interface ShopeeProduct {
  title: string;
  price: number;
  priceMin: number;
  priceMax: number;
  historicalSold: number;
  stock: number;
  ratingCount: number;
  ratingAvg: number;
  category?: string;
  shopName?: string;
  shopid: number;
  itemid: number;
  image?: string;
  score?: number;
  _cached?: boolean;
}

export interface MarketMetrics {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgSales: number;
  avgRating?: number;
  competitors: number;
  estimatedRevenue: number;
  opportunityScore: number;
  average_market_price?: number;
  competitor_count?: number;
}

export interface MarketIntelligence {
  estimated_daily_sales: number;
  sales_last_7_days: number;
  sales_last_30_days: number;
  estimated_monthly_revenue: number;
  competitor_count: number;
  average_market_price: number;
}

export interface AnalyzeLinkResult {
  success: boolean;
  error?: string;
  product?: ShopeeProduct;
  competitors?: ShopeeProduct[];
  metrics?: MarketMetrics;
  fromCache?: boolean;
  dataSource?: string;
}

export interface SearchResult {
  success: boolean;
  error?: string;
  products?: ShopeeProduct[];
  metrics?: MarketMetrics;
  total?: number;
  filtered?: number;
}

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minSales?: number;
  minRating?: number;
}

export const shopeeApi = {
  async analyzeLink(url: string): Promise<AnalyzeLinkResult> {
    const { data, error } = await supabase.functions.invoke('shopee-scraper', {
      body: { action: 'analyze_link', url },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async search(keyword: string, filters?: SearchFilters, limit = 50): Promise<SearchResult> {
    const { data, error } = await supabase.functions.invoke('shopee-scraper', {
      body: { action: 'search', keyword, limit, filters },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async getProductDetails(shopid: string, itemid: string) {
    const { data, error } = await supabase.functions.invoke('shopee-scraper', {
      body: { action: 'product_details', shopid, itemid },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  extractIdsFromUrl(url: string): { shopid: string; itemid: string } | null {
    const match = url.match(/i\.(\d+)\.(\d+)/);
    if (!match) return null;
    return { shopid: match[1], itemid: match[2] };
  },

  detectPlatform(url: string): string {
    if (url.includes('shopee')) return 'Shopee';
    if (url.includes('mercadolivre') || url.includes('mercadolibre')) return 'Mercado Livre';
    return 'Desconhecida';
  },
};

export function getScoreInfo(score: number) {
  if (score <= 40) return { label: 'Mercado Saturado', color: 'text-destructive', bg: 'bg-destructive/10', icon: 'saturated' };
  if (score <= 60) return { label: 'Mercado Competitivo', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: 'competitive' };
  if (score <= 80) return { label: 'Boa Oportunidade', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: 'good' };
  return { label: 'Alta Oportunidade', color: 'text-primary', bg: 'bg-primary/10', icon: 'excellent' };
}

export function getCompetitionLabel(competitors: number) {
  if (competitors <= 10) return 'Baixa';
  if (competitors <= 30) return 'Média';
  return 'Alta';
}

export function getDemandLabel(sales: number) {
  if (sales >= 500) return 'Alta Demanda';
  if (sales >= 100) return 'Demanda Moderada';
  return 'Baixa Demanda';
}

export function getMarketIndicators(metrics: MarketMetrics) {
  const indicators: { label: string; type: 'positive' | 'warning' | 'negative' }[] = [];

  if (metrics.avgSales >= 200) indicators.push({ label: 'Alta Demanda', type: 'positive' });
  else if (metrics.avgSales >= 50) indicators.push({ label: 'Demanda Moderada', type: 'warning' });
  else indicators.push({ label: 'Baixa Demanda', type: 'negative' });

  if (metrics.competitors <= 15) indicators.push({ label: 'Baixa Concorrência', type: 'positive' });
  else if (metrics.competitors <= 35) indicators.push({ label: 'Concorrência Moderada', type: 'warning' });
  else indicators.push({ label: 'Alta Concorrência', type: 'negative' });

  if (metrics.opportunityScore >= 70) indicators.push({ label: 'Mercado Favorável', type: 'positive' });
  else if (metrics.opportunityScore >= 40) indicators.push({ label: 'Mercado Equilibrado', type: 'warning' });
  else indicators.push({ label: 'Mercado Desafiador', type: 'negative' });

  return indicators;
}
