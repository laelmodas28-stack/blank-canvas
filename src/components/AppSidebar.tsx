import {
  LayoutDashboard,
  Calculator,
  TrendingUp,
  Radar,
  BarChart3,
  Sparkles,
  History,
  Settings,
  User,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const precificacaoItems = [
  { title: "Calculadora de Lucro", url: "/precificacao", icon: Calculator },
  { title: "Simulador de Preço Ideal", url: "/simulador-preco", icon: TrendingUp },
];

const inteligenciaItems = [
  { title: "Radar de Produtos", url: "/radar-produtos", icon: Radar },
  { title: "Análise de Mercado", url: "/analise-mercado", icon: BarChart3 },
];

const anunciosItems = [
  { title: "Criar Anúncio com IA", url: "/criar-anuncio", icon: Sparkles },
];

const historicoItems = [
  { title: "Análises Salvas", url: "/historico", icon: History },
];

const configItems = [
  { title: "Perfil do Usuário", url: "/configuracoes", icon: User },
  { title: "Preferências do Sistema", url: "/preferencias", icon: SlidersHorizontal },
];

interface MenuGroupProps {
  label: string;
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[];
  collapsed: boolean;
  currentPath: string;
}

function MenuGroup({ label, items, collapsed, currentPath }: MenuGroupProps) {
  const isActive = items.some((i) => currentPath.startsWith(i.url));

  return (
    <Collapsible defaultOpen={isActive || true}>
      <SidebarGroup>
        <CollapsibleTrigger className="w-full">
          <SidebarGroupLabel className="flex items-center justify-between text-sidebar-muted uppercase text-xs tracking-wider cursor-pointer hover:text-sidebar-foreground transition-colors">
            {!collapsed && <span>{label}</span>}
            {!collapsed && <ChevronDown className="h-3 w-3" />}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Calculator className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">Calculadora</h2>
              <p className="text-xs text-sidebar-muted">Plataforma de Vendas</p>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <Calculator className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <MenuGroup label="Precificação" items={precificacaoItems} collapsed={collapsed} currentPath={currentPath} />
        <MenuGroup label="Inteligência de Mercado" items={inteligenciaItems} collapsed={collapsed} currentPath={currentPath} />
        <MenuGroup label="Anúncios" items={anunciosItems} collapsed={collapsed} currentPath={currentPath} />
        <MenuGroup label="Histórico" items={historicoItems} collapsed={collapsed} currentPath={currentPath} />
        <MenuGroup label="Configurações" items={configItems} collapsed={collapsed} currentPath={currentPath} />
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <User className="h-4 w-4 text-sidebar-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sidebar-muted">Usuário</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
