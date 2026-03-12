import {
  BarChart3, Link2, Search, Star, ShoppingCart, DollarSign,
  Users, TrendingUp, AlertCircle, Loader2, ExternalLink,
  Package, Store, ArrowDown, ArrowUp, Minus, Database, RefreshCw,
  Activity, Target, Shield, Zap, Clock, Flame, ThumbsUp, ThumbsDown,
  MinusCircle, Award, MapPin, BarChart2, Heart
} from "lucide-react";
import { useState } from "react";
import { shopeeApi, getScoreInfo, getMarketIndicators, type ShopeeProduct, type MarketMetrics } from "@/lib/api/shopee";

interface AnalysisExtended {
  performanceScore: number;
  classification: { label: string; level: string };
  salesMetrics: { listingAgeDays: number; salesPerDay: number; salesLast30: number; salesLast7: number };
  sentiment: { positive: number; neutral: number; negative: number };
  sellerInfo: { name: string; location: string; rating: number; followers: number; responseRate: number };
}

function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const info = getScoreInfo(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-foreground">{score}</span>
        </div>
      </div>
      {label && <span className={`text-xs font-semibold ${info.color}`}>{label}</span>}
    </div>
  );
}

function ClassBadge({ level, label }: { level: string; label: string }) {
  const styles: Record<string, string> = {
    winner: "bg-primary/10 text-primary border-primary/20",
    high: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    low: "bg-destructive/10 text-destructive border-destructive/20",
  };
  const icons: Record<string, any> = { winner: Award, high: Flame, medium: BarChart2, low: MinusCircle };
  const Icon = icons[level] || BarChart2;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border ${styles[level] || styles.low}`}>
      <Icon className="h-4 w-4" /> {label}
    </span>
  );
}

function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        <div className="bg-emerald-500 transition-all" style={{ width: `${positive}%` }} />
        <div className="bg-amber-400 transition-all" style={{ width: `${neutral}%` }} />
        <div className="bg-destructive transition-all" style={{ width: `${negative}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-emerald-500" /> {positive}%</span>
        <span className="flex items-center gap-1"><Minus className="h-3 w-3 text-amber-500" /> {neutral}%</span>
        <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-destructive" /> {negative}%</span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <Icon className="h-4 w-4 text-muted-foreground mb-1.5" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnaliseMercado() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ShopeeProduct | null>(null);
  const [competitors, setCompetitors] = useState<ShopeeProduct[]>([]);
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisExtended | null>(null);
  const [dataSource, setDataSource] = useState<string>("");

  const handleAnalyze = async () => {
    if (!link.trim()) return;
    const platform = shopeeApi.detectPlatform(link);
    if (platform !== "Shopee") { setError("Atualmente apenas links da Shopee são suportados."); return; }
    setLoading(true); setError(""); setProduct(null); setMetrics(null); setCompetitors([]); setAnalysis(null); setDataSource("");
    try {
      const result = await shopeeApi.analyzeLink(link);
      if (!result.success) { setError(result.error || "Erro ao analisar o produto."); return; }
      setProduct(result.product || null);
      setCompetitors(result.competitors || []);
      setMetrics(result.metrics || null);
      setAnalysis((result as any).analysis || null);
      setDataSource(result.dataSource || "live");
    } catch (err: any) { setError(err.message || "Erro de conexão."); }
    finally { setLoading(false); }
  };

  const scoreInfo = metrics ? getScoreInfo(metrics.opportunityScore) : null;
  const indicators = metrics ? getMarketIndicators(metrics) : [];
  const pricePosition = product && metrics ? (product.price < metrics.avgPrice ? "below" : product.price > metrics.avgPrice ? "above" : "avg") : null;

  const formatDays = (d: number) => {
    if (d >= 365) return `${Math.round(d / 365)} ano(s)`;
    if (d >= 30) return `${Math.round(d / 30)} mês(es)`;
    return `${d} dias`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Mercado</h1>
          <p className="text-sm text-muted-foreground">Relatório completo de produto com dados reais da Shopee</p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="url" value={link} onChange={(e) => { setLink(e.target.value); setError(""); }}
              placeholder="Cole o link do produto da Shopee ou Mercado Livre"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()} />
          </div>
          <button onClick={handleAnalyze} disabled={loading || !link.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Analisando..." : "Analisar Produto"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Extração automática via API com cache de 12 horas • Detecção automática de plataforma</p>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-foreground font-medium">Coletando dados do produto</p>
          <p className="text-xs text-muted-foreground mt-1">Extraindo informações, concorrentes e calculando métricas</p>
        </div>
      )}

      {/* Full Report */}
      {product && metrics && !loading && (
        <div className="space-y-4">
          {/* Source badge */}
          <div className="flex items-center gap-2">
            {dataSource === "cache" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-full px-3 py-1">
                <Database className="h-3 w-3" /> Dados do cache (menos de 12h)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 rounded-full px-3 py-1">
                <RefreshCw className="h-3 w-3" /> Dados coletados em tempo real
              </span>
            )}
          </div>

          {/* Product + Classification */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Dados do Produto</h2>
              </div>
              {analysis && <ClassBadge level={analysis.classification.level} label={analysis.classification.label} />}
            </div>
            <div className="flex gap-5">
              {product.image && (
                <img src={product.image} alt={product.title} className="w-24 h-24 rounded-lg object-cover border border-border shrink-0" loading="lazy" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm leading-snug mb-3 line-clamp-2">{product.title}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">Preço</p>
                    <p className="font-semibold text-foreground">R$ {product.price.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">Vendas Totais</p>
                    <p className="font-semibold text-foreground">{product.historicalSold.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">Avaliação</p>
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500" /> {product.ratingAvg.toFixed(1)}
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
                    {product.category && <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {product.category}</span>}
                    {product.shopName && <span className="flex items-center gap-1"><Store className="h-3 w-3" /> {product.shopName}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sales Velocity */}
          {analysis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard icon={Flame} label="Vendas/Dia" value={analysis.salesMetrics.salesPerDay.toFixed(1)} sub="velocidade de vendas" />
              <MetricCard icon={TrendingUp} label="Últimos 30 dias" value={analysis.salesMetrics.salesLast30.toLocaleString()} sub="vendas estimadas" />
              <MetricCard icon={ShoppingCart} label="Últimos 7 dias" value={analysis.salesMetrics.salesLast7.toLocaleString()} sub="vendas estimadas" />
              <MetricCard icon={Clock} label="Idade do Anúncio" value={formatDays(analysis.salesMetrics.listingAgeDays)} sub="desde a publicação" />
            </div>
          )}

          {/* Market metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                {pricePosition === "below" && <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />}
                {pricePosition === "above" && <ArrowUp className="h-3.5 w-3.5 text-destructive" />}
                {pricePosition === "avg" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground">Preço Médio</p>
              <p className="text-lg font-bold text-foreground">R$ {metrics.avgPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">R$ {metrics.minPrice.toFixed(0)} – R$ {metrics.maxPrice.toFixed(0)}</p>
            </div>
            <MetricCard icon={Users} label="Concorrentes" value={String(metrics.competitors)} sub="anúncios similares" />
            <MetricCard icon={ShoppingCart} label="Vendas Médias" value={metrics.avgSales.toLocaleString()} sub="por anúncio" />
            <MetricCard icon={TrendingUp} label="Faturamento Est." value={`R$ ${metrics.estimatedRevenue >= 1000 ? `${(metrics.estimatedRevenue / 1000).toFixed(0)}k` : metrics.estimatedRevenue.toLocaleString()}`} sub="receita por anúncio" />
            <MetricCard icon={Heart} label="Fav. do Produto" value={String((product as any).liked || 0)} sub="curtidas" />
          </div>

          {/* Scores + Sentiment + Seller */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Performance Score */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Performance Score</h2>
              </div>
              <div className="flex items-center gap-4">
                <ScoreRing score={analysis?.performanceScore || 0} label={analysis?.classification.label} />
                <div className="flex-1 space-y-1.5 text-xs text-muted-foreground">
                  <p>Vendas: 35%</p>
                  <p>Avaliação: 25%</p>
                  <p>Reviews: 25%</p>
                  <p>Estoque + Likes: 15%</p>
                </div>
              </div>
            </div>

            {/* Sentiment */}
            {analysis && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Sentimento Reviews</h2>
                </div>
                <SentimentBar positive={analysis.sentiment.positive} neutral={analysis.sentiment.neutral} negative={analysis.sentiment.negative} />
                <div className="mt-3 text-xs text-muted-foreground">
                  <p>{product.ratingCount.toLocaleString()} avaliações totais</p>
                  <p>Nota média: {product.ratingAvg.toFixed(1)}/5</p>
                </div>
              </div>
            )}

            {/* Seller */}
            {analysis && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Informações do Vendedor</h2>
                </div>
                <div className="space-y-2.5 text-sm">
                  {analysis.sellerInfo.name && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Loja</span><span className="font-medium text-foreground">{analysis.sellerInfo.name}</span></div>
                  )}
                  {analysis.sellerInfo.location && (
                    <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Local</span><span className="font-medium text-foreground">{analysis.sellerInfo.location}</span></div>
                  )}
                  {analysis.sellerInfo.rating > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Avaliação</span><span className="font-medium text-foreground flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{analysis.sellerInfo.rating.toFixed(1)}</span></div>
                  )}
                  {analysis.sellerInfo.followers > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Seguidores</span><span className="font-medium text-foreground">{analysis.sellerInfo.followers.toLocaleString()}</span></div>
                  )}
                  {analysis.sellerInfo.responseRate > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Taxa Resposta</span><span className="font-medium text-foreground">{analysis.sellerInfo.responseRate}%</span></div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Opportunity Score + Market Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Score de Oportunidade</h2>
              </div>
              <div className="flex items-center gap-6">
                <ScoreRing score={metrics.opportunityScore} size={96} label={scoreInfo?.label} />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Demanda 40% | Concorrência 30%</p>
                  <p>Avaliações 20% | Preço 10%</p>
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
                    <div className={`h-2 w-2 rounded-full shrink-0 ${ind.type === 'positive' ? 'bg-emerald-500' : ind.type === 'warning' ? 'bg-amber-500' : 'bg-destructive'}`} />
                    <span className={`text-sm font-medium ${ind.type === 'positive' ? 'text-emerald-600' : ind.type === 'warning' ? 'text-amber-600' : 'text-destructive'}`}>{ind.label}</span>
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

          {/* Competitors Table */}
          {competitors.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                  Produtos Similares ({competitors.length})
                </h2>
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
                          <a href={`https://shopee.com.br/product-i.${c.shopid}.${c.itemid}`} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors">
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
