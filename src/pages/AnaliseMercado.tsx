import {
  BarChart3, Link2, Search, Star, ShoppingCart, DollarSign,
  AlertCircle, Loader2, Package, Store, MapPin, Calendar,
  TrendingUp, Users, Trash2, Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Produto {
  nome: string;
  preco: string;
  precoOriginal: string | null;
  desconto: number | null;
  estoque: number | null;
  totalVendido: number;
  vendasPorDia: number;
  faturamentoTotal: string;
  faturamentoMensal: string;
  avaliacao: string | null;
  totalAvaliacoes: number;
  distribuicaoEstrelas: number[];
  dataCriacao: string | null;
  diasAtivo: number;
  categoria: string | null;
  imagem: string | null;
}

interface Vendedor {
  nome: string;
  localizacao: string | null;
  status: string;
  isOficial: boolean;
  isPreferido: boolean;
  taxaResposta: number | null;
  tempoResposta: number | null;
  dataIngresso: string | null;
  totalProdutos: number | null;
  totalAvaliacoes: number | null;
  seguidores: number | null;
  notaLoja: string | null;
}

interface AnalysisResult {
  sucesso: boolean;
  erro?: string;
  mensagem?: string;
  produto?: Produto;
  vendedor?: Vendedor;
}

interface HistoryItem {
  id: string;
  url: string;
  data: AnalysisResult;
  created_at: string;
}

function formatBRL(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  const r = parseFloat(String(rating)) || 0;
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-4 w-4 ${i <= Math.round(r) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`}
      />
    );
  }
  return <div className="flex gap-0.5">{stars}</div>;
}

function SellerBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Loja Oficial': 'bg-primary/10 text-primary border-primary/20',
    'Vendedor Preferido': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'Vendedor Padrão': 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status] || styles['Vendedor Padrão']}`}>
      {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

export default function AnaliseMercado() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const { data } = await supabase
      .from('shopee_analysis')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setHistory(data as unknown as HistoryItem[]);
  }

  async function handleAnalyze() {
    if (!link.trim()) return;
    if (!link.includes('shopee.com.br')) {
      setError('Cole um link válido da Shopee Brasil.');
      return;
    }
    const match = link.match(/i\.(\d+)\.(\d+)/);
    if (!match) {
      setError('Não foi possível identificar o anúncio neste link.');
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-shopee-listing', {
        body: { url: link },
      });

      if (fnError) {
        setError('Erro ao buscar dados. Verifique o link e tente novamente.');
        return;
      }

      if (!data.sucesso) {
        if (data.erro === 'BLOQUEADO') {
          setError('A Shopee bloqueou esta consulta temporariamente. Aguarde alguns minutos e tente novamente.');
        } else {
          setError(data.mensagem || 'Erro ao analisar o produto.');
        }
        return;
      }

      setResult(data);
      loadHistory();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteHistory(id: string) {
    await supabase.from('shopee_analysis').delete().eq('id', id);
    setHistory(prev => prev.filter(h => h.id !== id));
  }

  function loadFromHistory(item: HistoryItem) {
    setResult(item.data);
    setError("");
  }

  const produto = result?.produto;
  const vendedor = result?.vendedor;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Mercado</h1>
          <p className="text-sm text-muted-foreground">Inteligência completa de anúncios da Shopee — sem API key</p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <label className="text-sm font-medium text-foreground mb-2 block">Cole o link do anúncio da Shopee</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="url"
              value={link}
              onChange={(e) => { setLink(e.target.value); setError(""); }}
              placeholder="https://shopee.com.br/produto-i.123456.789..."
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !link.trim()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Analisando..." : "Analisar Anúncio"}
          </button>
        </div>
        {error && (
          <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
            error.includes('bloqueou') ? 'text-amber-700 bg-amber-500/10' : 'text-destructive bg-destructive/10'
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Skeleton Loading */}
      {loading && (
        <div className="space-y-4">
          <SkeletonCard />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-6 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Results */}
      {produto && !loading && (
        <div className="space-y-4">
          {/* 📦 Card Produto */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Dados do Anúncio</h2>
            </div>
            <div className="flex gap-5">
              {produto.imagem && (
                <img
                  src={produto.imagem}
                  alt={produto.nome}
                  className="w-[100px] h-[100px] rounded-lg object-cover border border-border shrink-0"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground leading-snug mb-2 line-clamp-2">{produto.nome}</p>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-xl font-bold text-emerald-600">{formatBRL(produto.preco)}</span>
                  {produto.precoOriginal && (
                    <span className="text-sm text-muted-foreground line-through">{formatBRL(produto.precoOriginal)}</span>
                  )}
                  {produto.desconto && produto.desconto > 0 && (
                    <span className="text-xs font-semibold text-destructive-foreground bg-destructive px-2 py-0.5 rounded">
                      -{produto.desconto}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {produto.categoria && (
                    <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                      {produto.categoria}
                    </span>
                  )}
                  {produto.dataCriacao && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Criado em {produto.dataCriacao}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 📊 Card Performance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <ShoppingCart className="h-4 w-4 text-muted-foreground mb-1.5" />
              <p className="text-xs text-muted-foreground">Total Vendido</p>
              <p className="text-lg font-bold text-foreground">{produto.totalVendido.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground mb-1.5" />
              <p className="text-xs text-muted-foreground">Vendas/Dia</p>
              <p className="text-lg font-bold text-foreground">{produto.vendasPorDia}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <DollarSign className="h-4 w-4 text-muted-foreground mb-1.5" />
              <p className="text-xs text-muted-foreground">Faturamento Total</p>
              <p className="text-lg font-bold text-foreground">{formatBRL(produto.faturamentoTotal)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <Calendar className="h-4 w-4 text-muted-foreground mb-1.5" />
              <p className="text-xs text-muted-foreground">Faturamento Mensal</p>
              <p className="text-lg font-bold text-foreground">{formatBRL(produto.faturamentoMensal)}</p>
            </div>
          </div>

          {/* 🏪 Card Vendedor */}
          {vendedor && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Store className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Vendedor</h2>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <p className="font-medium text-foreground text-lg">{vendedor.nome}</p>
                <SellerBadge status={vendedor.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {vendedor.localizacao && (
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Localização</p>
                    <p className="font-medium text-foreground">{vendedor.localizacao}</p>
                  </div>
                )}
                {vendedor.dataIngresso && (
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Ingresso</p>
                    <p className="font-medium text-foreground">{vendedor.dataIngresso}</p>
                  </div>
                )}
                {vendedor.totalProdutos != null && (
                  <div>
                    <p className="text-muted-foreground">Produtos</p>
                    <p className="font-medium text-foreground">{vendedor.totalProdutos.toLocaleString('pt-BR')}</p>
                  </div>
                )}
                {vendedor.taxaResposta != null && (
                  <div>
                    <p className="text-muted-foreground">Taxa de Resposta</p>
                    <p className="font-medium text-foreground">{Math.round(vendedor.taxaResposta * 100)}%</p>
                  </div>
                )}
                {vendedor.tempoResposta != null && (
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tempo Resposta</p>
                    <p className="font-medium text-foreground">
                      {vendedor.tempoResposta > 3600
                        ? `${Math.round(vendedor.tempoResposta / 3600)}h`
                        : `${Math.round(vendedor.tempoResposta / 60)}min`}
                    </p>
                  </div>
                )}
                {vendedor.seguidores != null && (
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Seguidores</p>
                    <p className="font-medium text-foreground">{vendedor.seguidores.toLocaleString('pt-BR')}</p>
                  </div>
                )}
                {vendedor.notaLoja && (
                  <div>
                    <p className="text-muted-foreground">Nota da Loja</p>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {vendedor.notaLoja}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ⭐ Card Avaliações */}
          {produto.avaliacao && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Avaliações</h2>
              </div>
              <div className="flex gap-8 items-start">
                <div className="text-center shrink-0">
                  <p className="text-4xl font-bold text-foreground">{produto.avaliacao}</p>
                  <StarRating rating={parseFloat(produto.avaliacao)} />
                  <p className="text-xs text-muted-foreground mt-1">{produto.totalAvaliacoes.toLocaleString('pt-BR')} avaliações</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((star, idx) => {
                    const count = produto.distribuicaoEstrelas?.[idx] || 0;
                    const pct = produto.totalAvaliacoes > 0 ? (count / produto.totalAvaliacoes) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-8 text-right">{star}★</span>
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-muted-foreground text-xs w-16 text-right">
                          {pct.toFixed(0)}% ({count.toLocaleString('pt-BR')})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && !loading && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Últimas Análises</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {history.map((item) => {
              const p = item.data?.produto;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => loadFromHistory(item)}
                >
                  {p?.imagem && (
                    <img src={p.imagem} alt="" className="w-10 h-10 rounded object-cover border border-border shrink-0" loading="lazy" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p?.nome || 'Produto'}</p>
                    <p className="text-xs text-muted-foreground">
                      {p?.preco ? formatBRL(p.preco) : ''} • {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteHistory(item.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
