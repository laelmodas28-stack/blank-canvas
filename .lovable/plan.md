# Criador de Anúncio Inteligente — versão alpha

## O que será entregue
Um novo espaço de trabalho para anúncios de moda na Shopee, Mercado Livre, TikTok Shop e SHEIN, mantendo a identidade do PrecificaPro e todas as funcionalidades atuais.

### 1. Produto e fotos de referência
- Enviar uma ou mais fotos, incluindo referências reais de cada cor/variação.
- Preencher nome, tecido, composição, tamanhos, medidas, cores, modelagem, diferenciais, benefícios e informações adicionais.
- Analisar características visíveis nas fotos, apresentar sugestões para revisão e permitir correções antes de gerar o anúncio.
- Separar informações observadas, informadas e ainda não confirmadas. Não deduzir composição ou inventar detalhes técnicos.

### 2. Marketplace e texto
- Selecionar marketplace e gerar título principal, até três alternativas, palavra-chave principal, secundárias e sugestões de busca, sem prometer popularidade não comprovada.
- Criar descrição comercial com características, informações técnicas, benefícios, respostas a objeções e combinações de looks fundamentadas nas referências e nos dados fornecidos.
- Permitir edição e cópia, contar caracteres e impedir aprovação de conteúdo acima do limite configurado.
- Disponibilizar configurações atualizáveis por marketplace, com origem/data de verificação. Limites sem confirmação serão identificados como provisórios, nunca apresentados como oficiais.

### 3. Fotos comerciais
- Escolher Studio profissional ou Studio moderno e gerar 6, 7 ou 8 arquivos independentes de **1200 × 1200 pixels**, por variação.
- Organizar a sequência: principal, ângulo adicional, acabamento, caimento, look, medidas e, conforme a quantidade, estilo de vida e benefícios.
- Usar edição com referência obrigatória, preservando a roupa e sua cor real. Um ângulo traseiro exige foto traseira; sem ela, usar outro enquadramento comprovável.
- A tabela de medidas utilizará exclusivamente medidas fornecidas. Sem essas medidas, substituir a foto da tabela por outro enquadramento permitido, sem criar números.
- Mostrar progresso por imagem, preservar resultados concluídos e permitir regenerar somente a imagem escolhida.
- Permitir inspeção/ampliação e aprovação humana: fidelidade absoluta não pode ser garantida apenas pela IA.

### 4. Resultados e biblioteca
- Abas **Fotos**, **Título e SEO** e **Descrição**, com edição dos textos e controles acessíveis no celular.
- Abrir imagens, baixar individualmente em PNG/JPG e baixar todas em ZIP.
- Salvar produto, marketplace, variações, referências, imagens, textos e data de criação.
- Reabrir, editar, duplicar e excluir anúncios; duplicar reutiliza os arquivos existentes e não dispara nova geração paga.

## Integração com o sistema atual
- Adicionar **Criador de Anúncio Inteligente** ao menu principal em uma nova página, sem remover os criadores existentes.
- Preservar `/criar-anuncio?produto=&plataforma=` e o vínculo com Lucro Certo. A nova página também aceitará esses preenchimentos.
- Não alterar calculadora, taxas, indicadores, módulos financeiros ou seus dados.
- O criador atual não possui biblioteca, e o gerador atual não salva fotos; esses recursos serão implementados no novo módulo, sem tratar o comportamento antigo como já suficiente.

## Acesso, custos e condições
- Não foi encontrada uma tela de entrada nem proteção por usuário nos criadores atuais. Incluir entrada/cadastro necessários ao novo módulo, sem restringir as páginas existentes.
- Manter anúncios e fotos privados por conta. Não reutilizar as permissões públicas das antigas tabelas financeiras.
- A chave gerenciada `LOVABLE_API_KEY` está configurada. Verificar sua disponibilidade nas funções e a elegibilidade dos modelos antes de implementar chamadas reais; configuração existente não comprova saldo ou acesso a cada modelo.
- Se faltar configuração ou houver restrição de modelo/créditos, mostrar o impedimento e a ação necessária, sem substituir modelos silenciosamente nem simular geração.
- Fotos por IA consomem créditos. A geração começa somente por ação explícita; falhas ambíguas não provocarão repetição automática potencialmente cobrada.

## Detalhes técnicos
- Criar módulo isolado React/TypeScript com componentes existentes e cores semânticas; manter interface em português e código em inglês.
- Usar Supabase existente para produtos, variações, anúncios, imagens, configurações de marketplace e histórico/fila de gerações. Tabelas com permissões explícitas e RLS vinculada ao usuário; configurações privadas versionadas por conta.
- Guardar referências e resultados em bucket privado com acesso por URLs temporárias e validação de arquivo, tamanho e propriedade no servidor.
- Executar análise, texto e edição de imagens em novas Edge Functions com validação de sessão e entrada. Usar `@lovable.dev/ai-gateway`, seus modelos elegíveis e contratos gerados; não modificar modelos nem chamadas dos criadores antigos.
- Tratar cada imagem como tarefa persistida, processando uma por execução, com chave única de operação, lease exclusivo, conclusão gravada e controle de pausa em todas as entradas. Retomar somente pendências seguras; resultados de execução desconhecida exigem conferência antes de nova tentativa.
- Usar dimensões nativas de 1200 × 1200 quando suportadas, ou exportação final validada nessas dimensões. Gerar tabela de medidas a partir dos dados, não por invenção de texto na imagem.
- Registrar configurações/referências usadas em cada geração para alterações futuras não reescreverem o histórico.

## Verificação e aceite
- Testar limites configuráveis e bloqueio de aprovação, quantidade de 6/7/8 imagens, dimensões finais, referências por variação e medidas exclusivamente fornecidas.
- Testar isolamento entre contas, validação de uploads, deduplicação, pausa, retomada e regeneração individual sem repetir imagens concluídas.
- Conferir com produto real: entrar, enviar foto, revisar análise, gerar texto/fotos, baixar individualmente/ZIP, salvar e reabrir pela biblioteca.
- Conferir celular e desktop e executar os testes existentes de precificação para verificar ausência de regressões.

**Fora da alpha:** publicação automática nos marketplaces e pesquisa de volume de buscas. A entrega gera arquivos e conteúdo prontos para revisão e uso, sem alegar integração de publicação ou dados de pesquisa que não existem.