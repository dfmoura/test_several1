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

`BL-115`

---

## Itens

### BL-114 · [expedicao/ux] Kit de saída (embalagem + NF + cobrança)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-23 — cobrança e embalagem PA entregues juntos na expedição
- **Depende de:** BL-113 · `ADR_ENTREGA_EXPEDICAO.md` · `ADR_FATURAMENTO_COBRANCA.md`
- **Decisão (fechada):**
  1. Superfície no ENT/preview — sem documento novo, sem menu novo.
  2. CTAs: romaneio, DANFE/prévia, ficha de cobrança por TIT, etiquetas BOB/CX.
  3. `expedicao.ler` lê um FAT e as etiquetas para imprimir; não lista FAT nem baixa TIT.
  4. QR de PIX só na cobrança.
- **Aceite:**
  - [x] Bloco **Documentos da saída** no romaneio e no painel do PED
  - [x] Preview/detalhe ENT expõem `nfe` + `titulos_abertos` + `embalagem`
  - [x] PHPUnit `test_kit_saida_expoe_nfe_e_titulos_sem_baixar`
- **Fora de escopo:** auto-baixa · WhatsApp · QR na DANFE/BOB · TMS
- **Norma:** `docs/ADR_ENTREGA_EXPEDICAO.md`
- **Teste local:** Expedição → PED/ENT → Imprimir nota / cobrança / etiquetas. Ctrl+Shift+R.

### BL-113 · [financeiro/ux] Ficha de cobrança ao lado da NF-e
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-23 — ver documento de cobrança com QR e saldo
- **Depende de:** `ADR_FATURAMENTO_COBRANCA.md`
- **Decisão (fechada):**
  1. Ficha A4 irmã da DANFE — não misturar PIX na nota.
  2. Um documento por TIT; saldo ao vivo.
  3. QR só de `pix_copia_cola` / linha digitável da COB vigente.
  4. CTA ao lado de “Imprimir nota” e na grade de títulos.
- **Aceite:**
  - [x] Rota `/financeiro/faturamentos/:id/cobranca/:tituloId/ficha`
  - [x] FAT detalhe expõe `titulos[].saldo` + `observacao` + PIX
- **Fora de escopo:** WhatsApp/e-mail oficial · QR inventado · menu novo
- **Teste local:** Faturar PED → Imprimir cobrança. Ctrl+Shift+R.

### BL-112 · [fiscal/ux] NF-e só com PA; DANFE A4 com quebra
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-23 — NF-e do acabado, sem clichê; DANFE A4
- **Depende de:** `ADR_FATURAMENTO_COBRANCA.md` · `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md`
- **Decisão (fechada):**
  1. FAT comercial intacto (matriz/faca/arte nas linhas).
  2. `ItensFiscaisNfe` filtra setup e incorpora no unitário do PA.
  3. infAdic: “Valor inclui matriz/clichê e ferramental do job”.
  4. DANFE: A4 sem clip, thead que repete, linha não parte, dados adicionais inteiros.
- **Aceite:**
  - [x] XML/prévia sem “Matriz / clichê”
  - [x] vNF = bruto do FAT
  - [x] PHPUnit `ItensFiscaisNfeTest` + `test_nfe_incorpora_matriz_no_pa_e_nao_lista_cliche`
- **Fora de escopo:** Dompdf · paginador JS · NFS-e
- **Teste local:** Faturar PED com matriz → prévia DANFE: 1 item PA. Ctrl+Shift+R.

### BL-111 · [producao/ux] Apontamento e conclusão só no chão
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-23 — tela para a produção apontar e concluir a OP
- **Depende de:** BL-110 · `ADR_PRODUCAO_APONTAMENTO.md`
- **Decisão (fechada):**
  1. OP sem formulário de conclusão; CTA *Abrir apontamento na produção*.
  2. Produção → **Apontamentos**: fila (a receber / a concluir) + ficha.
  3. Mesmo `POST …/concluir`. Sem `APONT-`. Handoff na ficha do chão.
  4. Painel `op_curso` → essa tela (só OP com saída).
- **Aceite:**
  - [x] `/ordens-producao/apontamentos` + `/:id`
  - [x] OP sem *Concluir OP*
  - [x] Menu Produção → Apontamentos (Retiradas restaurado)
  - [x] PHPUnit `ProducaoApontamentoChaoTest`
- **Fora de escopo:** MES · rascunho · segundo writer
- **Norma:** `docs/ADR_PRODUCAO_APONTAMENTO.md`
- **Teste local:** Produção → Apontamentos → receber → apontar → Concluir OP. Ctrl+Shift+R.

### BL-110 · [producao/estoque/ux] Confirmação física só no Estoque
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-23 — «Retirada de todas as saídas» só para o estoque
- **Depende de:** BL-109 · `ADR_PRODUCAO_COLETA_DIRIGIDA.md`
- **Decisão (fechada):**
  1. OP não confirma baixa (some *Preparar todas as retiradas* / painel / linha).
  2. CTA *Abrir ficha no estoque*; complemento e extra pedem quantidade e abrem a ficha.
  3. API `requisitar` permanece (compat). Writer único.
- **Aceite:**
  - [x] OP sem painel de confirmação
  - [x] Ficha do estoque recebe `material_id`/`produto_id`+`qtde`
- **Norma:** `docs/ADR_PRODUCAO_COLETA_DIRIGIDA.md`
- **Teste local:** OP → Abrir ficha no estoque → confirmar. Ctrl+Shift+R.

### BL-109 · [producao/estoque/ux] Ficha de confrontação da requisição (Fase D)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-23 — confrontar sistema × físico; ficha anexa à OP; avaria → de novo
- **Depende de:** BL-108 · `ADR_PRODUCAO_COLETA_DIRIGIDA.md`
- **Decisão (fechada):**
  1. Uma ficha (chão + OP): pedido × baixado × avaria × a retirar.
  2. Baixa por QR **ou** quantidade manual — mesmo `requisitar` / writer.
  3. Cada confirmação vira ciclo MOV anexado à OP. Sem documento `REQ-`.
  4. Avaria na ficha → requisitar de novo (complemento, novo ciclo).
- **Aceite:**
  - [x] `ficha_retirada` no show da OP
  - [x] Chão: QR + manual + avaria + reposição
  - [x] Anexo visível na OP
  - [x] PHPUnit `test_ficha_confronta_ciclo_avaria_e_reposicao_no_chao`
- **Fora de escopo:** empenho reservado · WMS · segundo writer
- **Norma:** `docs/ADR_PRODUCAO_COLETA_DIRIGIDA.md`
- **Teste local:** Estoque → Retiradas → ficha da OP → baixar (QR ou manual) → avaria → requisitar de novo. Ctrl+Shift+R.

### BL-108 · [producao/estoque/ux] Coleta dirigida — chão QR + handoff + Painel (Fases B–C)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-23 — concluir o fluxo requisição → estoque → produção
- **Depende de:** BL-107 · `ADR_PRODUCAO_COLETA_DIRIGIDA.md`
- **Decisão (fechada):**
  1. Estoque → **Retiradas** (nav do módulo, sem menu novo): a retirar / a entregar.
  2. Caminhada + QR `VOL:` · confirmar chama o mesmo `requisitar` (writer único).
  3. Handoff na OP (`insumos_entregues_*`); complemento zera e pede nova entrega.
  4. Painel: uma fila `op_separacao` se `count > 0`.
- **Aceite:**
  - [x] `/estoque/retiradas` + chão + QR
  - [x] Entregar na produção (OP e Estoque)
  - [x] Fila no Painel
  - [x] PHPUnit no `ProducaoColetaDirigidaTest`
- **Fora de escopo:** empenho reservado · app mobile · lote de PA
- **Norma:** `docs/ADR_PRODUCAO_COLETA_DIRIGIDA.md`
- **Teste local:** Estoque → Retiradas → OP com pendência → ler VOL: → confirmar → informar quem recebeu. Painel mostra a fila enquanto houver pendência. Ctrl+Shift+R.

### BL-107 · [producao/estoque/ux] Coleta dirigida — ver volumes antes de baixar (Fase A)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-09-23 — visibilidade da requisição OP → estoque → produção
- **Depende de:** `ADR_PRODUCAO_PED_OP_ESTOQUE` · `ADR_ESTOQUE_LOTE_VALIDADE` · `ADR_CADASTRO_INSUMO_VOLUME` F3/F4
- **Decisão (fechada):**
  1. Preview FEFO/FIFO na OP (volume, local, L×C, validade) — mesmo algoritmo do writer.
  2. Confirmar envia `volumes[]`; API sem volumes permanece FEFO (compat).
  3. Override exige motivo. Empenho continua leve. Sem menu novo / sem segundo saldo.
  4. Fases B/C = BL-108.
- **Aceite:**
  - [x] ADR `ADR_PRODUCAO_COLETA_DIRIGIDA.md`
  - [x] Preview na ficha + painel de confirmação
  - [x] Writer aceita alocação explícita
  - [x] PHPUnit `ProducaoColetaDirigidaTest`
- **Fora de escopo nesta BL:** empenho reservado · WMS · lote de PA · sessão QR (Fase B)
- **Norma:** `docs/ADR_PRODUCAO_COLETA_DIRIGIDA.md`
- **Teste local:** OP aberta com SKU `controla_lote` e volumes no local → Separação → **Preparar retirada** → conferir FEFO/local → confirmar. Ctrl+Shift+R se SPA antiga.

### BL-106 · [orc/norma+ux] ORC cabeçalho × itens (1..N jobs na proposta)
- **Status:** Em andamento (fases 0–2 prontas p/ teste; fase 3 PED pendente)
- **Prioridade:** P1
- **Origem:** Chat 2026-09-20/21 — multi-faca era o nível errado; multi-item é o correto
- **Depende de:** `ADR_ORC_ITENS.md` · emenda `ADR_ORC_FACAS_COMPOSICAO` · motor R1–R20 intacto
- **Decisão (fechada):**
  1. ORC = documento (cabeçalho); item/posição/job = detalhe 1..N; nunca chamar item de “orçamento”.
  2. Cabeçalho: tipo (fase 1) + cadastro + frete + aprovação + totais Σ.
  3. Item: faca + spec + escada + composição de artes (+ gordura/matriz).
  4. N geometrias = N itens — não N facas no documento.
  5. PED continua 1:1 ORC; N `pedido_itens` na fase 3 — nunca N PEDs.
  6. Implementar em fases 1→2→3 sem quebrar N=1.
- **Aceite (por fase):**
  - [x] Fase 0: ADR + emendas + este BL
  - [x] Fase 1: paridade N=1 — `orcamento_itens` · dual-write create/update · `itens` no show · legado materializado na leitura · UI flat intacta · testes `OrcamentoItensTest` + asserts em `OrcamentoTest`
  - [x] Fase 2: UI N>1 + proposta/totais Σ + link único + hierarquia resultado (N=1 limpo · N>1 hero+acordeão/seletor nas 3 abas)
  - [ ] Fase 3: espelho PED N linhas + OP por linha (sem N PEDs)
- **Fora de escopo nesta BL:** proposta mista PA+SVC (fase 2 de tipo no item) · alterar R1–R20 · SKU por arte/faca
- **Norma:** `docs/ADR_ORC_ITENS.md`
- **Teste local:** http://localhost:8043 → Orçamentos → Novo → **Itens deste orçamento** (Adicionar/Duplicar) → Calcular/Salvar → no **detalhe**, guias por item na ficha + total/acordeão no resultado. PED ainda só espelha o item 1. Ctrl+Shift+R se SPA antiga.

### BL-105 · [fiscal/ux] UI cancel/CC-e + piloto homolog nuvem
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-09-18 — NF-e SEFAZ direto
- **Depende de:** BL-104 · `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md`
- **Decisão (fechada):**
  1. FAT: Emitir / Consultar / Cancelar / Carta de correção; texto “via A1”; sem hub Focus.
  2. Doc piloto homolog: A1 + IE + seed numeração + UF mapeada.
- **Aceite:**
  - [x] Modais cancel/CC-e no detalhe do FAT
  - [x] `docs/PILOTO_NFE_SEFAZ_DIRETO.md`
- **Fora de escopo:** Menu hubs · NFS-e
- **Entregue em:** 2026-09-18

### BL-104 · [fiscal] Carta de correção (110110)
- **Status:** Feito
- **Prioridade:** P0
- **Depende de:** BL-103 · `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md`
- **Aceite:**
  - [x] `POST …/carta-correcao` · protocolo no DFS · sem mexer estoque/FAT
- **Entregue em:** 2026-09-18

### BL-103 · [fiscal/estoque] Cancelamento NF-e (110111) + estorno SAIDA_VENDA
- **Status:** Feito
- **Prioridade:** P0
- **Depende de:** BL-102 · `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md`
- **Aceite:**
  - [x] Evento cancel · DFS CANCELADO · estorna MOV · libera estorno comercial FAT
- **Entregue em:** 2026-09-18

### BL-102 · [fiscal] Ligar emissão SEFAZ no FAT (sem Focus)
- **Status:** Feito
- **Prioridade:** P0
- **Depende de:** BL-101 · `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md`
- **Aceite:**
  - [x] Checklist A1 · origem SEFAZ · SAIDA_VENDA · Focus fora do caminho NFe · testes feature
- **Entregue em:** 2026-09-18

### BL-101 · [fiscal] Núcleo SEFAZ NF-e (numeração + XML + SOAP + fake)
- **Status:** Feito
- **Prioridade:** P0
- **Depende de:** BL-100 · `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md`
- **Aceite:**
  - [x] `nfe_series_controle` · builder/signer · Autorizacao/Ret · `NFE_DRIVER=fake`
- **Entregue em:** 2026-09-18

### BL-100 · [norma] NF-e saída direta SEFAZ + A1 (sem Focus)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-09-18 — extinguir Focus em emissão/cancel/CC-e; A1 nuvem pronto
- **Depende de:** BL-093 (DF-e) · `ADR_CERTIFICADO_A1_EMPRESA.md`
- **Decisão (fechada):**
  1. NF-e direto SEFAZ + A1 cofre; SOAP próprio; Focus desligado não apagado.
  2. Numeração no ERP; oficial = origem SEFAZ; stub local intacto.
  3. NFS-e fora desta fatia.
- **Aceite:**
  - [x] `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md` + emendas ADRs/mapa/rules
- **Fora de escopo:** Código runtime (BL-101+)
- **Entregue em:** 2026-09-18

### BL-099 · [estoque/ux] Mapa de ocupação dos locais (6×4×3)
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-09-12 — visão espacial leve do almoxarifado
- **Depende de:** BL-098 · `ADR_CADASTRO_INSUMO_VOLUME.md` F4
- **Decisão (fechada):**
  1. Mapa = ocupação por **endereço** (não geometria de produto). Célula = `Pxx-Cxx-Lxx`.
  2. `GET /estoque/mapa` agrega volumes com `qtde > 0`; drill-down `GET /estoque/lotes?endereco_id=&com_qtde=1`.
  3. Só leitura — sem tocar `EstoqueSaldoWriter` / MOV / receber.
- **Aceite:**
  - [x] Rota `/estoque/mapa` + tab Mapa no módulo
  - [x] KPI ocupados/vazios/sem local + pontinhos por densidade
  - [x] PHPUnit mapa após vínculo
- **Fora de escopo:** Slotting · multi-depósito · plotagem geométrica · Painel
- **Entregue em:** 2026-09-12

### BL-098 · [estoque/wms] Localização — vãos + QR endereço (F4)
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-09-05 — cadastro insumo → volume → prateleiras
- **Depende de:** BL-097 · `ADR_CADASTRO_INSUMO_VOLUME.md` F4
- **Decisão (fechada):**
  1. Gabarito 6 prateleiras × 4 colunas × 3 locais (1,50 × 0,60 × 1,00 m) — sem Local 4 (`L04`). UX: Local/Locais; domínio: `vao` / código `Lxx`.
  2. QR do local; vínculo volume ↔ endereço; saldo oficial continua SKU (+ lote).
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
  2. Motor API + catálogo; UI `/implantacao` retirada do menu (2026-09-15); não funde com `/ativacao`.
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
