import { AlertTriangle, TrendingUp, TrendingDown, Zap } from "lucide-react";

export interface Recommendation {
  categoria: string;
  titulo: string;
  porque: string;
  acao_sugerida: string;
  impacto_financeiro_reais: number;
  melhoria_estimada?: string;
  confianca: number;
  risco: "baixo" | "medio" | "alto" | string;
  prioridade: number;
}

const RISK_STYLES: Record<string, string> = {
  baixo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medio: "bg-amber-50 text-amber-700 border-amber-200",
  alto: "bg-rose-50 text-rose-700 border-rose-200",
};

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const positive = rec.impacto_financeiro_reais >= 0;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {rec.categoria}
            </span>
            <span className="text-[10px] font-semibold text-primary">
              Prioridade {rec.prioridade}
            </span>
          </div>
          <h4 className="text-base font-semibold text-foreground">{rec.titulo}</h4>
        </div>
        <div
          className={[
            "flex items-center gap-1 shrink-0 text-sm font-semibold px-2.5 py-1 rounded-md",
            positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
          ].join(" ")}
        >
          {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            rec.impacto_financeiro_reais
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Por que</p>
          <p className="text-foreground">{rec.porque}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
            Ação recomendada
          </p>
          <p className="text-foreground flex items-start gap-2">
            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            {rec.acao_sugerida}
          </p>
        </div>
        {rec.melhoria_estimada && (
          <p className="text-xs text-muted-foreground">Ganho estimado: {rec.melhoria_estimada}</p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span
          className={[
            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
            RISK_STYLES[rec.risco] ?? RISK_STYLES.medio,
          ].join(" ")}
        >
          Risco {rec.risco}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground">
          Confiança {rec.confianca}%
        </span>
      </div>
    </div>
  );
}

export function EmptyRecommendations({ message }: { message: string }) {
  return (
    <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
      <AlertTriangle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
