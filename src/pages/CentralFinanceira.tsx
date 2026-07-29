import { useState } from "react";
import {
  BarChart3, ShoppingCart, Package, Percent, Truck, Megaphone, Trophy, Brain, Bell, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FinanceOverview } from "@/features/finance/components/FinanceOverview";
import { SalesManager } from "@/features/finance/components/SalesManager";
import { ProductsManager } from "@/features/finance/components/ProductsManager";
import { FeeRulesEditor } from "@/features/finance/components/FeeRulesEditor";
import { ShippingIncentives } from "@/features/finance/components/ShippingIncentives";
import { AdsManager } from "@/features/finance/components/AdsManager";
import { ProductRanking } from "@/features/finance/components/ProductRanking";
import { StrategicAnalysis } from "@/features/finance/components/StrategicAnalysis";
import { FinanceAlerts } from "@/features/finance/components/FinanceAlerts";
import { FinanceSettingsPanel } from "@/features/finance/components/FinanceSettingsPanel";

type Tab =
  | "overview" | "sales" | "products" | "fees" | "shipping"
  | "ads" | "ranking" | "ai" | "alerts" | "settings";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Visão Geral", icon: BarChart3 },
  { id: "sales", label: "Vendas", icon: ShoppingCart },
  { id: "products", label: "Produtos & Custos", icon: Package },
  { id: "fees", label: "Taxas Shopee", icon: Percent },
  { id: "shipping", label: "Frete & Incentivos", icon: Truck },
  { id: "ads", label: "Ads", icon: Megaphone },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "ai", label: "Análise IA", icon: Brain },
  { id: "alerts", label: "Alertas", icon: Bell },
  { id: "settings", label: "Configurações", icon: Settings2 },
];

export default function CentralFinanceira() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Central de Inteligência Financeira Marketplace</h1>
            <p className="text-sm text-muted-foreground">
              Seu CFO Digital: quanto vendeu, quanto realmente ganhou, onde perde dinheiro e o que fazer para crescer.
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
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {tab === "overview" && <FinanceOverview />}
        {tab === "sales" && <SalesManager />}
        {tab === "products" && <ProductsManager />}
        {tab === "fees" && <FeeRulesEditor />}
        {tab === "shipping" && <ShippingIncentives />}
        {tab === "ads" && <AdsManager />}
        {tab === "ranking" && <ProductRanking />}
        {tab === "ai" && <StrategicAnalysis />}
        {tab === "alerts" && <FinanceAlerts />}
        {tab === "settings" && <FinanceSettingsPanel />}
      </div>
    </div>
  );
}
