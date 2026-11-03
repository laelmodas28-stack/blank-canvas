import { useNavigate, Link } from "react-router-dom";
import {
  Calculator,
  TrendingUp,
  Sparkles,
  ImagePlus,
  ArrowRight,
  User,
  History,
} from "lucide-react";
import { usePricingStore } from "@/features/pricing/hooks/usePricingStore";
import { PLATFORM_NAMES } from "@/features/pricing/lib/config";
import { brl, percent } from "@/features/pricing/components/PriceBreakdown";

const quickCards = [
  {
    title: "Preço Ideal",
    description: "Encontre o preço certo para a margem que você quer",
    icon: TrendingUp,
    url: "/simulador-preco",
  },
  {
    title: "Criar Anúncio com IA",
    description: "Títulos e descrições otimizados para marketplaces",
    icon: Sparkles,
    url: "/criar-anuncio",
  },
  {
    title: "Gerador de Imagens IA",
    description: "Imagens de produto prontas para anúncio",
    icon: ImagePlus,
    url: "/gerador-imagens",
  },
];

const steps = [
  { title: "Configure o Perfil da loja", description: "Informe imposto e embalagem uma única vez.", url: "/configuracoes" },
  { title: "Calcule no Lucro Certo", description: "Veja lucro e margem reais em cada plataforma.", url: "/precificacao" },
  { title: "Crie o anúncio com IA", description: "Gere título e descrição prontos para publicar.", url: "/criar-anuncio" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { rates, saved } = usePricingStore();
  const recent = saved.slice(0, 5);
  const ratesDate = (rates.updatedAt ?? rates.version).split("T")[0].replace(/^2026-2026-/, "2026-");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-foreground">PrecificaPro</h1>
        <p className="text-muted-foreground mt-1">
          Precifique com as taxas reais de cada marketplace e crie anúncios que vendem.
        </p>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        <button
          onClick={() => navigate("/precificacao")}
          className="group relative bg-primary rounded-xl p-7 text-left text-primary-foreground hover:shadow-lg transition-all md:row-span-2 flex flex-col"
        >
          <div className="h-12 w-12 rounded-lg bg-white/15 flex items-center justify-center mb-4">
            <Calculator className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold mb-1">Lucro Certo</h3>
          <p className="text-sm opacity-90 leading-relaxed">
            Calcule lucro e margem com as taxas reais de cada plataforma.
          </p>
          <span className="mt-auto pt-6 inline-flex items-center gap-2 text-sm font-medium">
            Começar agora
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
        {quickCards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.url)}
            className="group relative bg-card border border-border rounded-xl p-6 text-left hover:shadow-lg hover:border-primary/30 transition-all duration-200"
          >
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <card.icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">{card.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
            <ArrowRight className="absolute top-6 right-6 h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Taxas atualizadas em</p>
          <p className="text-lg font-bold text-foreground">{ratesDate}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Preços salvos</p>
          <p className="text-lg font-bold text-foreground">{saved.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Plataformas</p>
          <p className="text-sm font-semibold text-foreground leading-snug">
            Shopee, Mercado Livre, TikTok Shop, Magalu, Atacado
          </p>
        </div>
      </div>

      {/* Recently saved prices */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Preços salvos recentemente</h2>
          {recent.length > 0 && (
            <Link to="/historico" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              Ver todos
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum preço salvo ainda. Calcule no Lucro Certo e toque em Salvar preço.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground text-left border-b border-border">
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">Plataforma</th>
                  <th className="px-5 py-3 font-medium text-right">Preço</th>
                  <th className="px-5 py-3 font-medium text-right">Lucro</th>
                  <th className="px-5 py-3 font-medium text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.id} className="border-t border-border first:border-0">
                    <td className="px-5 py-3 font-medium text-foreground">{item.product}</td>
                    <td className="px-5 py-3 text-muted-foreground">{PLATFORM_NAMES[item.platform]}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">{brl(item.price)}</td>
                    <td className={`px-5 py-3 text-right whitespace-nowrap ${item.result.profit >= 0 ? "text-success" : "text-destructive"}`}>
                      {brl(item.result.profit)}
                    </td>
                    <td className="px-5 py-3 text-right">{percent(item.result.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Get started */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Comece em 3 passos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <button
              key={step.title}
              onClick={() => navigate(step.url)}
              className="group bg-card border border-border rounded-xl p-5 text-left hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-6 inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          Seus preços e taxas ficam salvos apenas neste dispositivo.
        </p>
      </section>
    </div>
  );
}
