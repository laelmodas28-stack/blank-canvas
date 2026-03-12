import { Sparkles, Copy, Check, Wand2, Tag, FileText, List, Hash, Loader2 } from "lucide-react";
import { useState } from "react";

interface GeneratedAd {
  title: string;
  description: string;
  benefits: string[];
  keywords: string[];
  cta: string;
}

const CATEGORIES = [
  "Eletrônicos", "Moda Feminina", "Moda Masculina", "Casa e Decoração",
  "Beleza e Cuidados", "Esportes e Lazer", "Brinquedos", "Automotivo",
  "Pet Shop", "Saúde", "Ferramentas", "Papelaria",
];

const TONES = [
  { value: "persuasivo", label: "Persuasivo" },
  { value: "profissional", label: "Profissional" },
  { value: "urgente", label: "Urgente" },
  { value: "emocional", label: "Emocional" },
];

export default function CriarAnuncio() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [differentials, setDifferentials] = useState("");
  const [tone, setTone] = useState("persuasivo");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedAd | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!productName.trim()) return;
    setLoading(true);

    const toneMap: Record<string, { prefix: string; suffix: string; cta: string }> = {
      persuasivo: {
        prefix: "Descubra",
        suffix: "Aproveite nossa oferta especial com frete grátis e entrega rápida para todo o Brasil. Satisfação garantida ou seu dinheiro de volta!",
        cta: "🔥 COMPRE AGORA e garanta o melhor preço!",
      },
      profissional: {
        prefix: "Apresentamos",
        suffix: "Produto selecionado com rigoroso controle de qualidade. Envio seguro e rastreável para todo o Brasil.",
        cta: "✅ Adicione ao carrinho e receba com rapidez.",
      },
      urgente: {
        prefix: "ÚLTIMAS UNIDADES!",
        suffix: "Estoque limitado — não perca esta oportunidade única! Entrega expressa disponível.",
        cta: "⚡ COMPRE ANTES QUE ACABE!",
      },
      emocional: {
        prefix: "Imagine ter",
        suffix: "Transforme seu dia a dia com este produto incrível. Você merece o melhor!",
        cta: "💛 Presenteie-se hoje mesmo!",
      },
    };

    const t = toneMap[tone] || toneMap.persuasivo;
    const diffList = differentials.trim()
      ? differentials.split(",").map(d => d.trim()).filter(Boolean)
      : ["Material de alta qualidade e durabilidade", "Envio rápido para todo o Brasil", "Garantia de satisfação de 30 dias"];

    setTimeout(() => {
      setResult({
        title: `${productName} - Alta Qualidade | Envio Rápido | ${category || "Melhor Preço"} | Garantia`,
        description: `${t.prefix} o ${productName} perfeito para suas necessidades! Produto de alta qualidade, com acabamento premium e durabilidade excepcional. Ideal para ${category || "uso diário"}. ${t.suffix}`,
        benefits: [
          ...diffList.slice(0, 3),
          "Atendimento ao cliente 7 dias por semana",
          "Embalagem segura e discreta",
        ],
        keywords: [
          productName.toLowerCase(),
          "frete grátis",
          "promoção",
          "melhor preço",
          (category || "produto").toLowerCase(),
          "alta qualidade",
          "envio rápido",
          "garantia",
          "oferta",
          "lançamento",
        ],
        cta: t.cta,
      });
      setLoading(false);
    }, 1800);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    if (!result) return;
    const full = `TÍTULO:\n${result.title}\n\nDESCRIÇÃO:\n${result.description}\n\nBENEFÍCIOS:\n${result.benefits.map((b, i) => `${i + 1}. ${b}`).join("\n")}\n\nPALAVRAS-CHAVE:\n${result.keywords.join(", ")}\n\nCTA:\n${result.cta}`;
    navigator.clipboard.writeText(full);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Wand2 className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Criar Anúncio com IA</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gere anúncios otimizados e prontos para publicar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT: Input Panel */}
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados do Produto</h2>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Nome do Produto *</label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ex: Fone Bluetooth TWS" className={inputClass} />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                <option value="">Selecione uma categoria</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Preço de Venda (R$)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" className={inputClass} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Custo (R$)</label>
                <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0,00" className={inputClass} />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Diferenciais (separados por vírgula)</label>
              <input type="text" value={differentials} onChange={e => setDifferentials(e.target.value)} placeholder="Ex: À prova d'água, Bateria 48h, Cancelamento de ruído" className={inputClass} />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Tom do Anúncio</label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-center ${
                      tone === t.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-accent border border-border"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !productName.trim()}
              className="w-full px-6 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Gerando anúncio..." : "Gerar Anúncio com IA"}
            </button>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="xl:col-span-8 space-y-4">
          {result ? (
            <>
              {/* Copy All */}
              <div className="flex justify-end">
                <button
                  onClick={copyAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all"
                >
                  {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === "all" ? "Copiado!" : "Copiar Tudo"}
                </button>
              </div>

              {/* Title */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-foreground text-sm">Título Otimizado</h2>
                  </div>
                  <button onClick={() => copyToClipboard(result.title, "title")} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted">
                    {copied === "title" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-sm text-foreground bg-muted/40 p-4 rounded-lg font-medium leading-relaxed">{result.title}</p>
                <p className="text-[11px] text-muted-foreground mt-2">{result.title.length} caracteres — recomendado: até 120</p>
              </div>

              {/* Description */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-foreground text-sm">Descrição Persuasiva</h2>
                  </div>
                  <button onClick={() => copyToClipboard(result.description, "desc")} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted">
                    {copied === "desc" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-sm text-foreground bg-muted/40 p-4 rounded-lg leading-relaxed">{result.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Benefits */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <List className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-foreground text-sm">Benefícios</h2>
                  </div>
                  <ul className="space-y-2.5">
                    {result.benefits.map((b, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Keywords */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold text-foreground text-sm">Palavras-chave SEO</h2>
                    </div>
                    <button onClick={() => copyToClipboard(result.keywords.join(", "), "kw")} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted">
                      {copied === "kw" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.map((k, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">{k}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-foreground text-sm">Call to Action (CTA)</h2>
                  </div>
                  <button onClick={() => copyToClipboard(result.cta, "cta")} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted">
                    {copied === "cta" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-base font-bold text-primary">{result.cta}</p>
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Wand2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados do produto e clique em "Gerar Anúncio com IA" para ver os resultados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
