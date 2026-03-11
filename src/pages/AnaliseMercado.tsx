import { BarChart3, Link2, Search, Star, ShoppingCart, DollarSign, Users, TrendingUp } from "lucide-react";
import { useState } from "react";

interface AnalysisResult {
  title: string;
  price: number;
  rating: number;
  estimatedSales: number;
  category: string;
  platform: string;
  avgMarketPrice: number;
  priceRange: [number, number];
  competitors: number;
  avgSales: number;
  estimatedRevenue: number;
  opportunityScore: number;
  scoreLabel: string;
  scoreColor: string;
}

function getScoreInfo(score: number) {
  if (score <= 40) return { label: "Mercado Saturado", color: "text-destructive" };
  if (score <= 60) return { label: "Mercado Competitivo", color: "text-amber-500" };
  if (score <= 80) return { label: "Boa Oportunidade", color: "text-emerald-500" };
  return { label: "Alta Oportunidade", color: "text-primary" };
}

export default function AnaliseMercado() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const detectPlatform = (url: string) => {
    if (url.includes("shopee")) return "Shopee";
    if (url.includes("mercadolivre") || url.includes("mercadolibre")) return "Mercado Livre";
    return "Desconhecida";
  };

  const handleAnalyze = () => {
    if (!link.trim()) return;
    setLoading(true);

    // Simulated analysis - in production this would call an edge function
    setTimeout(() => {
      const platform = detectPlatform(link);
      const score = Math.floor(Math.random() * 60) + 30;
      const info = getScoreInfo(score);

      setResult({
        title: "Produto Exemplo - Análise Simulada",
        price: 89.9,
        rating: 4.5,
        estimatedSales: 1200,
        category: "Eletrônicos",
        platform,
        avgMarketPrice: 95.5,
        priceRange: [65.0, 130.0],
        competitors: 45,
        avgSales: 800,
        estimatedRevenue: 76000,
        opportunityScore: score,
        scoreLabel: info.label,
        scoreColor: info.color,
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Mercado</h1>
          <p className="text-sm text-muted-foreground">Cole o link de um produto para analisar o mercado</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Cole o link do produto (Shopee ou Mercado Livre)"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !link.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? "Analisando..." : "Analisar"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Plataformas suportadas: Shopee, Mercado Livre</p>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Dados do Produto</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Título</p>
                <p className="font-medium text-foreground">{result.title}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Preço</p>
                <p className="font-medium text-foreground">R$ {result.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avaliações</p>
                <p className="font-medium text-foreground flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {result.rating}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vendas Estimadas</p>
                <p className="font-medium text-foreground">{result.estimatedSales.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Plataforma</p>
                <p className="font-medium text-foreground">{result.platform}</p>
              </div>
            </div>
          </div>

          {/* Market Data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <DollarSign className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Preço Médio</p>
              <p className="text-xl font-bold text-foreground">R$ {result.avgMarketPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">R$ {result.priceRange[0].toFixed(0)} - R$ {result.priceRange[1].toFixed(0)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <Users className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Concorrentes</p>
              <p className="text-xl font-bold text-foreground">{result.competitors}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <ShoppingCart className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Vendas Médias</p>
              <p className="text-xl font-bold text-foreground">{result.avgSales.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <TrendingUp className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Faturamento Est.</p>
              <p className="text-xl font-bold text-foreground">R$ {(result.estimatedRevenue / 1000).toFixed(0)}k</p>
            </div>
          </div>

          {/* Opportunity Score */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Score de Oportunidade</h2>
            <div className="flex items-center gap-6">
              <div className="relative h-28 w-28">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="10"
                    strokeDasharray={`${(result.opportunityScore / 100) * 327} 327`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{result.opportunityScore}</span>
                </div>
              </div>
              <div>
                <p className={`text-lg font-bold ${result.scoreColor}`}>{result.scoreLabel}</p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>Demanda: 40% | Concorrência: 30%</p>
                  <p>Avaliações: 20% | Preço: 10%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
