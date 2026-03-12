import {
  BarChart3, Link2, Search, Star, ShoppingCart, DollarSign,
  Users, TrendingUp, AlertCircle, Loader2, ExternalLink,
  Package, Store, ArrowDown, ArrowUp, Minus, Database, RefreshCw,
  Activity, Target, Shield, Zap
} from "lucide-react";
import { useState } from "react";
import { shopeeApi, getScoreInfo, getMarketIndicators, type ShopeeProduct, type MarketMetrics } from "@/lib/api/shopee";

export default function AnaliseMercado() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ShopeeProduct | null>(null);
  const [competitors, setCompetitors] = useState<ShopeeProduct[]>([]);
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [dataSource, setDataSource] = useState<string>("");

  const handleAnalyze = async () => {
    if (!link.trim()) return;

    const platform = shopeeApi.detectPlatform(link);
    if (platform !== "Shopee") {
      setError("Atualmente apenas links da Shopee são suportados.");
      return;
    }

    setLoading(true);
    setError("");
    setProduct(null);
    setMetrics(null);
    setCompetitors([]);
    setDataSource("");

    try {
      const result = await shopeeApi.analyzeLink(link);

      if (!result.success) {
        setError(result.error || "Erro ao analisar o produto.");
        return;
      }

      setProduct(result.product || null);
      setCompetitors(result.competitors || []);
      setMetrics(result.metrics || null);
      setDataSource(result.dataSource || "live");
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const scoreInfo = metrics ? getScoreInfo(metrics.opportunityScore) : null;
  const indicators = metrics ? getMarketIndicators(metrics) : [];

  const pricePosition = product && metrics
    ? product.price < metrics.avgPrice ? "below" : product.price > metrics.avgPrice ? "above" : "avg"
    : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Mercado</h1>
          <p className="text-sm text-muted-foreground">
            Analise produtos da Shopee com extração de dados em tempo real
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="url"
              value={link}
              onChange={(e) => { setLink(e.target.value); setError(""); }}
              placeholder="Cole o link do produto da Shopee"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !link.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Analisando..." : "Analisar"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Extração automática via API e scraping com cache de 12 horas
        </p>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-foreground font-medium">Coletando dados do produto</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tentando endpoints da API, fallback para scraping se necessário
          </p>
        </div>
      )}

      {/* Results */}
      {product && metrics && !loading && (
        <div className="space-y-4">
          {/* Data source badge */}
          <div className="flex items-center gap-2">
            {dataSource === "cache" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-full px-3 py-1">
                <Database className="h-3 w-3" />
                Dados do cache (menos de 12h)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 rounded-full px-3 py-1">
                <RefreshCw className="h-3 w-3" />
                Dados coletados em tempo real
              </span>
            )}
          </div>

          {/* Product card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Dados do Produto</h2>
            </div>
            <div className="flex gap-5">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-24 h-24 rounded-lg object-cover border border-border shrink-0"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm leading-snug mb-3 line-clamp-2">
                  {product.title}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">Preço</p>
                    <p className="font-semibold text-foreground">R$ {product.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">Vendas</p>
                    <p className="font-semibold text-foreground">{product.historicalSold.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">Avaliação</p>
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      {product.ratingAvg.toFixed(1)}
                      <span className="text-xs text-muted-foreground font-normal">({product.ratingCount})</span>
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">Estoque</p>
                    <p className="font-semibold text-foreground">{product.stock.toLocaleString()}</p>
                  </div>
                </div>
                {(product.category || product.shopName) && (
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {product.category && (
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" /> {product.category}
                      </span>
                    )}
                    {product.shopName && (
                      <span className="flex items-center gap-1">
                        <Store className="h-3 w-3" /> {product.shopName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Market metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                {pricePosition === "below" && <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />}
                {pricePosition === "above" && <ArrowUp className="h-3.5 w-3.5 text-destructive" />}
                {pricePosition === "avg" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground">Preço Médio</p>
              <p className="text-xl font-bold text-foreground">R$ {metrics.avgPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                R$ {metrics.minPrice.toFixed(0)} – R$ {metrics.maxPrice.toFixed(0)}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <Users className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Concorrentes</p>
              <p className="text-xl font-bold text-foreground">{metrics.competitors}</p>
              <p className="text-xs text-muted-foreground mt-0.5">anúncios analisados</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <ShoppingCart className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Vendas Médias</p>
              <p className="text-xl font-bold text-foreground">{metrics.avgSales.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">por anúncio</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Faturamento Est.</p>
              <p className="text-xl font-bold text-foreground">
                R$ {metrics.estimatedRevenue >= 1000
                  ? `${(metrics.estimatedRevenue / 1000).toFixed(0)}k`
                  : metrics.estimatedRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">receita por anúncio</p>
            </div>
          </div>

          {/* Score + indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Score de Oportunidade</h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24 shrink-0">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeDasharray={`${(metrics.opportunityScore / 100) * 314} 314`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">{metrics.opportunityScore}</span>
                  </div>
                </div>
                <div>
                  <p className={`text-base font-bold ${scoreInfo?.color}`}>{scoreInfo?.label}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Demanda 40% | Concorrência 30%</p>
                    <p>Avaliações 20% | Preço 10%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Indicadores de Mercado</h2>
              </div>
              <div className="space-y-3">
                {indicators.map((ind, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      ind.type === 'positive' ? 'bg-emerald-500' :
                      ind.type === 'warning' ? 'bg-amber-500' : 'bg-destructive'
                    }`} />
                    <span className={`text-sm font-medium ${
                      ind.type === 'positive' ? 'text-emerald-600' :
                      ind.type === 'warning' ? 'text-amber-600' : 'text-destructive'
                    }`}>
                      {ind.label}
                    </span>
                  </div>
                ))}
                {metrics.avgRating && metrics.avgRating > 0 && (
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${metrics.avgRating >= 4 ? 'bg-emerald-500' : metrics.avgRating >= 3 ? 'bg-amber-500' : 'bg-destructive'}`} />
                    <span className={`text-sm font-medium ${metrics.avgRating >= 4 ? 'text-emerald-600' : metrics.avgRating >= 3 ? 'text-amber-600' : 'text-destructive'}`}>
                      Avaliação média {metrics.avgRating.toFixed(1)}/5
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Competitors */}
          {competitors.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                    Produtos Similares ({competitors.length})
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Produto</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Preço</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Vendas</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Avaliação</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((c, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-foreground max-w-xs truncate">{c.title}</td>
                        <td className="px-4 py-3 text-right text-foreground font-medium">R$ {c.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{c.historicalSold.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-foreground">
                            <Star className="h-3 w-3 text-amber-500" /> {c.ratingAvg.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <a
                            href={`https://shopee.com.br/product-i.${c.shopid}.${c.itemid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 inline" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
