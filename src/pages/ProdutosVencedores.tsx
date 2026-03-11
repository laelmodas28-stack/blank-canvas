import { Trophy, Search, Star, TrendingUp, ShoppingCart } from "lucide-react";
import { useState } from "react";

interface WinningProduct {
  rank: number;
  name: string;
  category: string;
  avgPrice: number;
  estimatedSales: number;
  rating: number;
  score: number;
  trend: string;
}

const categories = [
  "Eletrônicos",
  "Moda e Acessórios",
  "Casa e Decoração",
  "Beleza e Saúde",
  "Esportes",
  "Brinquedos",
  "Automotivo",
  "Informática",
];

function getScoreColor(score: number) {
  if (score <= 40) return "text-destructive";
  if (score <= 60) return "text-amber-500";
  if (score <= 80) return "text-emerald-500";
  return "text-primary";
}

export default function ProdutosVencedores() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [results, setResults] = useState<WinningProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!selectedCategory) return;
    setLoading(true);
    setTimeout(() => {
      const products: WinningProduct[] = Array.from({ length: 20 }, (_, i) => ({
        rank: i + 1,
        name: `Produto Top ${i + 1} - ${selectedCategory}`,
        category: selectedCategory,
        avgPrice: Math.floor(Math.random() * 300) + 30,
        estimatedSales: Math.floor(Math.random() * 10000) + 500,
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        score: Math.floor(Math.random() * 40) + 55,
        trend: ["Alta", "Estável", "Crescente"][Math.floor(Math.random() * 3)],
      })).sort((a, b) => b.score - a.score);
      setResults(products);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos Vencedores</h1>
          <p className="text-sm text-muted-foreground">Descubra os top 20 produtos com maior potencial</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={loading || !selectedCategory}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? "Buscando..." : "Encontrar Produtos"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produto</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Preço Médio</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vendas</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Avaliação</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Tendência</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => (
                  <tr key={p.rank} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-center font-bold text-muted-foreground">{p.rank}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-right text-foreground">R$ {p.avgPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{p.estimatedSales.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {p.rating}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.trend === "Alta" ? "bg-emerald-500/10 text-emerald-500" :
                        p.trend === "Crescente" ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      }`}>{p.trend}</span>
                    </td>
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
