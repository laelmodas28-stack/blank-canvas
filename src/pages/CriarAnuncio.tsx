import { Sparkles, Copy, Check } from "lucide-react";
import { useState } from "react";

interface GeneratedAd {
  title: string;
  description: string;
  benefits: string[];
  keywords: string[];
}

export default function CriarAnuncio() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedAd | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!productName.trim()) return;
    setLoading(true);

    // Simulated - would call AI edge function in production
    setTimeout(() => {
      setResult({
        title: `${productName} - Alta Qualidade | Envio Rápido | Garantia de Satisfação`,
        description: `Descubra o ${productName} perfeito para suas necessidades! Produto de alta qualidade, com acabamento premium e durabilidade excepcional. Ideal para ${category || "uso diário"}. Aproveite nossa oferta especial com frete grátis e entrega rápida para todo o Brasil. Satisfação garantida ou seu dinheiro de volta!`,
        benefits: [
          "Material de alta qualidade e durabilidade",
          "Envio rápido para todo o Brasil",
          "Garantia de satisfação de 30 dias",
          "Atendimento ao cliente 7 dias por semana",
          "Embalagem segura e discreta",
        ],
        keywords: [
          productName.toLowerCase(),
          "frete grátis",
          "promoção",
          "melhor preço",
          category.toLowerCase() || "produto",
          "alta qualidade",
          "envio rápido",
          "garantia",
        ],
      });
      setLoading(false);
    }, 2000);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Criar Anúncio com IA</h1>
          <p className="text-sm text-muted-foreground">Gere anúncios otimizados para marketplaces</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Dados do Produto</h2>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Nome do Produto</label>
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: Fone Bluetooth TWS" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
              <option value="">Selecione</option>
              <option value="Eletrônicos">Eletrônicos</option>
              <option value="Moda">Moda</option>
              <option value="Casa">Casa</option>
              <option value="Beleza">Beleza</option>
              <option value="Esportes">Esportes</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Preço de Venda (R$)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Custo do Produto (R$)</label>
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !productName.trim()}
            className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Gerando anúncio..." : "Gerar Anúncio com IA"}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-foreground">Título Otimizado</h2>
                <button onClick={() => copyToClipboard(result.title, "title")} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copied === "title" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">{result.title}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-foreground">Descrição Persuasiva</h2>
                <button onClick={() => copyToClipboard(result.description, "desc")} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copied === "desc" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg leading-relaxed">{result.description}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-3">Benefícios</h2>
              <ul className="space-y-2">
                {result.benefits.map((b, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 text-xs font-bold">{i + 1}</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-3">Palavras-chave SEO</h2>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((k, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">{k}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
