# Backlog — Trigger / 39

Fila de intenções do produto. **Não** é lido pelo app em runtime.

## Como usar no Cursor

| Modo | Frase | Efeito |
|------|--------|--------|
| Registrar | `Só coloca no backlog, não altere código.` | Adiciona/atualiza um item `BL-XXX` neste arquivo |
| Executar | `Execute somente a BL-XXX. Não expandir escopo.` | Implementa só aquele item |

Prioridade: **P0** bloqueante → **P1** importante → **P2** desejável → **P3** ideia  
Status: `Backlog` · `Pronto para executar` · `Em andamento` · `Feito`

## Próximo ID

`BL-004`

---

## Itens

### BL-003 · [comercial] Prospect inline no ORC + FACA NOVA + layout do mapa de facas
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-04 — cliente ainda sem cadastro; corrigir busca do mapa; orçar facas ainda não cadastradas; sem estragar o orçamento já excelente
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`  
  - `ORCAMENTO_PROSPECT_SEM_CADASTRO.txt` (prospect mínimo; texto livre proibido; antiduplicidade; promoção só na conversão)  
  - `GERACAO_ORCAMENTO.txt` §7.3 (FACA EXISTENTE × FACA NOVA; cadastrar no mapa só após aprovação)  
  - `FLEXIBILIDADE_LIMITES_CUSTOMIZACAO_ORCAMENTO.txt` / `MOBILIDADE_SIMULACAO_CENARIOS_ORCAMENTO.txt` (faca simulada + custo/prazo cotados)
- **Referência (exemplo):** `/home/dfmoura/Documents/test_several1/trigger/36` (FacaPicker + wizard ORC)
- **Decisão (fechada):**
  1. **Prospect mínimo inline** no wizard: nome + (WhatsApp OU e-mail) + cidade/UF; anti-duplicidade (409 + reutilizar ou forçar); sem texto livre; `is_prospect` basta como papel (sem CLIENTE sem CNPJ).
  2. **Lista orçável** = `papel_cliente OR is_prospect` (`?papel=orcavel`).
  3. **FACA NOVA** só no ORC (snapshot + valor/prazo cotados); **não** grava no `mapa_facas` agora — cadastro oficial fica para pós-aprovação.
  4. **Motor BRAHVA/R1–R20 intocado** — metadados de faca nova enriquecidos em `OrcamentoService::enrichResult`.
  5. **Layout do mapa** corrigido (filtros em coluna, tabs Busca/Nova, empty-state com CTA).
- **Aceite:**
  - [x] `POST /parceiros/prospect-rapido` (comercial com `orcamento.escrever` ou `parceiro.escrever`)
  - [x] Lista `papel=orcavel` + busca ampliada (contato)
  - [x] UI “Novo prospect” no wizard com reaproveitamento de duplicados
  - [x] FacaPicker: layout da busca + aba/modos Faca nova
  - [x] Snapshot ORC com `faca_nova`, `formato_faca`, `valor_faca_nova`, `prazo_faca_dias`; total comercial com faca
  - [x] Testes: `ProspectRapidoTest`, extensão `OrcamentoTest` (prospect + faca nova)
- **Fora de escopo:** promoção prospect→cliente; gravação no mapa oficial; envio/PED; condição a prazo/crédito
- **Entregue em:** 2026-08-04

### BL-002 · [comercial] Rotina de orçamento — rascunho profissional (salvar / editar / excluir, sem avançar fluxo)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-04 — pedido de rotina de orçamento no padrão profissional do domínio; só persistência com edição/exclusão até o orçamento estar ok; sem continuar o fluxo
- **Referência (domínio — apoio normativo):** `/home/dfmoura/Documents/test_several1/trigger/32`  
  - `DECISAO_MODELO_DOMINIO_CAMINHO_RECOMENDADO.txt` (M02 âncora; ORC versionado)  
  - `DOMINIO_SISTEMA_ERP_RLP.txt` (agregado ORC, máquina de estados, D0.13–D0.14)  
  - `GERACAO_ORCAMENTO.txt` (motor, snapshot, faixas, composição interna ≠ proposta)  
  - `ORCAMENTO_PROSPECT_SEM_CADASTRO.txt` (parceiro mínimo; texto livre proibido)  
  - `FLEXIBILIDADE_LIMITES_CUSTOMIZACAO_ORCAMENTO.txt` (catálogo × envelope; zero texto livre de opção)  
  - demais TXTs de ORC (`APROVACAO_*`, `MOBILIDADE_*`, `GORDURA_*`, imposto) — **só como fronteira**; não implementar neste item
- **Referência (exemplo implementado):** `/home/dfmoura/Documents/test_several1/trigger/36`  
  (`OrcamentoWizard`, `OrcamentosPage`, `OrcamentoDetailPage`, `orcamentoForm.ts`, motor/API com status `RASCUNHO`/`CALCULADO` editáveis; após `ENVIADO` imutável)
- **Problema / oportunidade:** o 39 ainda não tem rotina comercial de ORC; precisamos de um lugar sólido para montar, calcular, gravar e revisar propostas **antes** de liberar aceite/link/PED — alinhado ao domínio excelente do 32 e ao padrão já provado no 36.
- **Decisão (fechada — não reabrir neste item):**
  1. **Escopo = pré-fluxo apenas.** Estados operacionais nesta entrega: `RASCUNHO` e `CALCULADO`. Persistência completa + listagem + detalhe + editar + excluir (ver item 4). **Não** implementar: enviar link, aceite do cliente, conversão ORC→PED, crédito, gordura/alçada externa, cenários avançados, recorrência.
  2. **Calcular → Salvar → Revisar.** UI no espírito do wizard do 36: preencher com opções de catálogo, calcular (preview), salvar com **snapshot** (`input` + `result`) auditável/reprodutível. Reabrir mostra os mesmos números do momento do cálculo.
  3. **Parceiro obrigatório (id).** Sem texto livre de cliente. Se o cadastro de prospect/mínimo já existir no 39, permitir orçar para prospect; senão, exigir parceiro já cadastrado e deixar criação inline de prospect para item futuro.
  4. **Exclusão só no pré-envio.** Em `RASCUNHO`/`CALCULADO`: exclusão lógica (soft-delete ou `CANCELADO`), coerente com o domínio (“sem delete físico”). Após qualquer estado pós-envio (futuro): imutável — alterações viram **nova versão/novo ORC** (não neste BL).
  5. **Motor e catálogo no melhor padrão possível para o 39.** Preferir portar/adaptar o padrão do 36 (motor + catálogo + faixas N + decimal HALF-UP) sobre o stack do 39 (Laravel). Componentes de custo e faixas conforme `GERACAO_ORCAMENTO.txt`; arredondamento comercial para cima. Imposto = estimativa (gross-up), nunca fiscal oficial.
  6. **Separação interna × comercial na UI.** Orçamentista vê composição; qualquer superfície “cliente” futura não entra agora. Nesta fase a tela é **interna**.
  7. **Código de negócio:** `ORC-AAAA-NNNNN` (+ versão interna quando recalcular/salvar de novo no rascunho). Multi-empresa e permissões (`orcamento.ler` / `orcamento.write` ou equivalente do 39).
  8. **Não avançar o fluxo “por atalho”.** Botões/APIs de enviar, aprovar, gerar PED ficam **fora** do aceite deste BL (podem existir stubs desabilitados na UI se ajudar o roadmap, mas sem endpoints ativos de transição).
- **Objetivo:** existir no 39 uma rotina profissional de orçamento em rascunho — criar, calcular, salvar, listar, editar e excluir — no padrão do domínio M02 e do exemplo 36, **sem** seguir para ENVIADO/PED até o orçamento estar ok e um BL futuro liberar o fluxo.
- **Aceite:**
  - [x] Modelo/persistência de ORC (código, versão, empresa, parceiro, status `RASCUNHO`|`CALCULADO`, snapshots input/result, metadados de validade/prazo básicos, auditoria create/update/delete)
  - [x] API autenticada: listar, obter, criar, atualizar, calcular (preview e/ou persistido), excluir logicamente — somente enquanto editável
  - [x] Motor de cálculo alinhado ao padrão GERACAO/36 o quanto o 39 já permitir (faixas N, decimal correto, snapshot); parâmetros/catálogo consultados — sem preço “digitado no meio” sem origem
  - [x] UI comercial: listagem + formulário/wizard + detalhe com composição; ações Salvar / Editar / Excluir; **sem** CTA que avance ENVIADO→PED
  - [x] Parceiro por referência de cadastro (não texto livre)
  - [x] RBAC e escopo multi-empresa
  - [x] Testes cobrindo cálculo básico, CRUD de rascunho, bloqueio de edição após estado não-editável (se o enum já incluir estados futuros), exclusão lógica
- **Fora de escopo (nesta entrega):**
  - link de aprovação / aceite do cliente (D0.13) e geração de PED com snapshot travado (D0.14)
  - crédito, adiantamento, gordura/alçada, cenários concorrentes avançados, recorrência
  - NF, produção, estoque, financeiro derivados do ORC
  - migração automática de planilhas XLSM ou de dados do projeto 36
  - criação inline completa de prospect **se** o módulo de parceiros do 39 ainda não cobrir o mínimo (nesse caso, BL de cadastro/prospect separado)
- **Notas técnicas:** no 36 o fluxo feliz de homologação é calcular → salvar → enviar → aprovar faixa → PED; **este BL para no salvar/editar**. Domínio ORC: `RASCUNHO → ENVIADO → …` — estados pós-`CALCULADO` ficam no enum/modelo se for barato antecipar, mas sem transições. Preferir soft-delete/`CANCELADO` a hard delete. Stack do 39 (Laravel/API `/api/v1/…`, UI existente) deve absorver o padrão do 36 sem copiar stack FastAPI/React à força.
- **Entregue em:** 2026-08-04
- **Implementação (39):**
  - Motor PHP R1–R20 + catálogo oficial (`app/Services/Comercial/Orcamento/`, `resources/data/orcamento/catalog_oficial.json`)
  - Persistência `orcamentos` + `matriz_cobradas`; código `ORC-AAAA-NNNNN`; status editáveis `RASCUNHO`/`CALCULADO`; exclusão → `CANCELADO` + soft-delete
  - API `/api/v1/orcamentos*` (+ `/catalogo`, `/calcular`); permissões `orcamento.ler` / `orcamento.escrever`
  - UI Comercial → Orçamentos no padrão UX do 36: wizard seções 1–5, **FacaPicker + mapa oficial** (`GET /facas`), lista Ver/Editar, detalhe meta+spec, breakdown comercial/interno; sem enviar/PED
  - Domínio 32: parceiro por id, snapshot auditável, exclusão lógica, composição interna ≠ proposta cliente
  - Testes: `OrcamentoMotorTest`, `OrcamentoTest`, `FacasMapaTest` (BRAHVA + mapa)

### BL-001 · [ia] Cadastro de provedores de IA (base para interação futura)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-04 — pedido de cadastro de provedores para uso futuro no sistema
- **Referência:** exemplo em `/home/dfmoura/Documents/test_several1/trigger/23`  
  (`app/ia_provedores.py`, `app/ia_client.py`, `app/ia_crypto.py`, modelo `IaProvedor` em `app/database.py`, UI Setup em `app/static/setup.js`, testes em `tests/test_ia_provedores.py`)
- **Problema / oportunidade:** o projeto 39 ainda não tem lugar para cadastrar tokens/provedores de IA; sem isso não dá para, no futuro, o sistema escolher e chamar modelos de forma controlada.
- **Objetivo:** existir um cadastro administrativo de provedores de IA (CRUD + teste de conexão), com API key protegida, alinhado ao padrão do trigger/23, pronto para features futuras consumirem.
- **Aceite:**
  - [x] Modelo/persistência de provedor (nome, tipo, base_url, modelo, prioridade, ativo, máscara da key, metadados de último teste)
  - [x] API admin para listar, criar, atualizar, excluir e testar conexão
  - [x] API key armazenada de forma cifrada; respostas nunca devolvem a key em texto pleno — só máscara
  - [x] UI de Setup/admin para gerenciar os provedores (mínimo viável)
  - [x] Tipos de provedor coerentes com o exemplo (ex.: openai e equivalentes suportados no 23)
  - [x] Não expor secrets em logs nem no backlog/docs
- **Fora de escopo (nesta entrega):**
  - features de negócio que já conversem com a IA (chat, análises, etc.) — só o cadastro/base
  - migração automática de dados do projeto 23
  - alterações de deploy Lightsail / infra
- **Notas técnicas:** no 23 o fluxo é admin (`/api/sistema/ia-provedores`), criptografia Fernet (`IA_TOKEN_SECRET`), cliente com rotação por prioridade (`IAClient`). No 39: Laravel Crypt (`APP_KEY`), rotas `/api/v1/ia-provedores`, permissão `ia.provedores.gerir`, menu Administração → Provedores de IA, serviços em `app/Services/Ia/`.
- **Entregue em:** 2026-08-04
