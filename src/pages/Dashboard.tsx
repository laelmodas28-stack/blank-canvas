import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Radar,
  BarChart3,
  Sparkles,
  Trophy,
  ArrowRight,
  Package,
  Target,
  TrendingUp,
} from "lucide-react";

const cards = [
  {
    title: "Calculadora de Precificação",
    description: "Calcule lucros e margens para seus produtos",
    icon: Calculator,
    url: "/precificacao",
    color: "hsl(220 72% 50%)",
  },
  {
    title: "Radar de Produtos",
    description: "Pesquise e analise produtos por palavra-chave",
    icon: Radar,
    url: "/radar-produtos",
    color: "hsl(160 60% 45%)",
  },
  {
    title: "Análise de Mercado",
    description: "Analise um produto pelo link e estude a concorrência",
    icon: BarChart3,
    url: "/analise-mercado",
    color: "hsl(280 60% 55%)",
  },
  {
    title: "Produtos Vencedores",
    description: "Descubra os produtos com maior potencial de lucro",
    icon: Trophy,
    url: "/produtos-vencedores",
    color: "hsl(40 90% 50%)",
  },
  {
    title: "Criar Anúncio com IA",
    description: "Gere títulos e descrições otimizados para marketplaces",
    icon: Sparkles,
    url: "/criar-anuncio",
    color: "hsl(30 90% 55%)",
  },
];

const metrics = [
  {
    label: "Produtos Analisados",
    value: "0",
    icon: Package,
    color: "hsl(220 72% 50%)",
  },
  {
    label: "Oportunidades Encontradas",
    value: "0",
    icon: Target,
    color: "hsl(160 60% 45%)",
  },
  {
    label: "Média de Lucro Estimado",
    value: "0%",
    icon: TrendingUp,
    color: "hsl(40 90% 50%)",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo à sua plataforma de inteligência para marketplaces.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-card border border-border rounded-xl p-5 flex items-center gap-4"
          >
            <div
              className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${m.color}15`, color: m.color }}
            >
              <m.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-sm text-muted-foreground">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Acesso Rápido</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.url)}
            className="group relative bg-card border border-border rounded-xl p-6 text-left hover:shadow-lg hover:border-primary/30 transition-all duration-200"
          >
            <div
              className="h-11 w-11 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: `${card.color}15`, color: card.color }}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {card.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {card.description}
            </p>
            <ArrowRight className="absolute top-6 right-6 h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
