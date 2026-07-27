# Central de Estratégia Inteligente

Novo módulo que se torna o cérebro do ERP: importa relatórios de Shopee/Mercado Livre, cruza com dados já existentes no banco e gera recomendações estratégicas em Português, focadas em Lucro Líquido, Fluxo de Caixa e Crescimento.

Toda a interface em PT-BR. Código em inglês. Sem emojis. Layout SaaS limpo, fundo branco, seguindo o padrão atual do app.

## Escopo desta entrega (Fase 1 — base funcional ponta-a-ponta)

Como o pedido é muito amplo, entrego uma primeira versão completa e utilizável, deixando ganchos claros para expansão. Não vou criar 15 telas vazias — vou criar 1 módulo profundo com sub-áreas navegáveis.

### 1. Nova rota `/estrategia` com sub-abas
- **Visão Executiva** — resumo diário (IA CEO): top 5 prioridades, maior oportunidade, maior risco, alerta de caixa, alerta de anúncios, alerta de margem.
- **Análise de Anúncios** — ROAS, ACOS, TACOS, CTR, CPC, CPA, conversão, saturação, canibalização, campanhas destruindo lucro.
- **Motor de Lucro** — receita bruta/líquida, margens, lucro por SKU/pedido/marketplace/anúncio/dia/mês, custos ocultos, lucro recuperável.
- **Análise de Produto (SKU)** — lucro real, ROI, preço mínimo, preço ideal, desconto máximo, budget ideal, ROAS ideal, ranking, health, sugestão de recompra.
- **Central de Simulação** — simular +R$1, +5%, mudar budget, ligar/desligar Shopee Acelera, mudar custo, mudar imposto; retorna impacto em receita, lucro, margem, caixa, ROI, break-even.
- **Score do Negócio** — score 0–100 com explicação por dimensão (lucratividade, caixa, anúncios, estoque, etc.).
- **Previsões** — receita, lucro, ruptura de estoque, caixa futuro, sazonalidade.
- **Alertas Automáticos** — feed cronológico de alertas gerados pela IA.

### 2. Importador universal de relatórios
- Componente de upload que aceita CSV, XLSX e PDF.
- Detecção automática de tipo (Shopee wallet, settlement, ads, ML sales, ML ads, cancelamentos, reembolsos, tráfego, campanhas).
- Normalização para um schema interno único antes de enviar à IA.
- Persistência em nova tabela `strategy_imports` (arquivo + tipo detectado + JSON normalizado + created_at).

### 3. Motor de recomendações (IA)
- Edge Function `strategy-advisor` chama Lovable AI Gateway com modelo `google/gemini-3.6-flash` (rápido, econômico) e `google/gemini-3.1-pro-preview` para análise executiva profunda.
- Prompt do sistema define papel de "Consultor de Negócios sênior para Shopee/ML", em PT-BR, sempre priorizando Lucro Líquido, com formato estruturado de resposta.
- Cada recomendação retorna: `titulo`, `porque`, `impacto_financeiro_estimado`, `melhoria_estimada`, `confianca` (0–100), `risco` (baixo/médio/alto), `prioridade` (1–5), `acao_sugerida`.
- Structured output com `Output.object` + Zod, seguindo regras (sem `.min/.max` no schema; limites no prompt e clamp no código).

### 4. Persistência
Novas tabelas (com GRANTs + RLS aberto para `anon,authenticated` seguindo o padrão atual do projeto):
- `strategy_imports` — relatórios importados normalizados.
- `strategy_recommendations` — recomendações geradas pela IA.
- `strategy_simulations` — histórico de simulações.
- `strategy_alerts` — alertas automáticos.
- `strategy_scores` — histórico do Business Score.

### 5. Integração na navegação
- Nova entrada "Central de Estratégia" na sidebar (grupo Inteligência de Mercado), com sub-itens acessíveis via abas dentro da página.
- Card destacado no Dashboard.

## Detalhes técnicos

```text
src/pages/CentralEstrategia.tsx        (shell com abas)
src/features/strategy/
  components/
    ExecutiveSummary.tsx
    AdsAnalysis.tsx
    ProfitEngine.tsx
    ProductAnalysis.tsx
    SimulationCenter.tsx
    BusinessScore.tsx
    Forecasts.tsx
    AlertsFeed.tsx
    ReportImporter.tsx
    RecommendationCard.tsx
  hooks/
    useStrategyImports.ts
    useRecommendations.ts
    useSimulations.ts
  lib/
    normalizeReport.ts   (CSV/XLSX/PDF → schema interno)
    strategyClient.ts    (chama edge function)
supabase/functions/strategy-advisor/index.ts
supabase/functions/_shared/ai-gateway.ts   (helper compartilhado)
```

- CSV/XLSX via `papaparse` + `xlsx`. PDF via texto extraído (heurística; PDFs complexos ficam marcados como "revisão manual necessária" — expansão futura).
- Recomendações listadas com badges de prioridade/risco/confiança, ordenadas por impacto em Lucro Líquido.
- Simulações rodam localmente com fórmulas já existentes em `mem://logic/pricing-calculator` + `mem://logic/roas-metrics` + `mem://logic/monthly-projections`, e a IA só interpreta o resultado.

## Fora desta fase (fica documentado como próximos passos)
- Integrações diretas via API oficial Shopee/ML (autenticação OAuth).
- Rotina diária agendada (pg_cron) para gerar o briefing matinal automaticamente — nesta fase o briefing é gerado sob demanda ao abrir a Visão Executiva, com cache de 12h.
- Modo "IA CEO" conversacional em chat (esta fase entrega o briefing estruturado; o chat pode ser adicionado depois).
- OCR real de PDFs de settlement complexos.

Confirma que posso seguir com esta Fase 1? Se preferir começar por um pedaço específico (ex.: só o importador + recomendações, ou só a Visão Executiva com IA CEO), me diz qual e eu foco só nele.
