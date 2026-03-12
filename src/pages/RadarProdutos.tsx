import {
  Radar, Search, Filter, Loader2, Star, AlertCircle, ExternalLink,
  TrendingUp, DollarSign, Users, ShoppingCart, Activity, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import {
  shopeeApi, getScoreInfo, getCompetitionLabel,
  type ShopeeProduct, type MarketMetrics, type SearchFilters
} from "@/lib/api/shopee";

function ScoreBadge({ score }: { score: number }) {
  const info = getScoreInfo(score);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${info.bg} ${info.color}`}>
      {score}
    </span>
  );
}

function CompetitionBadge({ count }: { count: number }) {
  const label = getCompetitionLabel(count);
  const styles = label === "Baixa"
    ? "bg-emerald-500/10 text-emerald-600"
    : label === "Média"
    ? "bg-amber-500/10 text-amber-600"
    : "bg-destructive/10 text-destructive";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles}`}>{label}</span>
  );
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
  const [sortField, setSortField] = useState<string>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    let aVal: number, bVal: number;
    switch (sortField) {
      case "price": aVal = a.price; bVal = b.price; break;
      case "sales": aVal = a.historicalSold; bVal = b.historicalSold; break;
      case "rating": aVal = a.ratingAvg; bVal = b.ratingAvg; break;
      case "revenue": aVal = a.price * a.historicalSold; bVal = b.price * b.historicalSold; break;
      default: aVal = a.score || 0; bVal = b.score || 0;
    }
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? <ChevronDown className="h-3 w-3 inline ml-0.5" /> : <ChevronUp className="h-3 w-3 inline ml-0.5" />;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Radar de Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Pesquise e analise produtos da Shopee por palavra-chave
          </p>
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
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg border text-sm transition-colors ${
              showFilters
                ? "border-primary bg-primary/5 text-primary"
                : "border-input bg-background text-muted-foreground hover:text-foreground"
            }`}
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
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-foreground font-medium">Coletando dados da Shopee</p>
          <p className="text-xs text-muted-foreground mt-1">Analisando até 50 produtos</p>
        </div>
      )}

      {/* Market summary */}
      {metrics && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <DollarSign className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Preço Médio</p>
            <p className="text-lg font-bold text-foreground">R$ {metrics.avgPrice.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <ShoppingCart className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Vendas Médias</p>
            <p className="text-lg font-bold text-foreground">{metrics.avgSales.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <Users className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Concorrentes</p>
            <p className="text-lg font-bold text-foreground">{metrics.competitors}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Faturamento Est.</p>
            <p className="text-lg font-bold text-foreground">
              R$ {metrics.estimatedRevenue >= 1000
                ? `${(metrics.estimatedRevenue / 1000).toFixed(0)}k`
                : metrics.estimatedRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <Activity className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Score Geral</p>
            <p className={`text-lg font-bold ${getScoreInfo(metrics.opportunityScore).color}`}>
              {metrics.opportunityScore}
            </p>
            <p className={`text-xs ${getScoreInfo(metrics.opportunityScore).color}`}>
              {getScoreInfo(metrics.opportunityScore).label}
            </p>
          </div>
        </div>
      )}

      {/* Results table */}
      {sortedResults.length > 0 && !loading && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {sortedResults.length} de {totalResults} produtos
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Produto
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("price")}
                  >
                    Preço <SortIcon field="price" />
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("sales")}
                  >
                    Vendas <SortIcon field="sales" />
                  </th>
                  <th
                    className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("rating")}
                  >
                    Avaliação <SortIcon field="rating" />
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Concorrência
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("revenue")}
                  >
                    Faturamento <SortIcon field="revenue" />
                  </th>
                  <th
                    className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("score")}
                  >
                    Score <SortIcon field="score" />
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Ver
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-foreground max-w-[220px] truncate">{p.title}</td>
                    <td className="px-4 py-3 text-right text-foreground font-medium">R$ {p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{p.historicalSold.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Star className="h-3 w-3 text-amber-500" /> {p.ratingAvg.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CompetitionBadge count={sortedResults.length} />
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      R$ {((p.price * p.historicalSold) / 1000).toFixed(0)}k
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={p.score || 0} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={`https://shopee.com.br/product-i.${p.shopid}.${p.itemid}`}
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
  );
}
