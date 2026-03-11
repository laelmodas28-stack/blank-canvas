import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export default function Preferencias() {
  const [currency, setCurrency] = useState("BRL");
  const [language, setLanguage] = useState("pt-BR");
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Preferências do Sistema</h1>
          <p className="text-sm text-muted-foreground">Configure o comportamento da plataforma</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Geral</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Moeda</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
              <option value="BRL">Real (R$)</option>
              <option value="USD">Dólar (US$)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Idioma</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Notificações</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Notificações por e-mail</p>
              <p className="text-xs text-muted-foreground">Receba alertas sobre oportunidades de mercado</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
