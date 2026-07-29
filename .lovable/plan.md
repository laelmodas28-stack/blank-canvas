# Central de Inteligência Financeira Marketplace

Novo módulo completo de fechamento financeiro + BI + IA estratégica para vendedores Shopee/Mercado Livre. Vai funcionar como um "CFO Digital" — responde quanto vendeu, quanto realmente ganhou, onde perde dinheiro e o que fazer para crescer.

Interface 100% PT-BR, código em inglês, sem emojis, padrão SaaS branco atual do app.

## Escopo desta entrega (Fase 1 — módulo funcional ponta-a-ponta)

Como o pedido é muito grande (14 seções), entrego uma versão completa e usável de todas as áreas, deixando ganchos para expansão. Não vou criar 14 telas separadas — vou criar 1 módulo com sub-abas navegáveis, reaproveitando o padrão da Central de Estratégia.

### Nova rota `/financeiro` com sub-abas

1. **Visão Geral** — cards de faturamento bruto, receita líquida, lucro líquido, margem média, ticket médio, pedidos, ROAS médio, CMV, investimento Ads. Filtros: Diário / Semanal / Quinzenal / Mensal / Personalizado. Gráficos comparativos (período atual vs anterior).
2. **Vendas** — lançamento manual e importação de relatórios (CSV/XLSX). Cada venda calcula automaticamente: bruto, taxas, comissão, ads, frete, desconto, imposto, receita líquida, % descontado, lucro líquido.
3. **Produtos & Custos** — cadastro de SKU (nome, categoria, SKU, custo fabricação, embalagem, operacional, fornecedor, preço venda, margem desejada). Sistema calcula lucro bruto, margem %, lucro líquido pós-marketplace.
4. **Taxas Shopee 2026** — tabela editável com regras atuais (faixas de preço, comissão %, tarifa fixa por item, Campanha Destaque +3,5%, Ads Fácil +1,5%). Ativar/desativar, criar novas taxas, histórico.
5. **Frete & Incentivos** — cálculo do Programa Frete Grátis com split vendedor/plataforma por faixa de preço.
6. **Ads** — lançamento de campanhas com investimento, venda gerada, pedidos, produto. Calcula ROAS, TACOS, CPA, lucro pós-Ads. Classifica campanha (saudável / reduzindo margem / prejuízo).
7. **Ranking de Produtos** — mais vendidos, maior faturamento, maior lucro, menor margem, com prejuízo. Semáforo Escalar / Ajustar / Pausar.
8. **Análise Estratégica IA** — envia dados agregados ao `strategy-advisor` e retorna recomendações executivas (crescimento, produto que carrega lucro, sugestão de preço/Ads).
9. **Alertas** — regras locais + IA: custo Ads subiu X%, margem abaixo da meta, faturamento cresceu mas lucro caiu, produto abaixo do break-even.
10. **Configurações** — meta faturamento mensal, meta lucro, margem mínima, ROAS mínimo, % máximo de Ads.

### Motor de taxas (fonte da verdade)

`src/features/finance/lib/feeEngine.ts` — implementa exatamente as regras Shopee 2026 do pedido:

```text
até R$79,99         → 20% + R$4/item
R$80 – R$99,99      → 14% + R$16/item
R$100 – R$199,99    → 14% + R$20/item
acima R$200         → 14% + R$26/item
+ Campanha Destaque (+3,5%) opcional
+ Ads Fácil (+1,5%) opcional
Frete Grátis:
  até R$79,99   → cupom até R$20, vendedor 25%
  R$80–R$199,99 → cupom até R$30, vendedor 25%
  acima R$200   → cupom até R$40, vendedor 25%
```

Toda venda usa esse motor. Configuração fica em `finance_fee_rules` (JSON editável).

### Persistência (novas tabelas)

- `finance_products` — catálogo com custo, preço, margem desejada.
- `finance_sales` — vendas (manuais e importadas) com todos os campos brutos + líquido calculado.
- `finance_ads_campaigns` — campanhas Ads com métricas.
- `finance_fee_rules` — regras de taxa versionadas (uma linha ativa por vez, histórico preservado).
- `finance_settings` — metas e limites da empresa.
- `finance_imports` — arquivos importados normalizados (tipo, linhas, resumo).

Todas com GRANTs + RLS aberto para `anon,authenticated` (padrão atual do projeto até auth existir).

### Importador universal

Reaproveita `normalizeReport.ts` existente e estende para reconhecer colunas de relatório de vendas Shopee/ML (data, pedido, produto, SKU, qtd, valor, desconto, comissão, taxas, frete, ads, valor recebido). Suporta CSV, XLSX (SheetJS já instalado) e PDF (best-effort). Após importar, faz conciliação: cada linha vira registro em `finance_sales` já com cálculo aplicado.

### Integração IA

Novo modo `financial_advisor` na edge function `strategy-advisor`: recebe agregados (faturamento, lucro, top produtos, campanhas) e devolve recomendações estruturadas (Zod `Output.object`), reaproveitando o padrão atual.

### Integração na navegação

- Nova entrada "Financeiro" na sidebar, no grupo Gestão.
- Card destacado no Dashboard.

## Estrutura de arquivos

```text
src/pages/CentralFinanceira.tsx
src/features/finance/
  components/
    FinanceOverview.tsx
    SalesManager.tsx        (lançamento manual + importação + lista)
    ProductsManager.tsx
    FeeRulesEditor.tsx
    ShippingIncentives.tsx
    AdsManager.tsx
    ProductRanking.tsx
    StrategicAnalysis.tsx
    FinanceAlerts.tsx
    FinanceSettings.tsx
  hooks/
    useFinanceSales.ts
    useFinanceProducts.ts
    useFinanceSettings.ts
  lib/
    feeEngine.ts            (Shopee 2026 fees + freight)
    salesNormalizer.ts      (CSV/XLSX de vendas → finance_sales)
    aggregations.ts         (KPIs por período, comparativos, ranking)
supabase/functions/strategy-advisor/index.ts   (adiciona modo financial_advisor)
```

## Fora desta fase (documentado)

- Multiempresa/multiusuário real (depende de auth — hoje o projeto é single-tenant sem login).
- Integração direta API oficial Shopee/ML (OAuth).
- OCR real de PDFs de settlement.
- Impostos por regime tributário (Simples/Lucro Presumido) — nesta fase entra como `%` configurável.

Posso seguir com esta Fase 1 completa? Se preferir que eu comece por um pedaço específico (ex.: só Visão Geral + Vendas + Taxas, deixando Ads/Ranking/IA depois), me diz qual e eu foco só nele.
