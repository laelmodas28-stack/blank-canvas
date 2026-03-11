import { Radar, Search, Filter, Loader2, Star, AlertCircle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { shopeeApi, getScoreInfo, getCompetitionLabel, type ShopeeProduct, type MarketMetrics, type SearchFilters } from "@/lib/api/shopee";
import { supabase } from "@/integrations/supabase/client";

function getScoreColor(score: number) {
  if (score <= 40) return "text-destructive";
  if (score <= 60) return "text-amber-500";
  if (score <= 80) return "text-emerald-500";
  return "text-primary";
}

function getCompetitionBadge(label: string) {
  if (label === "Baixa") return "bg-emerald-500/10 text-emerald-500";
  if (label === "Média") return "bg-amber-500/10 text-amber-500";
  return "bg-destructive/10 text-destructive";
}

export default function RadarProdutos() {
  const [keyword, setKeyword] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSales, setMinSales] = useState("");
  const [minRating, setMinRating] = useState("");
  const [results, setResults] = useState<ShopeeProduct[]>([]);
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");
  const [totalResults, setTotalResults] = useState(0);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    setMetrics(null);

    try {
      const filters: SearchFilters = {};
      if (minPrice) filters.minPrice = parseFloat(minPrice);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
      if (minSales) filters.minSales = parseInt(minSales);
      if (minRating) filters.minRating = parseFloat(minRating);

      const result = await shopeeApi.search(keyword, filters, 50);

      if (!result.success) {
        setError(result.error || "Erro ao buscar produtos.");
        return;
      }

      setResults(result.products || []);
      setMetrics(result.metrics || null);
      setTotalResults(result.total || 0);

      // Save top results to database
      const products = result.products || [];
      for (const p of products.slice(0, 10)) {
        await supabase.from("produtos_analisados" as any).insert({
          titulo: p.title,
          preco: p.price,
          vendas: p.historicalSold,
          avaliacoes: p.ratingCount,
          avaliacao_media: p.ratingAvg,
          plataforma: "shopee",
          shopid: p.shopid,
          itemid: p.itemid,
          estoque: p.stock,
          score_oportunidade: p.score || 0,
        });
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Radar de Produtos</h1>
          <p className="text-sm text-muted-foreground">Pesquise produtos na Shopee por palavra-chave e analise o mercado com dados reais</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Digite uma palavra-chave (ex: fone bluetooth)"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg border text-sm transition-colors ${showFilters ? "border-primary bg-primary/5 text-primary" : "border-input bg-background text-muted-foreground hover:text-foreground"}`}
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Buscando..." : "Pesquisar"}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Preço Mínimo (R$)</label>
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Preço Máximo (R$)</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="999" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Vendas Mínimas</label>
              <input type="number" value={minSales} onChange={(e) => setMinSales(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Avaliação Mínima</label>
              <input type="number" value={minRating} onChange={(e) => setMinRating(e.target.value)} placeholder="0" step="0.1" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
          </div>
        )}

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
          <p className="text-muted-foreground">Buscando produtos reais na Shopee...</p>
        </div>
      )}

      {/* Market Summary */}
      {metrics && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Preço Médio</p>
            <p className="text-lg font-bold text-foreground">R$ {metrics.avgPrice.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Vendas Médias</p>
            <p className="text-lg font-bold text-foreground">{metrics.avgSales.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Concorrentes</p>
            <p className="text-lg font-bold text-foreground">{metrics.competitors}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Faturamento Est.</p>
            <p className="text-lg font-bold text-foreground">R$ {(metrics.estimatedRevenue / 1000).toFixed(0)}k</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Score Geral</p>
            <p className={`text-lg font-bold ${getScoreColor(metrics.opportunityScore)}`}>{metrics.opportunityScore}</p>
            <p className={`text-xs ${getScoreColor(metrics.opportunityScore)}`}>{getScoreInfo(metrics.opportunityScore).label}</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && !loading && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">{results.length} produtos encontrados (de {totalResults} resultados)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produto</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Preço</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vendas</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Avaliação</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Concorrência</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Faturamento</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Link</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p, i) => {
                  const compLabel = getCompetitionLabel(results.length);
                  return (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-foreground max-w-[250px] truncate">{p.title}</td>
                      <td className="px-4 py-3 text-right text-foreground">R$ {p.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{p.historicalSold.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-foreground">
                        <span className="flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" /> {p.ratingAvg.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getCompetitionBadge(compLabel)}`}>{compLabel}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">R$ {(p.price * p.historicalSold / 1000).toFixed(0)}k</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${getScoreColor(p.score || 0)}`}>{p.score || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <a href={`https://shopee.com.br/product-i.${p.shopid}.${p.itemid}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <ExternalLink className="h-4 w-4 inline" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
