import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Radar,
  BarChart3,
  Sparkles,
  History,
  ArrowRight,
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
    description: "Monitore tendências e oportunidades de mercado",
    icon: Radar,
    url: "/radar-produtos",
    color: "hsl(160 60% 45%)",
  },
  {
    title: "Análise de Mercado",
    description: "Insights detalhados sobre seu nicho de atuação",
    icon: BarChart3,
    url: "/analise-mercado",
    color: "hsl(280 60% 55%)",
  },
  {
    title: "Criar Anúncio com IA",
    description: "Gere anúncios otimizados usando inteligência artificial",
    icon: Sparkles,
    url: "/criar-anuncio",
    color: "hsl(30 90% 55%)",
  },
  {
    title: "Histórico de Análises",
    description: "Acesse seus cálculos e análises anteriores",
    icon: History,
    url: "/historico",
    color: "hsl(200 60% 50%)",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo à sua plataforma de vendas. Escolha uma ferramenta para começar.
        </p>
      </div>

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
