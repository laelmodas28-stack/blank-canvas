import { Search, Crosshair, TrendingUp, DollarSign, Users, Star } from "lucide-react";
import { useState } from "react";

interface DiscoveredProduct {
  name: string;
  category: string;
  avgPrice: number;
  demand: number;
  competition: string;
  rating: number;
  score: number;
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
  "Pet Shop",
  "Papelaria",
];

function getScoreColor(score: number) {
  if (score <= 40) return "text-destructive bg-destructive/10";
  if (score <= 60) return "text-amber-500 bg-amber-500/10";
  if (score <= 80) return "text-emerald-500 bg-emerald-500/10";
  return "text-primary bg-primary/10";
}

export default function CacadorProdutos() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [results, setResults] = useState<DiscoveredProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDiscover = () => {
    if (!selectedCategory) return;
    setLoading(true);
    setTimeout(() => {
      const products: DiscoveredProduct[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Oportunidade ${i + 1} - ${selectedCategory}`,
        category: selectedCategory,
        avgPrice: Math.floor(Math.random() * 250) + 25,
        demand: Math.floor(Math.random() * 10000) + 1000,
        competition: ["Baixa", "Média", "Alta"][Math.floor(Math.random() * 3)],
        rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
        score: Math.floor(Math.random() * 50) + 45,
      })).sort((a, b) => b.score - a.score);
      setResults(products);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Crosshair className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caçador de Produtos</h1>
          <p className="text-sm text-muted-foreground">Descubra automaticamente oportunidades de mercado</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <p className="text-sm text-muted-foreground mb-4">
          Selecione uma categoria e o sistema irá escanear o mercado em busca das melhores oportunidades.
        </p>
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
            onClick={handleDiscover}
            disabled={loading || !selectedCategory}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? "Escaneando..." : "Caçar Oportunidades"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((p, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${getScoreColor(p.score)}`}>
                  {p.score}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Preço Médio</span>
                  <span className="text-foreground font-medium">R$ {p.avgPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Demanda</span>
                  <span className="text-foreground font-medium">{p.demand.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Concorrência</span>
                  <span className={`font-medium ${p.competition === "Baixa" ? "text-emerald-500" : p.competition === "Média" ? "text-amber-500" : "text-destructive"}`}>
                    {p.competition}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Avaliação</span>
                  <span className="text-foreground font-medium">{p.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
