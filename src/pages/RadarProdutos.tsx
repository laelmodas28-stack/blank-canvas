import { Radar, Search, Filter } from "lucide-react";
import { useState } from "react";

interface Product {
  name: string;
  avgPrice: number;
  estimatedSales: number;
  competition: string;
  estimatedRevenue: number;
  score: number;
}

const mockProducts: Product[] = Array.from({ length: 15 }, (_, i) => ({
  name: `Produto ${i + 1} - Exemplo de Resultado`,
  avgPrice: Math.floor(Math.random() * 200) + 20,
  estimatedSales: Math.floor(Math.random() * 5000) + 100,
  competition: ["Baixa", "Média", "Alta"][Math.floor(Math.random() * 3)],
  estimatedRevenue: Math.floor(Math.random() * 100000) + 5000,
  score: Math.floor(Math.random() * 60) + 30,
}));

function getScoreColor(score: number) {
  if (score <= 40) return "text-destructive";
  if (score <= 60) return "text-amber-500";
  if (score <= 80) return "text-emerald-500";
  return "text-primary";
}

export default function RadarProdutos() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSales, setMinSales] = useState("");
  const [minRating, setMinRating] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setResults(mockProducts);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Radar de Produtos</h1>
          <p className="text-sm text-muted-foreground">Pesquise produtos por palavra-chave e analise o mercado</p>
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
            className="px-4 py-2.5 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Buscando..." : "Pesquisar"}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-border">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                <option value="">Todas</option>
                <option value="eletronicos">Eletrônicos</option>
                <option value="moda">Moda</option>
                <option value="casa">Casa</option>
                <option value="beleza">Beleza</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Preço Mínimo</label>
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="R$ 0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Preço Máximo</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="R$ 999" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Vendas Mínimas</label>
              <input type="number" value={minSales} onChange={(e) => setMinSales(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Avaliação Mínima</label>
              <input type="number" value={minRating} onChange={(e) => setMinRating(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produto</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Preço Médio</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vendas Est.</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Concorrência</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Faturamento Est.</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-right text-foreground">R$ {p.avgPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{p.estimatedSales.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.competition === "Baixa" ? "bg-emerald-500/10 text-emerald-500" :
                        p.competition === "Média" ? "bg-amber-500/10 text-amber-500" :
                        "bg-destructive/10 text-destructive"
                      }`}>{p.competition}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">R$ {(p.estimatedRevenue / 1000).toFixed(0)}k</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
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
