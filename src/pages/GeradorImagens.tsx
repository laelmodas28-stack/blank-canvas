import {
  ImagePlus, Upload, Download, RefreshCw, Loader2, AlertCircle,
  Palette, Camera, Shirt, Home, Sparkles, Wand2, Copy, Check
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "modelo" | "estudio" | "lifestyle";
type Style = "profissional" | "premium" | "persuasivo" | "minimalista";

const MODES: { id: Mode; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "modelo", label: "Modelo", desc: "Modelo humano usando o produto", icon: <Shirt className="h-5 w-5" /> },
  { id: "estudio", label: "Estúdio", desc: "Fundo limpo, foco no produto", icon: <Camera className="h-5 w-5" /> },
  { id: "lifestyle", label: "Lifestyle", desc: "Produto em cenário real", icon: <Home className="h-5 w-5" /> },
];

const STYLES: { id: Style; label: string; desc: string }[] = [
  { id: "profissional", label: "Profissional", desc: "Estúdio limpo, fundo branco" },
  { id: "premium", label: "Premium", desc: "Iluminação sofisticada, luxo" },
  { id: "persuasivo", label: "Persuasivo", desc: "Dinâmico, alta conversão" },
  { id: "minimalista", label: "Minimalista", desc: "Simples, elegante" },
];

export default function GeradorImagens() {
  const [mode, setMode] = useState<Mode>("estudio");
  const [style, setStyle] = useState<Style>("profissional");
  const [prompt, setPrompt] = useState("");
  const [colorVariation, setColorVariation] = useState("");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setInputImage(base64);
      setInputPreview(base64);
      setError("");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setGeneratedImage(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-product-image",
        {
          body: {
            prompt,
            mode,
            style,
            colorVariation: colorVariation || undefined,
            inputImage: inputImage || undefined,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Falha na geração");

      setGeneratedImage(data.imageUrl);
      setUsedModel(data.model || "");
    } catch (err: any) {
      setError(err.message || "Erro ao gerar imagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `produto-${mode}-${style}-${Date.now()}.png`;
    link.click();
  };

  const handleCopyImage = async () => {
    if (!generatedImage) return;
    try {
      const resp = await fetch(generatedImage);
      const blob = await resp.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar a imagem.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ImagePlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerador de Imagens com IA</h1>
          <p className="text-sm text-muted-foreground">
            Crie imagens profissionais de produtos para Shopee e Mercado Livre
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel - Controls */}
        <div className="space-y-5">
          {/* Image upload */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="text-sm font-medium text-foreground mb-3 block">
              Imagem do Produto (opcional)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            {inputPreview ? (
              <div className="relative group">
                <img
                  src={inputPreview}
                  alt="Produto"
                  className="w-full max-h-48 object-contain rounded-lg border border-border bg-muted"
                />
                <button
                  onClick={() => { setInputImage(null); setInputPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">Clique para enviar imagem</span>
                <span className="text-xs">PNG, JPG até 10MB</span>
              </button>
            )}
          </div>

          {/* Mode selector */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="text-sm font-medium text-foreground mb-3 block">Modo de Geração</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-all",
                    mode === m.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {m.icon}
                  <span className="font-medium text-xs">{m.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {MODES.find((m) => m.id === mode)?.desc}
            </p>
          </div>

          {/* Style selector */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="text-sm font-medium text-foreground mb-3 block">Estilo Visual</label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                    style === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span className={cn("text-sm font-medium", style === s.id ? "text-primary" : "text-foreground")}>
                    {s.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color variation */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Variação de Cor (opcional)
            </label>
            <input
              type="text"
              value={colorVariation}
              onChange={(e) => setColorVariation(e.target.value)}
              placeholder="Ex: preto, branco e bege, vermelho"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Custom prompt */}
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Prompt Personalizado (opcional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva detalhes adicionais... Ex: modelo feminina, cenário de praia, iluminação dourada"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gerando imagem...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Gerar Imagem
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right panel - Output */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-foreground">Resultado</h2>
            {usedModel && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {usedModel.split("/").pop()}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            {loading ? (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-3" />
                <p className="text-foreground font-medium">Gerando imagem com IA</p>
                <p className="text-xs text-muted-foreground mt-1">Pode levar até 30 segundos...</p>
              </div>
            ) : generatedImage ? (
              <img
                src={generatedImage}
                alt="Imagem gerada"
                className="max-w-full max-h-[500px] object-contain rounded-lg border border-border"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImagePlus className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">A imagem gerada aparecerá aqui</p>
                <p className="text-xs mt-1">Selecione um modo, estilo e clique em "Gerar Imagem"</p>
              </div>
            )}
          </div>

          {generatedImage && !loading && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={handleCopyImage}
                className="py-2.5 px-4 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={handleGenerate}
                className="py-2.5 px-4 rounded-lg border border-border text-foreground text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
