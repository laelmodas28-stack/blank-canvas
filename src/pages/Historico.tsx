import { History, ExternalLink } from "lucide-react";

const mockHistory = [
  { product: "Fone Bluetooth TWS", platform: "Shopee", score: 72, date: "2026-03-10" },
  { product: "Capinha iPhone 15", platform: "Mercado Livre", score: 58, date: "2026-03-09" },
  { product: "Luminária LED USB", platform: "Shopee", score: 85, date: "2026-03-08" },
  { product: "Organizador de Mesa", platform: "Mercado Livre", score: 44, date: "2026-03-07" },
  { product: "Câmera Wi-Fi", platform: "Shopee", score: 67, date: "2026-03-06" },
];

function getScoreColor(score: number) {
  if (score <= 40) return "text-destructive";
  if (score <= 60) return "text-amber-500";
  if (score <= 80) return "text-emerald-500";
  return "text-primary";
}

export default function Historico() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análises Salvas</h1>
          <p className="text-sm text-muted-foreground">Acesse seus cálculos e análises anteriores</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produto</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plataforma</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {mockHistory.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{item.product}</td>
                  <td className="px-4 py-3 text-foreground">{item.platform}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${getScoreColor(item.score)}`}>{item.score}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.date}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-primary hover:text-primary/80 transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Dados de exemplo. As análises serão salvas automaticamente conforme você utilizar a plataforma.
      </p>
    </div>
  );
}
