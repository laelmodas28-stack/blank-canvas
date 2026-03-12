import { Sparkles, Copy, Check, Wand2, Tag, FileText, Hash, Loader2, ShoppingBag, Award } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TitleItem {
  text: string;
  platform: string;
  charCount: number;
}

interface GeneratedListing {
  titles: TitleItem[];
  description: string;
  keywords: string[];
}

const CATEGORIES = [
  "Eletrônicos", "Moda Feminina", "Moda Masculina", "Casa e Decoração",
  "Beleza e Cuidados", "Esportes e Lazer", "Brinquedos", "Automotivo",
  "Pet Shop", "Saúde", "Ferramentas", "Papelaria",
];

const STYLES = [
  { value: "persuasivo", label: "Persuasivo", desc: "Emocional e envolvente" },
  { value: "profissional", label: "Profissional", desc: "Claro e objetivo" },
  { value: "premium", label: "Premium", desc: "Sofisticado e exclusivo" },
];

export default function CriarAnuncio() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [differentials, setDifferentials] = useState("");
  const [style, setStyle] = useState("persuasivo");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedListing | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!productName.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-listing", {
        body: { productName, category, differentials, style },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (!data?.success || !data?.data) throw new Error("Resposta inválida da IA");

      setResult(data.data);
      toast.success("Anúncio gerado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar anúncio");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    if (!result) return;
    const titlesText = result.titles.map((t, i) => `${i + 1}. [${t.platform}] ${t.text}`).join("\n");
    const full = `TÍTULOS:\n${titlesText}\n\nDESCRIÇÃO:\n${result.description}\n\nPALAVRAS-CHAVE:\n${result.keywords.join(", ")}`;
    navigator.clipboard.writeText(full);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  const platformColor = (p: string) =>
    p.toLowerCase().includes("shopee")
      ? "bg-orange-500/10 text-orange-600 border-orange-200"
      : "bg-blue-500/10 text-blue-600 border-blue-200";

  const platformLimit = (p: string) =>
    p.toLowerCase().includes("shopee") ? 120 : 60;

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Wand2 className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Criar Anúncio com IA</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gere anúncios otimizados para Shopee e Mercado Livre com inteligência artificial
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT — Config */}
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dados do Produto
            </h2>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Nome do Produto *</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Fone Bluetooth TWS"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">Selecione uma categoria</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Diferenciais (separados por vírgula)
              </label>
              <textarea
                value={differentials}
                onChange={(e) => setDifferentials(e.target.value)}
                placeholder="Ex: À prova d'água, Bateria 48h, Cancelamento de ruído"
                rows={3}
                className={inputClass + " resize-none"}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Estilo da Descrição
              </label>
              <div className="space-y-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`w-full px-4 py-3 rounded-lg text-left transition-all border ${
                      style === s.value
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-accent border-border"
                    }`}
                  >
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className={`block text-xs mt-0.5 ${style === s.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {s.desc}
                    </span>
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
              {loading ? "Gerando com IA..." : "Gerar Anúncio com IA"}
            </button>
          </div>
        </div>

        {/* RIGHT — Results */}
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

              {/* Titles */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Títulos Otimizados para SEO</h2>
                </div>
                <div className="space-y-3">
                  {result.titles.map((t, i) => {
                    const limit = platformLimit(t.platform);
                    const len = t.text.length;
                    const over = len > limit;
                    return (
                      <div key={i} className="bg-muted/40 rounded-lg p-3.5 group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${platformColor(t.platform)}`}>
                                {t.platform}
                              </span>
                              <span className={`text-[10px] ${over ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                {len}/{limit} caracteres
                              </span>
                            </div>
                            <p className="text-sm text-foreground font-medium leading-relaxed">{t.text}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(t.text, `title-${i}`)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            {copied === `title-${i}` ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-foreground text-sm">Descrição Completa</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium capitalize">
                      {style}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.description, "desc")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
                  >
                    {copied === "desc" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-sm text-foreground bg-muted/40 p-5 rounded-lg leading-relaxed whitespace-pre-line">
                  {result.description}
                </div>
              </div>

              {/* Keywords */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-foreground text-sm">Palavras-chave SEO</h2>
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.keywords.join(", "), "kw")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
                  >
                    {copied === "kw" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((k, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Wand2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Preencha o nome do produto e clique em "Gerar Anúncio com IA" para criar títulos e descrição otimizados.
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Shopee</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Award className="h-3.5 w-3.5" />
                  <span>Mercado Livre</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
