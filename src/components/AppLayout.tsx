import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, BarChart3, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 transition-opacity duration-200",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-foreground/40"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar shadow-xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-3 right-3 p-2 rounded-md hover:bg-accent transition-colors z-10"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
          <AppSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between border-b border-border px-3 md:px-4 bg-card shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Mobile: open drawer. Desktop: toggle collapsed.
                if (window.matchMedia("(min-width: 768px)").matches) {
                  setCollapsed(!collapsed);
                } else {
                  setMobileOpen(true);
                }
              }}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">SellSmart</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
