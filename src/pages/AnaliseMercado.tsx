import { BarChart3, Link2, Search, Star, ShoppingCart, DollarSign, Users, TrendingUp, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { shopeeApi, getScoreInfo, type ShopeeProduct, type MarketMetrics } from "@/lib/api/shopee";
import { supabase } from "@/integrations/supabase/client";

export default function AnaliseMercado() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<ShopeeProduct | null>(null);
  const [competitors, setCompetitors] = useState<ShopeeProduct[]>([]);
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);

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

    try {
      const result = await shopeeApi.analyzeLink(link);

      if (!result.success) {
        setError(result.error || "Erro ao analisar o produto.");
        return;
      }

      setProduct(result.product || null);
      setCompetitors(result.competitors || []);
      setMetrics(result.metrics || null);

      // Save to database
      if (result.product) {
        const p = result.product;
        await supabase.from("produtos_analisados" as any).insert({
          titulo: p.title,
          preco: p.price,
          vendas: p.historicalSold,
          avaliacoes: p.ratingCount,
          avaliacao_media: p.ratingAvg,
          categoria: p.category || null,
          plataforma: "shopee",
          shopid: p.shopid,
          itemid: p.itemid,
          nome_loja: p.shopName || null,
          estoque: p.stock,
          score_oportunidade: result.metrics?.opportunityScore || 0,
        });
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const scoreInfo = metrics ? getScoreInfo(metrics.opportunityScore) : null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Mercado</h1>
          <p className="text-sm text-muted-foreground">Cole o link de um produto da Shopee para analisar o mercado com dados reais</p>
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
              onChange={(e) => { setLink(e.target.value); setError(""); }}
              placeholder="Cole o link do produto da Shopee (ex: https://shopee.com.br/produto-i.123.456)"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm"
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
        <p className="text-xs text-muted-foreground mt-2">O sistema detecta automaticamente shopid e itemid do link e busca dados reais via API da Shopee.</p>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Buscando dados reais da Shopee...</p>
          <p className="text-xs text-muted-foreground mt-1">Coletando informações do produto e concorrentes</p>
        </div>
      )}

      {/* Results */}
      {product && metrics && !loading && (
        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Dados do Produto</h2>
            <div className="flex gap-4">
              {product.image && (
                <img src={product.image} alt={product.title} className="w-20 h-20 rounded-lg object-cover border border-border shrink-0" />
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm flex-1">
                <div className="col-span-2">
                  <p className="text-muted-foreground">Título</p>
                  <p className="font-medium text-foreground line-clamp-2">{product.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Preço</p>
                  <p className="font-medium text-foreground">R$ {product.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avaliações</p>
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" /> {product.ratingAvg.toFixed(1)} ({product.ratingCount})
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendas Totais</p>
                  <p className="font-medium text-foreground">{product.historicalSold.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estoque</p>
                  <p className="font-medium text-foreground">{product.stock.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categoria</p>
                  <p className="font-medium text-foreground">{product.category || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Loja</p>
                  <p className="font-medium text-foreground">{product.shopName || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Market Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <DollarSign className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Preço Médio</p>
              <p className="text-xl font-bold text-foreground">R$ {metrics.avgPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">R$ {metrics.minPrice.toFixed(0)} - R$ {metrics.maxPrice.toFixed(0)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <Users className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Concorrentes</p>
              <p className="text-xl font-bold text-foreground">{metrics.competitors}</p>
              <p className="text-xs text-muted-foreground">anúncios analisados</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <ShoppingCart className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Vendas Médias</p>
              <p className="text-xl font-bold text-foreground">{metrics.avgSales.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <TrendingUp className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Faturamento Est.</p>
              <p className="text-xl font-bold text-foreground">R$ {(metrics.estimatedRevenue / 1000).toFixed(0)}k</p>
            </div>
          </div>

          {/* Opportunity Score */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Score de Oportunidade</h2>
            <div className="flex items-center gap-6">
              <div className="relative h-28 w-28">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="10" strokeDasharray={`${(metrics.opportunityScore / 100) * 327} 327`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{metrics.opportunityScore}</span>
                </div>
              </div>
              <div>
                <p className={`text-lg font-bold ${scoreInfo?.color}`}>{scoreInfo?.label}</p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>Demanda: 40% | Concorrência: 30%</p>
                  <p>Avaliações: 20% | Preço: 10%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Competitors Table */}
          {competitors.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Produtos Similares ({competitors.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produto</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Preço</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vendas</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Avaliação</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((c, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-foreground max-w-xs truncate">{c.title}</td>
                        <td className="px-4 py-3 text-right text-foreground">R$ {c.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{c.historicalSold.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-foreground flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" /> {c.ratingAvg.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <a href={`https://shopee.com.br/product-i.${c.shopid}.${c.itemid}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
