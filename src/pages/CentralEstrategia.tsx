import { useState } from "react";
import {
  Brain,
  Megaphone,
  Coins,
  Package,
  FlaskConical,
  Gauge,
  TrendingUp,
  Bell,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportImporter } from "@/features/strategy/components/ReportImporter";
import { ExecutiveSummary } from "@/features/strategy/components/ExecutiveSummary";
import { RecommendationsPanel } from "@/features/strategy/components/RecommendationsPanel";
import { SimulationCenter } from "@/features/strategy/components/SimulationCenter";
import { BusinessScore } from "@/features/strategy/components/BusinessScore";
import { Forecasts } from "@/features/strategy/components/Forecasts";
import { AlertsFeed } from "@/features/strategy/components/AlertsFeed";

type Tab =
  | "executivo"
  | "anuncios"
  | "lucro"
  | "produto"
  | "simulacao"
  | "score"
  | "previsoes"
  | "alertas"
  | "importar";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "executivo", label: "Visão Executiva", icon: Brain },
  { id: "anuncios", label: "Análise de Anúncios", icon: Megaphone },
  { id: "lucro", label: "Motor de Lucro", icon: Coins },
  { id: "produto", label: "Análise de Produto", icon: Package },
  { id: "simulacao", label: "Simulações", icon: FlaskConical },
  { id: "score", label: "Score do Negócio", icon: Gauge },
  { id: "previsoes", label: "Previsões", icon: TrendingUp },
  { id: "alertas", label: "Alertas", icon: Bell },
  { id: "importar", label: "Importar Relatórios", icon: Upload },
];

export default function CentralEstrategia() {
  const [tab, setTab] = useState<Tab>("executivo");

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Central de Estratégia Inteligente</h1>
            <p className="text-sm text-muted-foreground">
              A IA analisa seus dados de Shopee e Mercado Livre e recomenda o que fazer para maximizar Lucro Líquido.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-border mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {tab === "executivo" && <ExecutiveSummary />}
        {tab === "anuncios" && <RecommendationsPanel scope="anuncios" />}
        {tab === "lucro" && <RecommendationsPanel scope="lucro" />}
        {tab === "produto" && <RecommendationsPanel scope="produto" />}
        {tab === "simulacao" && <SimulationCenter />}
        {tab === "score" && <BusinessScore />}
        {tab === "previsoes" && <Forecasts />}
        {tab === "alertas" && <AlertsFeed />}
        {tab === "importar" && <ReportImporter />}
      </div>
    </div>
  );
}
