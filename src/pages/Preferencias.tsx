import { SlidersHorizontal } from "lucide-react";

export default function Preferencias() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Preferências do Sistema</h1>
          <p className="text-sm text-muted-foreground">Configure o comportamento da plataforma</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        Funcionalidade em desenvolvimento
      </div>
    </div>
  );
}
