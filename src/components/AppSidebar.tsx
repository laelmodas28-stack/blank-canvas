import {
  LayoutDashboard,
  Calculator,
  TrendingUp,
  Radar,
  BarChart3,
  Sparkles,
  History,
  User,
  SlidersHorizontal,
  ChevronDown,
  Trophy,
  Search,
  Menu,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

const precificacaoItems = [
  { title: "Calculadora de Lucro", url: "/precificacao", icon: Calculator },
  { title: "Preço Ideal", url: "/simulador-preco", icon: TrendingUp },
];

const inteligenciaItems = [
  { title: "Radar de Produtos", url: "/radar-produtos", icon: Radar },
  { title: "Análise de Mercado", url: "/analise-mercado", icon: BarChart3 },
  { title: "Produtos Vencedores", url: "/produtos-vencedores", icon: Trophy },
  { title: "Caçador de Produtos", url: "/cacador-produtos", icon: Search },
];

const anunciosItems = [
  { title: "Criar Anúncio com IA", url: "/criar-anuncio", icon: Sparkles },
];

const historicoItems = [
  { title: "Análises Salvas", url: "/historico", icon: History },
];

const configItems = [
  { title: "Perfil do Usuário", url: "/configuracoes", icon: User },
  { title: "Preferências", url: "/preferencias", icon: SlidersHorizontal },
];

interface MenuGroupProps {
  label: string;
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[];
  collapsed: boolean;
  currentPath: string;
}

function MenuGroup({ label, items, collapsed, currentPath }: MenuGroupProps) {
  const isActive = items.some((i) => currentPath.startsWith(i.url));
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-1">
      {!collapsed && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--sidebar-muted))] hover:text-[hsl(var(--sidebar-foreground))] transition-colors"
        >
          <span>{label}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
        </button>
      )}
      {(open || collapsed) && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]",
                collapsed && "justify-center px-2"
              )}
              activeClassName="bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))] font-medium"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-[hsl(var(--sidebar-background))] transition-all duration-200 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 border-b border-[hsl(var(--sidebar-border))] flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[hsl(var(--sidebar-primary))] flex items-center justify-center shrink-0">
          <BarChart3 className="h-4 w-4 text-[hsl(var(--sidebar-primary-foreground))]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))]">SellSmart</h2>
            <p className="text-xs text-[hsl(var(--sidebar-muted))]">Inteligência de Vendas</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        <NavLink
          to="/dashboard"
          end
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]",
            collapsed && "justify-center px-2"
          )}
          activeClassName="bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))] font-medium"
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <MenuGroup label="Precificação" items={precificacaoItems} collapsed={collapsed} currentPath={currentPath} />
        <MenuGroup label="Inteligência de Mercado" items={inteligenciaItems} collapsed={collapsed} currentPath={currentPath} />
        <MenuGroup label="Anúncios" items={anunciosItems} collapsed={collapsed} currentPath={currentPath} />
        <MenuGroup label="Histórico" items={historicoItems} collapsed={collapsed} currentPath={currentPath} />
        <MenuGroup label="Configurações" items={configItems} collapsed={collapsed} currentPath={currentPath} />
      </nav>

      <div className="p-3 border-t border-[hsl(var(--sidebar-border))]">
        <div className={cn("flex items-center gap-3 px-2", collapsed && "justify-center px-0")}>
          <div className="h-8 w-8 rounded-full bg-[hsl(var(--sidebar-accent))] flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-[hsl(var(--sidebar-foreground))]" />
          </div>
          {!collapsed && <p className="text-xs text-[hsl(var(--sidebar-muted))]">Usuário</p>}
        </div>
      </div>
    </aside>
  );
}
