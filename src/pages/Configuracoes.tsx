import { User, Save } from "lucide-react";
import { useState } from "react";

export default function Configuracoes() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [defaultPlatform, setDefaultPlatform] = useState("shopee");
  const [taxRate, setTaxRate] = useState("6");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil do Usuário</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações e configurações</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Informações Pessoais</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Nome Completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Configurações de Venda</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Plataforma Padrão</label>
            <select value={defaultPlatform} onChange={(e) => setDefaultPlatform(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
              <option value="shopee">Shopee</option>
              <option value="mercadolivre">Mercado Livre</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Alíquota de Impostos Padrão (%)</label>
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="6" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
        </div>

        <button className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Save className="h-4 w-4" />
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
