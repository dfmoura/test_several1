# Backlog — FLEXORC (instalação 43)

Fila desta fatia comercial. **Não** é lido pelo app em runtime.  
Itens do FLEXOERP completo (PED, estoque, NF, compras) ficam no backlog de `../39`.

## Como usar no Cursor

| Modo | Frase | Efeito |
|------|--------|--------|
| Registrar | `Só coloca no backlog, não altere código.` | Adiciona/atualiza um item `BL-XXX` neste arquivo |
| Executar | `Execute somente a BL-XXX. Não expandir escopo.` | Implementa só aquele item |

Prioridade: **P0** bloqueante → **P1** importante → **P2** desejável → **P3** ideia  
Status: `Backlog` · `Pronto para executar` · `Em andamento` · `Feito`

## Próximo ID

`BL-099`

---

## Itens

### BL-098 · [estoque/wms] Localização — vãos + QR endereço (F4)
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-09-05 — cadastro insumo → volume → prateleiras
- **Depende de:** BL-097 · `ADR_CADASTRO_INSUMO_VOLUME.md` F4
- **Decisão (fechada):**
  1. Gabarito 6 prateleiras × 4 colunas × 4 vãos (1,50 × 0,60 × 1,00 m).
  2. QR do vão; vínculo volume ↔ endereço; saldo oficial continua SKU (+ lote).
- **Aceite:**
  - [x] Endereços cadastráveis por EMP (`estoque_enderecos` + seed)
  - [x] Guarda/leitura por QR (etiqueta + vínculo)
- **Fora de escopo:** Slotting avançado · multi-depósito
- **Entregue em:** 2026-09-05

### BL-097 · [estoque/ux] Etiqueta / QR do volume (F3)
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-09-05 — cadastro insumo → volume
- **Depende de:** BL-096 · `ADR_CADASTRO_INSUMO_VOLUME.md` F3
- **Decisão (fechada):**
  1. Etiqueta interna: SKU, L×C real, nLote, NF, QR do volume.
  2. Página `/estoque/lotes/:id/etiqueta`.
- **Aceite:**
  - [x] Impressão/etiqueta resolve volume no sistema
- **Fora de escopo:** App leitor dedicado
- **Entregue em:** 2026-09-05

### BL-096 · [compras/estoque] Entrada multi-volume — N rastros → N lotes (F2)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-09-05 — Avery Exact 48 bobinas/item
- **Depende de:** BL-095 · `ADR_CADASTRO_INSUMO_VOLUME.md` F2 · `ADR_ENTRADA_XML_ASSIST.md` (emenda)
- **Decisão (fechada):**
  1. Cada `rastro` → um `estoque_lotes` (qtde = qLote); soma = linha OC/NF.
  2. Conferência: largura real + comprimento derivado (m²/largura) quando couber.
  3. Única espinha `receber()` / `EstoqueSaldoWriter`; humano confirma.
- **Aceite:**
  - [x] Preview + UI volumes + receber N lotes
  - [x] PHPUnit `EstoqueVolumeMultiTest`
- **Fora de escopo:** Auto-receber · Focus
- **Entregue em:** 2026-09-05

### BL-095 · [cadastro/estoque] Cadastro Camada A + de-para + virada saldo (F1)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-09-05 — melhor caminho cadastro insumos
- **Depende de:** BL-094 · `ADR_CADASTRO_INSUMO_VOLUME.md` F1 · lista 32 + XMLs `notas_entrada`
- **Decisão (fechada):**
  1. SKU = material+programa Exact; de-para cProd Avery; sem SKU por L×C.
  2. Seed Exact + hints de-para; AJU/inventário permanece operação humana.
- **Aceite:**
  - [x] MP-PAP-013…015 + MP-FLM-015 + de-para catalog
  - [ ] Contagem física na EMP (operação)
- **Fora de escopo:** Multi-rastro (BL-096)
- **Entregue em:** 2026-09-05

### BL-094 · [norma] Cadastro insumo × volume — ADR + F0 alinhamento
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-09-05 — Avery Exact / cadastro insumos
- **Depende de:** `ADR_UNIDADES_PRODUTO` · `ADR_ESTOQUE_LOTE_VALIDADE` · estudo 32 Camada A
- **Referência:** `docs/ADR_CADASTRO_INSUMO_VOLUME.md`
- **Decisão (fechada):**
  1. SKU = material; volume = bobina; localização depois.
  2. Dimensões no produto = nominais; import sem L×C = warning.
  3. Fases F1–F5 no ADR; BL-095…098.
- **Aceite:**
  - [x] ADR + emendas UNID/LOTE/ASSIST
  - [x] Regra Cursor `produto-insumo-volume.mdc`
  - [x] Import/UX alinhados; teste import atualizado
- **Entregue em:** 2026-09-05

### BL-093 · [compras/fiscal] Caixa DF-e — manifestação + sync delta
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-09-04 — implantação caixa NF-e destinadas
- **Depende de:** BL-092 · ADR_CAIXA_DFE_NFE_DESTINADAS
- **Decisão (fechada):**
  1. Buscar XML completo via consChNFe (ciência registrada no resumo; fake cobre o fluxo).
  2. Job periódico `dfe:sync-delta` (06:15) só delta NSU; sem sync no boot/login/Painel.
  3. Anos anteriores sob demanda (filtro UI + mesma fila de sync).
- **Aceite:**
  - [x] Buscar XML + comando delta (`DfeAmarrarXmlTest`)
  - [x] Agenda `dfe:sync-delta` · aceite dual `F5_DFE_CX` elegível após D+E
- **Fora de escopo:** Focus · auto-receber · entrada sem OC · XML-DSig completo de evento no AN (evolução)
- **Entregue em:** 2026-09-04

### BL-092 · [compras/ux] Caixa DF-e — amarrar à OC (assist)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-04 — implantação caixa NF-e destinadas
- **Depende de:** BL-091 · ADR_CAIXA_DFE_NFE_DESTINADAS · ADR_ENTRADA_XML_ASSIST
- **Decisão (fechada):**
  1. Ação “Amarrar / usar nesta OC” só em OC ABERTA/PARCIAL da EMP.
  2. Injeta no **assist XML existente** (`preview-dfe` → mesmo preview/`receber()`).
  3. Documentos não amarrados permanecem na caixa; `RECEBIDA` ao confirmar entrada com a chave.
- **Aceite:**
  - [x] Amarrar → preview/de-para na OC (`DfeAmarrarXmlTest`)
  - [x] Sem segundo writer de saldo; sem entrada sem OC
- **Fora de escopo:** Auto-receber · Focus · NEC/COT
- **Entregue em:** 2026-09-04

### BL-091 · [compras/fiscal] Caixa DF-e — sync NFeDistribuicaoDFe (leve)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-04 — implantação caixa NF-e destinadas
- **Depende de:** BL-090 · ADR_CAIXA_DFE_NFE_DESTINADAS · ADR_CERTIFICADO_A1_EMPRESA
- **Decisão (fechada):**
  1. Adaptador DF-e AN com A1 do cofre (memória/temp 0600); **sem Focus**.
  2. Job/fila por EMP; lotes + delay; UI “Atualizar do fisco” só enfileira.
  3. 1ª hidratação progressiva; lista nunca espera SEFAZ.
  4. Só `ERP_STAGE` homolog/production + A1 apto; `DFE_DRIVER=fake` para testes.
- **Aceite:**
  - [x] Sync enfileirado preenche a caixa sem travar API (`DfeSyncTest`)
  - [x] Local sem stage/A1: mensagem clara; upload manual intacto
- **Fora de escopo:** Manifestação completa · amarrar OC · Focus
- **Entregue em:** 2026-09-04

### BL-090 · [compras/ux] Caixa DF-e — modelo + UI estacionária + gate
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-04 — implantação caixa NF-e destinadas
- **Depende de:** BL-089 · ADR_CAIXA_DFE_NFE_DESTINADAS · F5_COMPRAS · F5_NFE_ENT · F0_A1
- **Decisão (fechada):**
  1. Modelo local (NSU/cursor, chave, resumo, vínculo OC opcional, XML privado).
  2. Menu Compras → NF-e destinadas; `F5_DFE_CX` no catálogo (onda 5); permissão `compras.ler` (padrão Compras).
  3. UI lê só banco; vazia/parcial com honestidade; sem consulta SEFAZ no GET.
- **Aceite:**
  - [x] `F5_DFE_CX` no `ImplantacaoCatalogo` + menu
  - [x] API/UI listagem local + isolamento `empresa_id`
  - [x] PHPUnit `DfeCaixaTest`
- **Fora de escopo:** Cliente DF-e · job sync · amarrar · Focus
- **Entregue em:** 2026-09-04

### BL-089 · [norma] Caixa DF-e — ADR + mapa + backlog fatiado
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-09-04 — NF-e destinadas via A1, sem Focus; área estacionária; sync leve
- **Depende de:** ADR_ENTRADA_XML_ASSIST · ADR_CERTIFICADO_A1_EMPRESA · ADR_COMPRAS_ATE_ESTOQUE
- **Referência:** `docs/ADR_CAIXA_DFE_NFE_DESTINADAS.md` · `MAPA_FLUXO_POS_ORC.md`
- **Decisão (fechada):**
  1. Caixa estacionária DF-e (AN) + A1 cofre; sem Focus; amarrar OC opcional.
  2. Sync assíncrono NSU; 1ª carga ano atual progressiva; UI nunca espera fisco.
  3. Implantação: `F5_DFE_CX` após F0_A1 + F5_COMPRAS + F5_NFE_ENT; fatias B→E = BL-090…093.
  4. Espinha OC/assist/`receber()` e emissão Focus **intocadas**.
- **Aceite:**
  - [x] ADR aceita
  - [x] Emendas A1 / assist / espelho / compras / mapa
  - [x] Backlog BL-090…093 registrados
- **Fora de escopo:** Código de runtime · menu · cliente SEFAZ
- **Entregue em:** 2026-09-04

### BL-088 · [produto/estoque/ux] Produtos no menu + continuidade NF-e entrada
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-09-02 — produtos/estoque/NF entrada como eixo preponderante
- **Depende de:** BL-085 · ADR_COMPRAS_ATE_ESTOQUE · ADR_ENTRADA_XML_ASSIST · MAPA_FLUXO_POS_ORC
- **Referência:** `F5_PRODUTOS` · `flexorc-superficie.mdc` · `EstoquePage` · `ProdutosPage`
- **Decisão (fechada):**
  1. Promover **Produtos** ao menu Cadastros (`produto.ler`); gate implantação `F5_PRODUTOS`.
  2. NF-e de entrada continua na **OC** (XML assist); Estoque ganha card de continuidade + CTA.
  3. Ajuste A03 = virada/legado na copy de AJU; sem novo escritor de saldo.
  4. Anti-explosão PA mantida (família + spec); preço comercial ORC intacto.
- **Aceite:**
  - [x] Menu Produtos + catalog F5_PRODUTOS
  - [x] Continuidade Estoque/Produtos/NF via OC
  - [x] Norma superfície + mapa + fatia emendada
  - [x] PHPUnit implantação
- **Fora de escopo:** Download Focus/SEFAZ · entrada sem OC · NEC/COT no menu · hub rastreio
- **Entregue em:** 2026-09-02

### BL-087 · [op/ux] Passos da OP — separação, retorno/perda e continuidade PED
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-02 — onda seguinte ao BL-086 (soft-polish OP)
- **Depende de:** BL-086 · ADR_PRODUCAO_PED_OP_ESTOQUE
- **Referência:** `docs/MAPA_FLUXO_POS_ORC.md` · `OrdemProducaoDetailPage`
- **Decisão (fechada):**
  1. Motor OP intacto; UX com faixa de passos + copy retorno vs perda + consumo.
  2. Concluir só com ao menos uma saída requisitada (guarda de chão).
  3. Após `CONCLUIDA`: resultado + CTA pedido/estoque.
  4. Sem reabrir `/produtos`; sem empenho pesado.
- **Aceite:**
  - [x] Passos + conclusão/resultado na OP
  - [x] Mapa atualizado
  - [x] Regressão PHPUnit produção
- **Fora de escopo:** Empenho reservado · menu Produtos · OS polish profundo
- **Entregue em:** 2026-09-02

### BL-086 · [orc/ped/ux] Continuidade pós-ORC — sinal PED + andamento + mapa
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-02 — fluxo após aprovação/sinal sem reescrever motor
- **Depende de:** BL-081 · BL-083 · ADR_PRODUCAO_PED_OP_ESTOQUE · ADR_ORC_ADIANTAMENTO_PIX
- **Referência:** `docs/MAPA_FLUXO_POS_ORC.md` · estudo `../32` timeline PED
- **Decisão (fechada):**
  1. Motor PED/OP/estoque intacto; gap = UX de continuidade.
  2. Show ORC expõe `pedido {id,codigo,status}`; CTA Ver pedido quando `LIBERADO`.
  3. PED detalhe: bloco Andamento operacional com códigos (ORC→OP/OS→FAT/ENT).
  4. `/produtos` permanece fora do menu (gate implantação).
- **Aceite:**
  - [x] Mapa canônico em docs
  - [x] API + CTA ORC + timeline PED
  - [x] PHPUnit show ORC com pedido
- **Fora de escopo:** Empenho pesado · menu Produtos · PCP OEE · multi-item PED
- **Entregue em:** 2026-09-02

### BL-085 · [produto/menu] Onda 5 (Caixa) — carteira + compras + estoque no menu + Painel
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-24 — sequência ondas pós saída (BL-084); fechar superfície ERP operacional
- **Depende de:** BL-084 · ADR_CARTEIRA_FINANCEIRA · ADR_COMPRAS_ATE_ESTOQUE · ADR_NATUREZAS_GERENCIAIS
- **Referência:** `ImplantacaoCatalogo` onda 5 · `flexorc-superficie.mdc`
- **Decisão (fechada):**
  1. Promover **Contas a pagar/receber**, **Compras** (OC · a repor), **Estoque**, **Naturezas gerenciais**; rastreio/produtos/comissão/fluxo fora.
  2. Rotas F5_* com tela canônica; F5_BANCO/F5_FLUXO sem rota (paralelo futuro).
  3. Painel: `modulos.compras|estoque` + card pagar + filas OC/reposição/ajustes/vencidos.
- **Aceite:**
  - [x] Menu AppShell · matriz implantação
  - [x] PainelService + regra superfície
  - [ ] Aceite onda 5 na EMP piloto (operacional)
  - [x] PHPUnit Painel + implantação
- **Fora de escopo:** Rastreio · produtos SKU · comissão · fluxo de caixa · rename billing FLEXORC-*
- **Entregue em:** 2026-08-24

### BL-084 · [produto/menu] Onda 4 (Saída) — Faturamento + Expedição no menu + Painel
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-24 — sequência ondas pós OP (BL-083)
- **Depende de:** BL-083 · ADR_IMPLANTACAO_ACEITE · ADR_FATURAMENTO_COBRANCA · ADR_ENTREGA_EXPEDICAO
- **Referência:** `ImplantacaoCatalogo` onda 4 · `flexorc-superficie.mdc`
- **Decisão (fechada):**
  1. Promover **Faturamentos** (Financeiro) e **Expedição** ao menu; estoque/compras/rastreio/NF avulso fora.
  2. `F4_FATURAR.rota = /financeiro/faturamentos` · `F4_EXPEDIR.rota = /expedicao`.
  3. Painel: `modulos.expedicao` + cards/filas faturamento (ped produzido) e expedição (ped faturado + ENT vigente).
- **Aceite:**
  - [x] Menu AppShell · matriz implantação
  - [x] PainelService + regra superfície
  - [ ] Aceite onda 4 na EMP piloto (operacional)
  - [x] PHPUnit Painel + implantação
- **Fora de escopo:** Estoque · compras · rastreio · comissão · contas a pagar · rename billing FLEXORC-*
- **Entregue em:** 2026-08-24

### BL-083 · [produto/menu] Onda 3 (OP) no menu + Painel produção
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-24 — implantação completa; sequência ondas
- **Depende de:** BL-081 · ADR_IMPLANTACAO_ACEITE · ADR_PRODUCAO_PED_OP_ESTOQUE
- **Referência:** `ImplantacaoCatalogo` onda 3 · `flexorc-superficie.mdc`
- **Decisão (fechada):**
  1. Promover **Ordens de produção** ao menu (grupo Produção); rastreio/expedição/NF fora.
  2. `F3_OP_OS.rota = /ordens-producao`.
  3. Painel: `modulos.producao` + card/fila OP em curso.
- **Aceite:**
  - [x] Menu AppShell · matriz implantação
  - [x] PainelService + regra superfície
  - [ ] Aceite onda 3 na EMP piloto (operacional)
  - [x] PHPUnit Painel + implantação
- **Fora de escopo:** Rastreio no menu · estoque · faturamento · expedição
- **Entregue em:** 2026-08-24

### BL-081 · [produto/menu] Onda 2 (Pedido) no menu + gate rebrand FLEXOERP
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-24 — implantação sempre completa; marca única FLEXOERP
- **Depende de:** BL-080 · ADR_IMPLANTACAO_ACEITE · ADR_PRODUCAO_PED_OP_ESTOQUE
- **Referência:** `docs/ADR_TRANSICAO_FLEXORC_FLEXOERP.md` § Gate fase 1
- **Decisão (fechada):**
  1. Promover PED (onda 2) ao menu canônico antes de renomear FLEXORC → FLEXOERP na UI.
  2. Aceite dev × cliente na EMP piloto conforme matriz.
  3. Rebrand (`brand.ts`, assets, PDF, proposta) **no mesmo PR** que o menu honesto.
  4. Billing/webhook IDs legado `FLEXORC-*` intactos (fase 3 separada).
- **Aceite:**
  - [x] Menu AppShell com Pedido (+ dependências visíveis mínimas)
  - [ ] Matriz onda 2 aceita na EMP piloto (operacional)
  - [x] Identidade FLEXOERP (wordmark + tagline) · checklist §6 parcial
  - [x] PHPUnit verde · smoke login / proposta pública (parcial — suite billing)
- **Fora de escopo:** DNS flexoerp · rename env billing · apagar código esqueleto
- **Entregue em:** 2026-08-24 (código; aceite piloto pendente operação)

### BL-082 · [produto/infra] DNS flexoerp + alias legado + prefixos billing novos
- **Status:** Feito (código) · DNS cutover = operação
- **Prioridade:** P2
- **Origem:** ADR_TRANSICAO_FLEXORC_FLEXOERP.md fase 3
- **Depende de:** BL-081
- **Decisão (fechada):**
  1. `flexoerp.triggerti.com` em paralelo; `flexorc.*` como alias.
  2. Novos ciclos usam `FLEXOERP-CONTA-*`; legado intacto em webhooks.
  3. Alias env `FLEXOERP_*` opcional; `FLEXORC_*` continua lido.
- **Aceite:**
  - [x] `BillingReference` + testes unitários
  - [x] Gateways ASAAS/Inter emitem FLEXOERP-* e resolvem legado
  - [x] `erp.php` alias env · `.env.example` · `DEPLOY_LOCAL_AWS.md`
  - [ ] DNS/Tunnel flexoerp (ops)
- **Entregue em:** 2026-08-24

### BL-080 · [produto/identidade] Norma de transição FLEXORC → FLEXOERP
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-24 — unificar produto sem quebrar runtime
- **Referência:** `docs/ADR_TRANSICAO_FLEXORC_FLEXOERP.md`
- **Decisão (fechada):**
  1. Destino = FLEXOERP; sequência superfície → marca → infra.
  2. Fase 0: ADR + backlog; **zero** alteração de `brand.ts`, billing ou menu.
  3. Gate fase 1 documentado; BL-081 executa o rebrand.
- **Aceite:**
  - [x] ADR aceito
  - [x] BL-081 registrado com dependências
- **Entregue em:** 2026-08-24

### BL-079 · [implantacao] Matriz de aceite de go-live
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-24 — tela de implantação com validação dev × cliente
- **Depende de:** ADR_ATIVACAO_EMPRESA · ADR_FATIA_COMERCIAL_SAAS
- **Referência:** `docs/ADR_IMPLANTACAO_ACEITE.md`
- **Decisão (fechada):**
  1. Catálogo versionado (`ImplantacaoCatalogo`) + aceite dual por EMP.
  2. UI `/implantacao` (Administração); não funde com `/ativacao`.
  3. Superfície `flexorc` vs `erp` honesta; evidência automática opcional.
  4. Permissões `implantacao.ler|validar_dev|validar_cliente`.
- **Aceite:**
  - [x] ADR + migration + API GET/PATCH
  - [x] Tela com ondas, filtros, dual aceite
  - [x] Testes Feature (isolamento multi-EMP)
- **Entregue em:** 2026-08-24

### BL-078 · [orc/ux] E-mail da proposta (EMP + cadastro do cliente)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-21 — e-mail padrão da EMP; destino = cadastro; sem SMTP self-service
- **Depende de:** ADR_ORC_LINK_APROVACAO
- **Referência:** `docs/ADR_ORC_EMAIL_PROPOSTA.md`
- **Decisão (fechada):**
  1. Motor na instalação (`MAIL_*`); flag `ORCAMENTO_EMAIL_AUTO`.
  2. Reply-To = `empresas.email` (aba Contato); From = `MAIL_FROM_*`.
  3. Destino = e-mail do contato autorizado / legado; dispara em `enviarParaAprovacao` (fail-soft).
  4. Clipboard + WhatsApp intactos; sem SMTP por EMP; andamentos ficam para BL futuro.
- **Aceite:**
  - [x] Envio com e-mail no contato → `email_enviado` + Mail
  - [x] Sem e-mail no cadastro → link/clipboard seguem; `email_motivo=sem_email_cadastro`
  - [x] UX EMP + painel pós-envio
  - [x] Testes Feature + ADR
- **Entregue em:** 2026-08-21

### BL-077 · [plataforma/billing] Cenário pós-cortesia no cadastro atual
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-21 — ver mensalidade de fato com o cadastro atual, cortesia acabou
- **Depende de:** BL-075 · BL-076 · ADR_ATIVACAO_EMPRESA
- **Referência:** `docs/ADR_ATIVACAO_EMPRESA.md` · `docs/ADR_CONSOLE_PLATAFORMA.md`
- **Decisão (fechada):**
  1. Encerrar cortesia ≠ revogar: `cortesia_ate` no passado, histórico permanece; login cai em `/conta/mensalidade`.
  2. Lab: `plataforma:abrir-cobranca-pos-cortesia` / `make cenario-mensalidade-pos-cortesia` reabre cobrança demo sem apagar EMP/PAR/ORC.
  3. UX `cortesia_encerrada`: banner + fatura + checkout `nextDueDate` hoje. Duas camadas intactas.
- **Aceite:**
  - [x] Aviso `cortesia_encerrada` no login/`/auth/me`; modo na fatura
  - [x] Comando não apaga empresas; recoloca PENDENTE se o pagamento era demo
  - [x] Console: Encerrar cortesia (histórico) distinto de Revogar registro
- **Entregue em:** 2026-08-21

### BL-076 · [plataforma/ops] Ensaio ASAAS ≈ produção (flexorc + webhook)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-21 — simular produção local com https://flexorc.triggerti.com
- **Depende de:** BL-075 · tunnel flexorc · ADR_ATIVACAO_EMPRESA
- **Referência:** `docs/ADR_ENSAIO_ASAAS_FLEXORC.md` · `docs/DEPLOY_LOCAL_AWS.md`
- **Decisão (fechada):**
  1. Stack local + `ORCAMENTO_PUBLIC_BASE_URL=https://flexorc.triggerti.com` (tunnel → :8043).
  2. `APP_URL`/`FRONTEND_URL` ficam em localhost; webhook/retorno usam flexorc.
  3. Script `ensaio-asaas-ready` + `make ensaio-asaas{,-ativar,-desativar}`; ASAAS sandbox + token.
  4. Não injetar `ASAAS_*=` vazio no Compose (não apaga chave de `apps/api/.env`).
- **Aceite:**
  - [x] ADR + deploy (porta 8043) + README
  - [x] `make ensaio-asaas` valida health local/público e imprime URL do webhook
  - [x] ativar/desativar só muda ORCAMENTO (+ token se faltar)
- **Entregue em:** 2026-08-21

### BL-075 · [plataforma/billing] Mensalidade antecipada + fim de cortesia (produção)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-21 — cobranças sempre antecipadas; cortesia → ASAAS recorrente
- **Depende de:** BL-069 · BL-071 · BL-073 · ADR_ATIVACAO_EMPRESA
- **Referência:** `docs/ADR_ATIVACAO_EMPRESA.md`
- **Decisão (fechada):**
  1. Cobrança **sempre antecipada** (ciclo pago antes de usar). Checkout ASAAS `nextDueDate` = fim da cortesia vigente, senão hoje.
  2. Aviso UI ≤7 dias (`alerta_cortesia`) + banner no AppShell; comando ops diário `plataforma:avisar-cortesia-billing`.
  3. Webhook ASAAS: confirmação → `ATIVA`; atraso/cancelamento → `SUSPENSA` (bloqueia envio).
  4. Sem Inter no billing da conta; duas camadas intactas (mensalidade ≠ sinal).
- **Aceite:**
  - [x] Fatura expõe `cobranca_antecipada`, `primeira_cobranca_em`, `alerta_cortesia`
  - [x] Cortesia acabando sem meio → banner + CTA autenticar
  - [x] `PAYMENT_OVERDUE` / cancelamento → `SUSPENSA`; novo `PAYMENT_RECEIVED` → `ATIVA`
  - [x] Testes feature + ADR atualizado
- **Entregue em:** 2026-08-21

### BL-074 · [auth/ux] Sessão única, teto 5 simultâneos, idle 30 min
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-21 — mesmo usuário não loga em dois lugares; máx. 5 pessoas; 30 min sem uso
- **Depende de:** Sanctum PAT já usado no login · referência UX `../23`
- **Referência:** `docs/ADR_SESSAO_ACESSO.md`
- **Decisão (fechada):**
  1. PAT Sanctum é a sessão viva (sem tabela paralela). Uma por usuário; 409 + takeover autenticado.
  2. Teto 5 usuários distintos na instalação; operador `PLATAFORMA` não consome assento.
  3. Idle 30 min via `last_used_at` no callback Sanctum (antes de renovar). Admin libera sessão em Usuários.
- **Aceite:**
  - [x] Segundo login 409; `encerrar_sessao_anterior` derruba a órfã
  - [x] 6º usuário distinto 409; vaga libera no logout/idle
  - [x] 31 min sem uso → 401 `SESSAO_INATIVA`; UI takeover + Liberar sessão
- **Entregue em:** 2026-08-21

### BL-073 · [plataforma] Provisionar master + cortesia (bonificação)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-20 — setup admin geral: gerar master e período free visível na mensalidade
- **Depende de:** BL-070 · ADR_CONSOLE_PLATAFORMA · ADR_ATIVACAO_EMPRESA
- **Decisão (fechada):**
  1. Escrita no console: `POST /plataforma/contas` + `POST …/cortesia`; permissões `provisionar` / `bonificar`.
  2. Cortesia em `conta_ativacoes.cortesia_ate` — **não** finge ASAAS; `acessoLiberado()` = pago **ou** cortesia; MRR só contas autenticadas.
  3. UI cliente `/conta/mensalidade`: bloco “Período cortesia TRIGGER” (dias restantes + Free + tabela após).
  4. CLI: `--cortesia-dias` em `plataforma:criar-conta` + `plataforma:bonificar-conta`.
- **Aceite:**
  - [x] Operador cria master e bonifica; admin da conta 403
  - [x] Cortesia libera ativação; ASAAS permanece autenticável
  - [x] Indicativo claro na fatura do cliente
- **Entregue em:** 2026-08-20

### BL-072 · [plataforma/ux] Envio da proposta só com A1 válido da EMP
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-20 — usar o sistema depois do A1 da empresa cadastrada; funil de produção (cadastro → pagamento → EMP → A1 → ORC)
- **Depende de:** BL-068 · ADR_ATIVACAO_EMPRESA · ADR_CERTIFICADO_A1_EMPRESA
- **Decisão (fechada):**
  1. Portão no mesmo ponto do billing: `pode_enviar_orcamento` = conta paga **e** A1 apto da EMP (vigente + CNPJ idêntico). Rascunho livre.
  2. Produção recusa upload com CNPJ divergente; local/homolog/teste avisam. Checagem de apto é sempre na hora do envio.
  3. Cockpit: passo obrigatório `certificado_a1` → `/empresas?tab=a1`. Banner A1 depois da mensalidade. Legado intacto.
- **Aceite:**
  - [x] Self-service sem A1 não envia (422 `certificado_a1`); com A1 apto envia
  - [x] CNPJ divergente e vencido não são aptos; produção recusa divergente no upload
  - [x] Legado / phpunit / isolamento `empresa_id` intactos
- **Entregue em:** 2026-08-20

### BL-071 · [plataforma/ux] Status da mensalidade no app (ciclo + meios)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-20 — pagador sem tela de status / dias até a próxima / formas de pagar
- **Depende de:** BL-069 · ADR_ATIVACAO_EMPRESA
- **Decisão (fechada):**
  1. Tela canônica `/conta/mensalidade` no AppShell (Administração), reutiliza fatura `GET /ativacao.conta`.
  2. DTO ganha `proxima_cobranca_em`, `dias_ate_proxima`, `renovacao_label` (âncora `billing_metodo_em` + ciclo config — sem polling ASAAS).
  3. Duas camadas intactas: mensalidade ≠ sinal. Alta `/cadastro/pagamento` permanece; retorno ASAAS → `/conta/mensalidade`.
- **Aceite:**
  - [x] Menu Mensalidade + status Em dia / dias / meios
  - [x] Banner e cockpit apontam para a tela
  - [x] Teste ciclo após confirmar-demo
- **Entregue em:** 2026-08-20

### BL-070 · [plataforma] Console TRIGGER — contas e billing (leitura)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-19 — ver quem está no sistema e pagando, sem acesso do cliente
- **Depende de:** ADR_ATIVACAO_EMPRESA · ADR_FATIA_COMERCIAL_SAAS
- **Referência:** `docs/ADR_CONSOLE_PLATAFORMA.md`
- **Decisão (fechada):**
  1. Papel `PLATAFORMA` + `plataforma.*`; nunca no catálogo/onboarding; CLI `plataforma:criar-operador`.
  2. API `/api/v1/plataforma/*` sem `SetEmpresaContext`; `ADMIN` do cliente → 403.
  3. UX `/plataforma` fora do AppShell FLEXORC; unidade = conta (`conta_ativacoes`).
  4. Fase 1 read-only (métricas, contas, EMP, usuários, auditoria). Sem impersonação.
- **Aceite:**
  - [x] phpunit `ConsolePlataformaTest` (suite pronta; rodar com Docker/`phpunit` no ambiente)
  - [x] Menu FLEXORC sem o console
  - [x] Operador CLI vê contas; pagador não
- **Entregue em:** 2026-08-19

### BL-068 · [plataforma/ux] Ativação profissional (você → empresa → ASAAS → cadastros → ORC)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-19 — sistema pronto para usar ainda parecia setup; ramificação de cliente novo; ASAAS autentica o meio; empresa nova começa do zero
- **Depende de:** ADR_FATIA_COMERCIAL_SAAS · ADR_ORC_ADIANTAMENTO_PIX
- **Referência:** `docs/ADR_ATIVACAO_EMPRESA.md`
- **Decisão (fechada):**
  1. Alta: você + CNPJ. Pagamento da conta FLEXORC no ASAAS (PCI no provedor; mock no local).
  2. Operação: PIX CFIN, conferir catálogo modelo, primeiro cliente, primeiro ORC.
  3. EMP sem `empresa_ativacoes` = legado (seed/teste) — envio livre.
  4. Enviar proposta exige pagamento só no self-service. Motor ORC intacto. BANK_PROVIDER asaas no mesmo contrato.
- **Aceite:**
  - [x] Cadastro em etapas; empresa nova sem clientes/ORC
  - [x] Demo/webhook autenticam billing; PIX do sinal separado
  - [x] Cockpit de primeiros passos; empty states; sem jargão estoque/venda no painel
  - [x] Painel = cockpit de ação (ADR_PAINEL_COCKPIT): filas → KPIs; sem mural
  - [x] Testes EmpresaAtivacaoTest + onboarding isolado
- **Entregue em:** 2026-08-19

### BL-069 · [plataforma/ux] Mensalidade FLEXORC visível (fatura + ASAAS)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-19 — cliente novo não via como paga a plataforma
- **Depende de:** BL-068 · ADR_ATIVACAO_EMPRESA
- **Decisão (fechada):**
  1. Tela 3 da alta é fatura: pagador (EMP), recebedor (TRIGGER), valor, ciclo, meios (cartão/PIX no ASAAS).
  2. Duas camadas explícitas: mensalidade ≠ sinal do ORC.
  3. Checkout ASAAS `RECURRENT` MONTHLY; local mock confirma a mesma fatura.
  4. Banner no app se pendente. `plataforma:repor-demo` limpa EMP/contas fora do seed.
- **Aceite:**
  - [x] GET /ativacao.conta com produto/pagador/valor
  - [x] UI fatura + redirect ASAAS
  - [x] Teste fatura + repor-demo
- **Entregue em:** 2026-08-19
