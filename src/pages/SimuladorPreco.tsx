import { TrendingUp } from "lucide-react";

export default function SimuladorPreco() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulador de Preço Ideal</h1>
          <p className="text-sm text-muted-foreground">Encontre o preço ideal para maximizar seus lucros</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        Funcionalidade em desenvolvimento
      </div>
    </div>
  );
}
