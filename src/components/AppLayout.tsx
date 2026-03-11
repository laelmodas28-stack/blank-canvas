import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Menu } from "lucide-react";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center border-b border-border px-4 bg-card shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
