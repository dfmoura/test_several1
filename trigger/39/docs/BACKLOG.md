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

`BL-032`

---

## Itens

### BL-031 · [comercial] Link público de aprovação do ORC (cliente)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-09 — rotina enviar orçamento para cliente aprovar; subdomínio flexorc; status preparação/enviado/aprovado/rejeitado; Ctrl+C; estudo 32; não estragar
- **Referência:** `../32/APROVACAO_ORCAMENTO_CLIENTE.txt` · `../32/GERACAO_ORCAMENTO.txt` §6/§9 · ADR `docs/ADR_ORC_LINK_APROVACAO.md` · protótipo `../33`
- **Decisão (fechada):**
  1. Mesmo monólito; SPA `/p/{token}`; base `ORCAMENTO_PUBLIC_BASE_URL` (prod: `https://flexorc.triggerti.com`).
  2. Tabela `orcamento_links_aprovacao` (token 1:1); DTO só comercial no público.
  3. Status: preparação (edit/del) → enviado (imutável) → aprovado (travado) | rejeitado (reedita e reenvia). Link some após decisão.
  4. Clipboard + texto padrão; **sem** WhatsApp API / PED / crédito nesta entrega.
- **Aceite:**
  - [x] Migration + model + service + APIs auth/pública
  - [x] UI detalhe: Enviar / Copiar link
  - [x] Página pública profissional aprovar/recusar
  - [x] Testes Feature de fluxo completo
  - [x] Diagrama + ADR

### BL-030 · [comercial] Ficha operacional do ORC para impressão (HTML paisagem)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-09 — ficha completa de impressão no orçamento (não é para cliente); incluir faca etc.; padrão das demais; estudo 32; recomendar e decidir sem estragar
- **Histórico:** Tentativas do mesmo dia (retrato forçado → paisagem) foram desfeitas a pedido; reaberta e fechada com decisão de domínio abaixo.
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `GERACAO_ORCAMENTO.txt` §1.5 — aba **ORÇAMENTO** (interno) ≠ **CONSOLIDADO** (cliente)
  - Excel oficial `orçamento/ORcAMENTO_OFICIAL_*.xlsm` — ORÇAMENTO = **landscape**; CONSOLIDADO = portrait
  - `CASOS_USO_M02_COMERCIAL.txt` UC-COM-001
- **Referência (padrão 39):** shell `.ficha-*` + `fichaNav` + `window.print` (BL-015/018/019/024)
- **Decisão (fechada):** HTML A4 **paisagem** espelhando a aba ORÇAMENTO (descrição + faca + métricas + custos + fechamento). Shell das fichas (masthead / tabelas / TRIGGER). Orientação paisagem é do **conteúdo** do cálculo; cadastros continuam retrato. **Não** é proposta CONSOLIDADO ao cliente. DomPDF fora.
- **Aceite:**
  - [x] `OrcamentoFichaSheet` + `OrcamentoFichaPage` em `/orcamentos/:id/ficha` (fora do AppShell)
  - [x] Botão “Imprimir ficha” no detalhe e na edição (nova aba via `fichaNav`)
  - [x] `@page ficha-orc-a4` landscape (CSS escopado em `.ficha-sheet-orc`)
  - [x] Spec em tabelas + faca com `FacaShapeIcon` (print-safe)
  - [x] Métricas / custos / fechamento por faixa
  - [x] Marcação “Uso interno”
- **Fora de escopo:** proposta CONSOLIDADO ao cliente, DomPDF, e-mail, WhatsApp
- **Entregue em:** 2026-08-09 (reabertura)
- **Arquivos:**
  - `OrcamentoFichaSheet` + `OrcamentoFichaPage`
  - rota + botões; CSS `.ficha-sheet-orc` / `.ficha-orc-faca`

### BL-029 · [cadastros/arquitetura] Revalidar unidades do produto (dual canônico ≠ Sankhya)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-08 — revalidar Unidade comercial / interna / largura / comprimento / gramatura / fator; estudo 32; Sankhya só como referência; recomendar e decidir
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `CONVERSOES_UNIDADES_MEDIDA.txt` (pontes + regras de ouro)
  - `CADASTRO_PRODUTOS_COMPRA.txt` / `CADASTRO_PRODUTOS_VENDA.txt` (unidades)
  - UC-CAD-005
- **Decisão (fechada):** **modelo dual canônico** — `unidade_comercial` ↔ `unidade_interna` (estoque) + `fator_conversao` (1 com = fator × int) + atributos bobina em JSON. **Não** adotar tabela de unidades alternativas estilo Sankhya nesta fase. Sankhya inspira equivalências na UX, não o schema.
- **Aceite:**
  - [x] ADR `docs/ADR_UNIDADES_PRODUTO.md`
  - [x] Regra Cursor `produto-unidades.mdc`
  - [x] Teste de fronteira `ProdutoUnidadesBoundaryTest`
  - [x] UX: seções Unidades / bobina / fator + rótulo “Unidade de estoque” + equação ao vivo
  - [x] Normalização: interna vazia → comercial; iguais → fator 1
  - [x] Ficha A4 alinhada; README invariante
  - [x] Visibilidade bobina: só `exige_dimensao_sku` ∪ faltando do motor ∪ legado; limpa ao trocar grupo; helper `ProdutoBobinaDimensoes` / `produtoBobinaDimensoesUi.ts`
- **Fora de escopo:** tabela N alternativas; promover atributos a colunas; estoque multi-saldo; CX/densidade na UI
- **Entregue em:** 2026-08-08

### BL-028 · [comercial] Mapa de facas persistente (visualizar + cadastrar + inativar)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-08 — Comercial com mapa visual; sem editar geometria; só inativar; desenho sempre; estudo 32
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `MANUAL_UNICO_ERP_RLP.txt` §3.3 / §7.3 (mapa oficial; FACA NOVA → cadastrar após aprovação)
  - `GERACAO_ORCAMENTO.txt` (medida/Z/puxada vêm da faca)
  - Soft-delete / inativar — sem apagar histórico
- **Decisão (fechada):**
  1. Tabela `orc_mapa_facas` + seed idempotente do JSON oficial (fallback JSON se vazia).
  2. UI **Comercial → Mapa de facas** com desenho (`FacaShapeIcon`) em grade + detalhe.
  3. Operações: listar/filtrar, **criar**, **inativar/reativar** — sem editar geometria existente.
  4. RBAC: `orcamento.ler` (ver) / `orcamento.escrever` (criar/inativar/seed).
  5. Distinto de produto **FAC-** (ferramental rastreável / cobrança 1×) — fora desta entrega.
- **Aceite:**
  - [x] Migration + model + `FacasMapaService` DB/JSON
  - [x] API resumo/list/show/store/ativo/seed
  - [x] UI mapa com desenho + cadastro + inativação
  - [x] Menu Comercial + dashboard + `facas:ensure-mapa` no boot
  - [x] Testes Feature estendidos
- **Fora de escopo:** edição de geometria; vínculo FAC- produto; cobrança 1×; upload de arte/SVG custom
- **Entregue em:** 2026-08-08

### BL-027 · [arquitetura] Congelar invariante BEM ≠ G10 (ADR + regra + teste)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — melhor engenharia agora e no futuro; estudo 32; recomendar e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `DECISAO_MODELO_DOMINIO_CAMINHO_RECOMENDADO.txt` §5.2 · ADR-DOM-001
  - `PATRIMONIO_CONTROLE.txt` (máquina física = BEM; OP → bem_id)
- **Decisão (fechada):** o cadastro/integração já estão corretos; o risco futuro é **regressão por fusão**. Entrega = **guarda de arquitetura**, sem mudar runtime de negócio.
  1. ADR canônica no 39
  2. Regra Cursor scoped aos arquivos BEM/ORC
  3. Teste unitário de fronteira de schema/relações
  4. Invariante no README + PHPDoc nos models
- **Aceite:**
  - [x] `docs/ADR_BEM_VS_ORC_MAQUINA.md`
  - [x] `.cursor/rules/bem-orc-boundary.mdc`
  - [x] `tests/Unit/BemOrcBoundaryTest.php`
  - [x] README + docs nos models
- **Fora de escopo:** nova feature de patrimônio, OP, CMMS, mudança de tarifas
- **Entregue em:** 2026-08-07

### BL-026 · [cadastros/gerencial] Integrar patrimônio ao restante do sistema (ponte BEM↔ORC↔PAR)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — patrimônio integrado ao sistema; estudo 32; recomendar e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `PATRIMONIO_CONTROLE.txt` §5 (máquina OP = bem; sem cadastro duplicado)
  - `DECISAO_MODELO_DOMINIO_CAMINHO_RECOMENDADO.txt` §5.2 (uma tabela BEM; preventivo depois)
- **Referência (padrão 39):** BL-023/025 (FK `orc_catalogo_maquina_id`); Catálogo ORC G10; parâmetros; dashboard
- **Decisão (fechada):** integração **por visibilidade e navegação** nesta fase — não fundir entidades, não criar OP/CMMS/compra→BEM.
  1. Catálogo ORC · Máquina (G10): coluna **Patrimônio** com `bens_vinculados[]` (somente leitura, escopo EMP).
  2. Form BEM: deep-links para fornecedor (PAR) e Catálogo ORC.
  3. Parâmetros: hint de `valor_minimo_capitalizar_bem`.
  4. Dashboard: escopo + `patrimonio.ler` no check de acesso vazio.
- **Aceite:**
  - [x] `listMaquinas` retorna `bens_vinculados` filtrados por `empresa_id`
  - [x] UI coluna Patrimônio com link `/patrimonio/:id` se `patrimonio.ler`
  - [x] Links cruzados no formulário BEM
  - [x] Hint em Parâmetros + dashboard
  - [x] Teste feature; tarifas ORC intocadas
- **Fora de escopo:** preventiva, OS, compra→BEM, alterar motor ORC, OP/`bem_id`
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `OrcCatalogoMaquina::bensPatrimoniais` + `maquinaOut.bens_vinculados`
  - `OrcamentoCatalogoPage` coluna Patrimônio
  - Soft links em `PatrimonioFormPage` / `ParametrosPage` / `DashboardPage`
  - `OrcamentoCatalogoTest::test_list_maquinas_inclui_bens_vinculados_da_empresa`

### BL-025 · [cadastros/gerencial] Completar máquinas físicas (BEM) × grupos ORC canônicos
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-08-07 — cadastrar as demais máquinas sem estragar; fonte = catálogo ORC do 39
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `PATRIMONIO_CONTROLE.txt` (máquina física = BEM; OP preferir bem_id)
  - `DECISAO_MODELO_DOMINIO_CAMINHO_RECOMENDADO.txt` §5.2 (zero “máquina paralela”)
  - Manual ORC (grupos BETA/160/250/ETIRAMA, BATIDA, MODULAR)
- **Decisão:** completar seed de **bens patrimoniais** ligados 1:1 aos 6 grupos canônicos do `catalog_oficial.json`. **Não** alterar `orc_catalogo_maquinas` / tarifas G10 (já semeadas). Sem inventar NF/série/valor.
- **Aceite:**
  - [x] BEM-00004 Reflexo 250 → ORC `250`
  - [x] BEM-00005 Etirama → ORC `ETIRAMA`
  - [x] BEM-00006 Batida → ORC `BATIDA`
  - [x] BEM-00007 Modular SPX → ORC `MODULAR`
  - [x] BEM-00001..00003 preservados; sequência BEM → 8
  - [x] Idempotente (`firstOrCreate` por código)
- **Fora de escopo:** preventiva CMMS, valores/NF reais, novos grupos ORC, rebobinadeiras fora do G10
- **Entregue em:** 2026-08-07
- **Implementação (39):** `DatabaseSeeder::seedBensPatrimoniais`

### BL-024 · [cadastros/gerencial] Ficha patrimonial BEM profissional (HTML retrato)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — melhorar ficha gerada do patrimônio; retrato; estudo 32; recomendar e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `PATRIMONIO_CONTROLE.txt` (etiqueta BEM-; gerencial ≠ depreciação do contador)
- **Referência (padrão 39):** BL-015 PAR · BL-018 produto · BL-019 empresa · CSS `.ficha-*` + `body.ficha-print-mode`
- **Decisão (fechada):** **mesmo padrão canônico** das outras fichas — HTML A4 retrato, `window.print`, DomPDF fora. Reaproveitar masthead / kv-strip / colunas / seções / rodapé TRIGGER. Não criar CSS paralelo.
- **Aceite:**
  - [x] `BemFichaSheet` alinhado a PAR/produto (Kv/Section, strip, colunas, chips de status)
  - [x] `PatrimonioFichaPage` com `ficha-page` + `ficha-print-mode` + título da aba
  - [x] Chips de ciclo de vida (ATIVO / EM_MANUTENCAO / CEDIDO / BAIXADO)
  - [x] Nota gerencial + código para etiqueta física
  - [x] Botão “Imprimir ficha” no cadastro
- **Fora de escopo:** PDF servidor, QR code na etiqueta, foto do bem, inventário
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `BemFichaSheet` + `PatrimonioFichaPage` + chips status em `global.css`

### BL-023 · [cadastros/gerencial] Cadastro de patrimônio (BEM)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — criar cadastro de patrimônio; já existem máquinas no sistema; estudo 32; recomendar e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `PATRIMONIO_CONTROLE.txt` (BEM-NNNNN; máquina física = bem; depreciação oficial = contador)
  - `MANUTENCAO_PREVENTIVA_MAQUINAS.txt` (plano preventivo futuro sobre bem_id)
  - `DECISAO_MODELO_DOMINIO_CAMINHO_RECOMENDADO.txt` §5.2 (uma tabela BEM; zero “máquina paralela”)
  - `CASOS_USO_M10_GERENCIAL.txt` UC-GER-002 · `CODIFICACAO_INFORMACOES_SISTEMA.txt` (BEM global)
  - `PARAMETROS_EMPRESA_OFICIAIS.txt` (`valor_minimo_capitalizar_bem`)
- **Referência (padrão 39):** CRUD parceiros/produtos; `CodigoGenerator` (CFIN); `orc_catalogo_maquinas` = **tarifas ORC**, não ativo físico
- **Decisão (fechada):**
  1. Entidade canônica **`bens_patrimoniais`** / código **`BEM-NNNNN`** (sequência global; linha com `empresa_id`).
  2. **Não** fundir nem alterar `orc_catalogo_maquinas` (grupos G10 / hora-máquina do ORC).
  3. Máquina de produção física = bem categoria `MAQUINA_GRAFICA`, com FK **opcional** `orc_catalogo_maquina_id` (ponte para tarifa ORC).
  4. Cadastro mínimo do estudo; status ciclo de vida; soft-delete; parâmetro de capitalização só informativo (sem lançamento contábil).
  5. Fora: CMMS/preventiva, inventário, anexos, depreciação gerencial calculada, compra→BEM automático, NF.
- **Aceite:**
  - [x] Migration + model + CodigoGenerator `BEM`
  - [x] API CRUD `/bens` + permissões `patrimonio.ler` / `patrimonio.escrever`
  - [x] Parâmetro `valor_minimo_capitalizar_bem` + aviso no formulário
  - [x] UI listagem + formulário + ficha + menu Cadastros
  - [x] Seed 1–2 bens demo EMP-00001 (sem inventar NF/série falsa)
  - [x] Teste feature; catálogo ORC intacto
- **Fora de escopo:** preventiva, OS manutenção, transferência histórica, export contador, depreciação, anexos
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `BemPatrimonial` + migration `2026_08_07_180000_*`
  - `BemPatrimonialService` / `BemPatrimonialController` + rotas `/api/v1/bens`
  - UI `PatrimonioPage` / `PatrimonioFormPage` / `BemFichaSheet`
  - Seed BEM-00001..00003 + `BemPatrimonialTest`

### BL-022 · [cadastros] Endereços de entrega no cadastro de parceiro
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — no cadastro de parceiro opção de endereço de entrega (mesmo do Endereço ou 1+ novos com responsável); estudo 32; recomendar e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `CADASTRO_PARCEIROS.txt` (endereço de ENTREGA quando diferente do fiscal / grupo entrega NF-e)
  - `ENTREGA_CONFIRMACAO_CLIENTE.txt` (endereço de entrega = snapshot no PED; cadastro PAR = locais padrão)
- **Referência (padrão 39):** `parceiro_contatos` / `parceiro_contas_bancarias` (sync multi-linha no save)
- **Decisão (fechada):** tabela filha **`parceiro_enderecos_entrega`** — não mexer no endereço fiscal do PAR; lista vazia = entrega no fiscal; 1+ linhas com responsável por receber; aba **Entrega** após Endereço.
- **Aceite:**
  - [x] Migration + model + relação no PAR
  - [x] create/update sync `enderecos_entrega[]` (padrão contatos: delete+recreate)
  - [x] Validação: linhas não vazias exigem responsável + endereço mínimo; no máximo um principal
  - [x] Aba Entrega no formulário (toggle mesmo fiscal × 1+ locais + CEP)
  - [x] Seção na ficha impressa
  - [x] Teste feature
- **Fora de escopo:** snapshot ORC/PED, romaneio ENT-, frete CIF/FOB, transportadora preferida, import CSV/XML de entrega, alteração do endereço fiscal
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `ParceiroEnderecoEntrega` + migration `2026_08_07_170000_*`
  - Sync em `ParceiroService` + regras em `ParceiroValidationRules`
  - Aba Entrega em `ParceiroFormPage`; seção na `ParceiroFichaSheet`
  - `ParceiroEnderecosEntregaTest`

### BL-021 · [cadastros/financeiro] Contas financeiras (CFIN) no cadastro da empresa
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — no cadastro EMP já poder 1+ bancos/contas pensando em financeiro e implantação de saldo; estudo 32; recomendar e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `INTEGRACAO_BANCARIA_MULTI_PROVIDER.txt` (Conta financeira; credenciais aparte; multi-provider)
  - `CASOS_USO_M06_FINANCEIRO.txt` / `RECEBIMENTO_BAIXA_COBRANCA.txt` (BX → conta financeira)
  - `MULTI_EMPRESA_CNPJS_E_LIVROS.txt` (contas/credenciais por EMP)
  - `estrategia_implantacao_ja.txt` (virada por saldo de abertura)
- **Referência (padrão 39):** `parceiro_contas_bancarias` (UX multi-conta + BrasilAPI) — semanticamente distinto
- **Decisão (fechada):** entidade **Conta financeira (CFIN)** na EMP, não multi-select de banco solto.
  - Tipos: `BANCO` | `CAIXA` | `APLICACAO`
  - 1+ contas, uma principal; soft-delete no sync; código `CFIN-NNNNN`
  - Campos de implantação: `saldo_abertura` + `saldo_abertura_em` (sem ledger / sem saldo corrente editável)
  - Credenciais BankProvider / COB / TIT / BX **fora** desta entrega
  - Contas do PAR permanecem só para pagar o parceiro
- **Aceite:**
  - [x] Migration `empresa_contas_financeiras` + model + relação EMP
  - [x] PUT `/empresas/{id}` aceita `contas_financeiras[]` (sync por id)
  - [x] SHOW carrega contas
  - [x] Aba Contas no `EmpresasPage` (catálogo `/consulta/bancos`)
  - [x] Seção na ficha impressa da empresa
  - [x] Seed EMP-00001: CFIN-00001 Sicoob (sem inventar agência/conta)
  - [x] Teste feature
- **Fora de escopo:** ledger de movimentos, saldo corrente, CNAB/API bancária, credenciais provider
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `EmpresaContaFinanceira` + migration `2026_08_07_160000_*`
  - `EmpresaService::syncContas` + `CodigoGenerator` prefixo `CFIN`
  - UI aba Contas + ficha
  - `EmpresaContasFinanceirasTest`

### BL-020 · [relatorios] Congelar Relatórios IA (adiar pós-core; código intacto)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — PDF engessa UX; análise HTML vs PDF; decisão híbrido futuro; adiar enquanto foco é cadastro/ORC; não apagar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32` (M10 gerencial CSV/PDF futuro — sem Relatórios IA)
- **Decisão:** **Feature flag master OFF**. Não hard-delete. Não tocar IaProvedores, migrations, queue Compose, DomPDF package.
  - API: middleware `relatorio.ia` → 404 se `RELATORIO_IA_HABILITADO=false` (default).
  - Jobs: no-op se flag OFF.
  - SPA: menu/dashboard/rotas só com `VITE_RELATORIO_IA_HABILITADO=true`.
  - Testes: phpunit força flag ON; testes do módulo preservados.
  - Futuro (reabrir): HTML preview + PDF export do mesmo documento (plano profissional).
- **Aceite:**
  - [x] Menu Relatórios e card dashboard ocultos por padrão
  - [x] Rotas SPA `/relatorios*` ausentes com flag OFF
  - [x] API `/api/v1/relatorios*` → 404 com flag OFF
  - [x] Código/services/jobs/tabelas/permissions seed preservados
  - [x] IaProvedores intocado
  - [x] README + .env.example documentam reabertura
- **Fora de escopo:** apagar código, dropar tabelas, evoluir layout HTML/PDF agora
- **Entregue em:** 2026-08-07
- **Reabrir:** `RELATORIO_IA_HABILITADO=true` + `VITE_RELATORIO_IA_HABILITADO=true` + rebuild web

### BL-019 · [cadastros] Ficha da empresa para impressão (HTML retrato)
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-08-07 — mesma ficha profissional no cadastro da empresa; puxar parceiro + produto; estudo 32; recomendar e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `MULTI_EMPRESA_CNPJS_E_LIVROS.txt` (EMP-00001/00002; flags venda/estoque; sem LAI)
  - `PARAMETROS_EMPRESA_OFICIAIS.txt` (quando aplicável)
- **Referência (padrão 39):** BL-015 ficha PAR · BL-018 ficha produto · abas Atividades/Sócios do `EmpresasPage`
- **Decisão:** **HTML pronto para impressão** (A4 retrato, `window.print`). DomPDF fora. **Atividades + QSA** na ficha: CNAEs do cadastro enriquecidos com descrição via consulta CNPJ; QSA só consulta Receita (não persiste) — mesmo padrão da tela.
- **Aceite:**
  - [x] Botão “Imprimir ficha” no cabeçalho da empresa selecionada (nova aba)
  - [x] Layout retrato A4 com marca RLP + Powered by TRIGGER
  - [x] Seções: endereço, contato, **atividades (CNAE)**, fiscal, **QSA**, operação, histórico, pendências
  - [x] Consulta BrasilAPI ao abrir a ficha (silenciosa; imprint espera QSA/descrições)
  - [x] Nota multi-empresa / venda off quando aplicável
  - [x] Zero mudança no CRUD/API/relatórios
- **Fora de escopo:** PDF servidor, parâmetros versionados na ficha, e-mail da ficha, persistir QSA
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `EmpresaFichaSheet` + `EmpresaFichaPage` em `/empresas/:id/ficha` (fora do AppShell)
  - CTA no `EmpresasPage` (empresa selecionada)
  - Enrichment: `GET /consulta/cnpj/{cnpj}` → QSA + descrições CNAE

### BL-018 · [cadastros] Ficha do produto para impressão (HTML retrato)
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-08-07 — ficha profissional em retrato; puxar padrão do parceiro; estudo 32; recomendar melhor caminho e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `CADASTRO_PRODUTOS_VENDA.txt` (Camada A fiscal × Camada B no ORC/PED; NCM/origem/SPED/unidades)
  - `CADASTRO_PRODUTOS_COMPRA.txt` (MP/EMB/REV; atributos bobina)
  - `CASOS_USO_M01_CADASTROS.txt` (UC-CAD-003)
- **Referência (padrão 39):** BL-015 ficha do parceiro (`ParceiroFichaSheet` + HTML print A4)
- **Decisão:** **HTML pronto para impressão** (A4 retrato, `window.print` / Salvar como PDF). DomPDF fora — Relatórios IA permanece o PDF arquivável; ficha é snapshot operacional do cadastro.
- **Aceite:**
  - [x] Botão “Imprimir ficha” na tela do produto (somente edição, nova aba)
  - [x] Layout retrato A4 com marca RLP + Powered by TRIGGER (mesmo CSS `.ficha-*`)
  - [x] Seções: identificação, unidades, fiscal, comercial, atributos/bobina quando houver
  - [x] Nota Camada A × especificação no ORC/PED (estudo 32)
  - [x] Zero mudança no CRUD/API/import/relatórios
- **Fora de escopo:** PDF servidor, e-mail da ficha, foto do produto, versão catálogo comercial com preço de ORC
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `ProdutoFichaSheet` + `ProdutoFichaPage` em `/produtos/:id/ficha` (fora do AppShell)
  - `@page ficha-a4` (genérico; substitui `ficha-parceiro`)
  - CTA no `ProdutoFormPage` (somente edição, não “novo”)

### BL-017 · [cadastros] Sugestão automática de Descrição fiscal / comercial no produto
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — sugestão ao cadastrar produto (pode usar info livre); IA opcional depois; respeitar padrão do sistema e estudo 32; não engessar; não estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `CADASTRO_PRODUTOS_VENDA.txt` (fiscal estável × comercial rica; template placeholders PA; regra de ouro)
  - `CADASTRO_PRODUTOS_COMPRA.txt` (higiene: marca ≠ descrição; anti-apelido)
  - `CASOS_USO_M01_CADASTROS.txt` (sugerir → humano confirma antes de salvar)
- **Referência (padrão 39):** `ProdutoFormPage` (hint fiscal); `FatorConversaoSugeridor` (sugestão determinística + aplicar); hubs IA / Relatórios (v1.1); grupos canônicos `ProdutoGrupoCatalogData`
- **Problema / oportunidade:** operador digita à mão as duas descrições; risco de marca no fiscal, apelido pejorativo, PA sob medida eterno, ou textos inconsistentes com o catálogo RLP.
- **Decisão (v1 — fechada):** motor **determinístico por grupo** + campo opcional “informação extra” + preview + Aplicar (fiscal / comercial / ambas) com anti-sobrescrita e aviso de similares no mesmo grupo. **Sem IA nesta entrega** (v1.1 reutiliza `IaClient`). Sem mudar schema, validação, import commit, NCM/CFOP ou geração de código.
- **Aceite:**
  - [x] `POST /produtos/sugerir-descricao` (perm. `produto.escrever`) → fiscal + comercial + racional + avisos + similares
  - [x] Templates por grupo (PA/MP/EMB/REV/SVC/FAC) alinhados ao estudo/seeds
  - [x] UX no `ProdutoFormPage` (aba Comercial): texto livre opcional → Sugerir → aplicar com confirmação se campo já preenchido
  - [x] Testes unitário + feature
  - [x] Zero mudança em Relatórios IA / import CSV commit
- **Fora de escopo (v1):** IA; placeholders resolvidos no ORC/PED; sugestão em massa no import; auto-save no blur
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `ProdutoDescricaoSugeridor` + `ProdutoController::sugerirDescricao`
  - Rota `POST /api/v1/produtos/sugerir-descricao`
  - UI no `ProdutoFormPage` (entre Grupo e descrições)
  - Testes `ProdutoDescricaoSugeridorTest` + `ProdutoDescricaoSugestaoTest`

### BL-016 · [identidade] Padrão canônico TRIGGER × licenciado (sem forçar nem apagar)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — melhorar identificação da TRIGGER em todo o sistema; modelo profissional; referência `trigger/12`; não forçar como herói nem apagar
- **Referência (padrão):** `/home/dfmoura/Documents/test_several1/trigger/12` (ecossistema × nós/produto; atribuição “por Trigger”; navy+verde)
- **Problema:** textos misturados (“Desenvolvido por” × “Powered by”), alt inconsistente, `favicon.svg` ainda Vite/roxo, paths/labels hardcoded espalhados — risco de apagar ou forçar a marca sem regra
- **Decisão:** três camadas (licenciado herói · TRIGGER atribuição permanente · EMP contexto); UI = “Desenvolvido por”+logo; documentos = “Powered by TRIGGER”; fonte única `brand.ts` + `config('erp.brand')`; doc `docs/IDENTIDADE_TRIGGER.md`
- **Aceite:**
  - [x] Doc normativa + README/LIGHTSAIL alinhados
  - [x] `TriggerAttribution` + `brand.ts` usados em login, BrandBar, ficha
  - [x] Byline **por Trigger Data Intelligence** sob ERP RLP (sidebar + login)
  - [x] Rodapé com marca + nome completo em tipografia contida (sem TRIGGER display estourado)
  - [x] PDF via `config('erp.brand.attribution_print')`
  - [x] Favicon SVG = marca navy TRIGGER
- **Fora de escopo:** white-label dinâmico por tenant/API, troca de nome do produto
- **Entregue em:** 2026-08-07

### BL-015 · [cadastros] Ficha do parceiro para impressão (HTML retrato)
- **Status:** Feito
- **Prioridade:** P2
- **Origem:** Chat 2026-08-07 — botão ao abrir parceiro; ficha profissional; sem sócios/QSA; retrato; recomendar HTML vs PDF e decidir sem estragar o sistema
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `CADASTRO_PARCEIROS.txt` (PAR único + seções identificação/endereço/contatos/fiscal/financeiro)
  - `CASOS_USO_M01_CADASTROS.txt` (UC-CAD-001 “abre ficha”; UC-CAD-007 bancário SoD)
- **Decisão:** **HTML pronto para impressão** (A4 retrato, `window.print` / Salvar como PDF no browser). PDF DomPDF ficou de fora — Relatórios IA permanece o caminho de PDF arquivável; ficha é snapshot de consulta/impressão operacional.
- **Objetivo:** operador abre o PAR e gera/visualiza uma ficha limpa para imprimir, sem QSA, respeitando SoD de crédito/bancário.
- **Aceite:**
  - [x] Botão “Imprimir ficha” na tela do parceiro existente (nova aba)
  - [x] Layout retrato A4 com marca RLP + Powered by TRIGGER
  - [x] Sem sócios/QSA
  - [x] Bancário só com `parceiro.bancario`; limite de crédito só com `credito.escrever`
  - [x] Zero mudança no CRUD/API/import/relatórios
- **Fora de escopo:** PDF servidor, arquivo em storage, e-mail da ficha, QSA
- **Entregue em:** 2026-08-07
- **Implementação (39):**
  - `ParceiroFichaSheet` + `ParceiroFichaPage` em `/parceiros/:id/ficha` (fora do AppShell)
  - CSS print `body.ficha-print-mode` + `@page ficha-parceiro`
  - CTA no `ParceiroFormPage` (somente edição, não “novo”)

### BL-014 · [cadastros] Fornecedor a partir do XML da NF-e de entrada (em Importar parceiros)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-06 — dentro de “Importar parceiros”, cadastrar Fornecedor a partir do XML da nota de entrada; quando CNPJ não estiver na base, usar os campos do XML que o cadastro solicita; aproveitar APIs; decidir e recomendar o melhor caminho sem estragar o que já está excelente
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `CADASTRO_PARCEIROS.txt` (PAR único + papéis; unicidade CNPJ; sincronia com XML; razão = cartão CNPJ)
  - `VERIFICACAO_ENDERECO_FORNECEDOR.txt` (confrontar `<enderEmit>` × cartão CNPJ; alertar divergência material; abreviações OK)
  - `APIS_FREE_CONSULTA_CADENCIA.txt` (§7.3 importação XML — 1 consulta CNPJ por emitente novo; cache; nunca crawling)
  - `CASOS_USO_M07_COMPRAS.txt` UC-CPR-004 (entrada XML via Focus → conferência → MOV — **Fase Compras**, não este BL)
  - `CASOS_USO_M01_CADASTROS.txt` UC-CAD-001 / fornecedor
- **Referência (padrão 39):** import CSV já excelente (`ParceiroImportPage` + `ParceiroImportService` preview→commit + BrasilAPI); consulta `GET /consulta/cnpj|cep`; fixture `tests/fixtures/nfe_fedrigoni.xml`; hubs Focus (BL-006) só config
- **Problema / oportunidade:** hoje “Importar parceiros” é só CSV. Operacionalmente o fornecedor chega com o XML da NF-e; o domínio já mapeia emitente→PAR e manda confrontar endereço com a RFB. Falta um caminho profissional **no cadastro**, sem antecipar o módulo de compras.

#### Opções avaliadas
| # | Caminho | Veredito |
|---|---------|----------|
| A | Só formulário manual + “Consultar CNPJ” | Insuficiente — operador re-digita o que o XML já traz |
| B | Ensinar CSV a aceitar colunas “como no XML” | UX ruim; não é o documento real da NF |
| C | **Modo XML na mesma tela Importar parceiros** (parse local + APIs + preview humano → criar FORNECEDOR) | **Escolhido** |
| D | Já fazer UC-CPR-004 completo (Focus download + OC + MOV estoque) | Fora de escopo — Compras/Fiscal ainda não liberados; estragaria fronteiras |
| E | Auto-criar PAR sem conferência ao ler XML | Proibido pelo domínio (validação na origem + humano confirma endereço/regime) |
| F | Gravar endereço só do XML, ignorar BrasilAPI | Contradiz “endereço = cartão CNPJ”; XML pode abreviar |

#### Decisão (fechada — não reabrir neste item)
1. **Onde mora:** mesma área **Parceiros → Importar**. UI com **dois modos** (abas): **CSV** (inalterado) e **XML NF-e (Fornecedor)**. Não criar menu paralelo de compras.
2. **Escopo = cadastro de PAR, não entrada fiscal.** Upload de XML(s) → extrair emitente → preview → gravar/atualizar papel. **Não** manifestar na SEFAZ, **não** baixar pela Focus, **não** gerar MOV/OC/estoque, **não** escriturar. Focus continua só em Hubs (BL-006) para o futuro UC-CPR-004.
3. **Parser local** de `nfeProc` / `NFe` (mod 55). Aceitar `.xml` (e ZIP com vários XML se barato). Reutilizar fixture Fedrigoni nos testes. Ignorar/avisar se destinatário (`dest/CNPJ`) ≠ CNPJ da empresa ativa (não bloquear se política permitir nota de terceiros em homolog — default: **avisar**).
4. **CNPJ já na base (unicidade):** **nunca** duplicar PAR. Se existir:
   - Já tem `papel_fornecedor` → informar “já cadastrado” + link para o cadastro; commit = no-op da linha.
   - Existe sem papel fornecedor → preview oferece **somente adicionar** `papel_fornecedor` (+ defaults de fornecedor se vazios: `tipo_fornecimento`, `cfop_entrada_padrao` opcional); demais dados do PAR **não** são sobrescritos sem ação explícita “atualizar endereço do XML” (fora do v1 — só alerta de divergência).
5. **CNPJ ausente — mapear XML → campos do cadastro** (tudo que existir no XML e o formulário pede):

   | XML | Campo PAR |
   |-----|-----------|
   | `emit/CNPJ` | `cnpj_cpf` + `tipo_pessoa=PJ` |
   | `emit/xNome` | `razao_social` (provisório) |
   | `emit/xFant` | `nome_fantasia` |
   | `emit/IE` | `ie` → deriva `ind_ie_dest` |
   | `emit/CRT` | *hint* de `regime` (fraco; ver APIs) |
   | `enderEmit/*` | logradouro, numero, complemento, bairro, municipio, uf, cep, ibge (`cMun`), telefone (`fone`) |
   | — | `papel_fornecedor=true`, `emite_documento_fiscal=true`, `tipo_fornecimento=MERCADORIA` (default editável) |
   | `det/prod/CFOP` (moda / 1º item) | sugerir `cfop_entrada_padrao` (editável; não obrigatório) |
   | `transporta` (opcional v1.1) | 2ª linha sugerida com `papel_transportadora` — **não** no aceite mínimo; pode ficar como aviso “transportadora detectada” |

   Contatos bancários, crédito, WhatsApp, e-mail comercial: **não** inventar a partir do XML.
6. **APIs — como usar (caminho oficial deste BL):**
   1. Validar dígitos do CNPJ **antes** de rede.
   2. **BrasilAPI CNPJ** (`BrasilApiClient` / `GET` interno já existente, cache 30d): preencher/preferir **razão social, fantasia, endereço sede, IBGE, CNAE, telefone, e-mail, situação RFB, regime sugerido** — fonte de verdade do cartão CNPJ.
   3. Campos do XML preenchem só o que a API **não** trouxe (fallback), ou quando a API falhar (offline/quota) — nesse caso marcar enrichment `parcial` e manter preview editável.
   4. **ViaCEP** só se CEP ok e `ibge` ainda vazio após CNPJ.
   5. **Confrontar** endereço XML × BrasilAPI: divergência material → `warnings[]` na preview (não hard-block); abreviação de logradouro/bairro = OK.
   6. **Focus:** não chamar neste BL.
   7. Cadência do domínio: 1 consulta por emitente novo / evento humano; reaproveitar cache; sem loop em lote sem throttle (limite prático: ex. ≤20 XML por commit).
7. **Fluxo UI/API (espelhar CSV):** `upload → preview (simulação) → commit`.
   - `POST /parceiros/import/xml/preview` (multipart `file` ou `files[]`)
   - `POST /parceiros/import/xml/commit` (payload das linhas ok + overrides do usuário: regime, tipo_fornecimento, cfop…)
   - Commit reutiliza `ParceiroService::create` / update mínimo de papel; audit `IMPORTAR_XML_NFE`.
   - Permissão: mesmo `parceiro.escrever`.
8. **Não estragar:** zero mudança no comportamento do modo CSV; motor/ORC/relatórios intocados; validação compartilhada (`ParceiroValidationRules` / `ParceiroFiscalRules`); incompleto fiscal continua permitido com flags de completude (como hoje).
9. **Guia PDF:** acrescentar seção “XML NF-e → Fornecedor” no guia de importação de parceiros (script `scripts/gerar_guia_importacao_parceiros.py`) na mesma entrega.

- **Objetivo:** operador sobe o XML da nota de entrada em Importar parceiros e, se o CNPJ do emitente não existir, confirma um PAR Fornecedor já pré-preenchido (XML + BrasilAPI/ViaCEP), alinhado ao estudo 32 — preparado para o dia em que Compras/Focus fechar a entrada (UC-CPR-004) sem retrabalho de cadastro.
- **Aceite:**
  - [x] Aba/modo XML na `ParceiroImportPage` sem regressão do CSV
  - [x] Preview mostra emitente, chave NF (se houver), origem dos campos (XML / BrasilAPI / override), warnings de endereço e status do CNPJ (novo / já existe / existe sem papel fornecedor)
  - [x] CNPJ novo → cria PAR com `papel_fornecedor` e campos mapeados; código `PAR-#####`
  - [x] CNPJ existente → não duplica; add papel quando faltar
  - [x] BrasilAPI chamada 1× por CNPJ novo (cache hit nas repetições); ViaCEP só se necessário
  - [x] Destinatário ≠ empresa → aviso
  - [x] Testes: parse fixture Fedrigoni; Feature preview/commit (novo + duplicado + add papel); Unit mapeamento/confrontação
  - [x] Guia PDF atualizado
- **Fora de escopo (nesta entrega):**
  - UC-CPR-004 (Focus list/download, conferência com OC, MOV, contas a pagar)
  - Atualização em massa de endereço de PAR já completo a partir do XML
  - Cadastro automático de produtos/NCM a partir dos `det`
  - NF modelo 65 / CT-e / NFS-e
  - Criação obrigatória da transportadora no mesmo commit
- **Notas técnicas:** extrator dedicado (ex. `NfeEmitenteExtractor`) + reuso de enrich do import CSV; não expor BrasilAPI/ViaCEP no browser; preferir `simplexml`/DOM PHP já disponível; opcional futuro: mesmo extractor chamado pelo adapter Focus quando Compras nascer.
- **Caminho recomendado (resumo executivo):** **Opção C** — XML como segundo modo de Importar parceiros, humano no loop, BrasilAPI como verdade do cartão CNPJ, XML como semente + alerta de divergência, Focus só depois no módulo de compras.
- **Entregue em:** 2026-08-06
- **Implementação (39):**
  - `NfeEmitenteExtractor` + `ParceiroXmlImportService` (preview/commit; BrasilAPI preferida; ViaCEP fallback IBGE; confrontação enderEmit×CNPJ)
  - API `POST /parceiros/import/xml/preview` e `/xml/commit`; audit `IMPORTAR_XML_NFE`
  - UI abas CSV | XML NF-e (Fornecedor) em `ParceiroImportPage`
  - Guia PDF §12; testes Unit/Feature (fixture Fedrigoni)

### BL-013 · [ops] Higiene computacional Relatórios IA (swap, mem_limit, células, retenção, M2)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** `docs/relatorios-ia-impacto-computacional-trigger39.txt` §8 R1/R4/R6/R7/R8 + §9 M2
- **Decisão (fechada):**
  1. Compose `mem_limit`: mysql 384m · app 192m · queue 384m · web 48m (Σ ≈ 1 GB).
  2. Teto `CELULAS_MAX=8000` no validator (linhas × colunas) antes do DomPDF.
  3. `relatorios:purgar` + schedule diário (PDF 180d / execuções 90d).
  4. `memory_peak_mb` gravado ao fim de `RelatorioService::processar` (etapa `render`).
  5. Script `scripts/lightsail-setup-swap.sh` + gatilhos de upgrade em Lightsail docs.
- **Aceite:**
  - [x] mem_limits no compose alinhados ao R7
  - [x] Spec com 10 cols × limite 1000 → limite efetivo 800
  - [x] Purge dry-run / efetivo cobertos por teste
  - [x] Coluna memory_peak_mb preenchida em render
- **Entregue em:** 2026-08-05

### BL-009 · [relatorios] Planejar → conferir → gerar (humano no loop, via fila)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** `docs/relatorios-ia-plano-profissional-trigger39.txt` + impacto computacional (Fase 2 pela fila, não síncrono)
- **Decisão (fechada):**
  1. `POST /relatorios/planejar` → 202 + `PlanejarRelatorioJob` (não bloqueia `artisan serve`).
  2. `GET /relatorios/planejamentos/{id}` com polling; UI de conferência + amostra.
  3. `POST /relatorios` aceita `spec` opcional; com spec válida o job não chama IA.
  4. Reprocessar (mesma spec) × Replanejar com IA.
  5. Throttle nas rotas de IA; flag `RELATORIO_IA_PLANEJAR_ENDPOINT`.
- **Aceite:**
  - [x] Criar sem `spec` mantém comportamento atual
  - [x] `spec` inválida → 422 antes da fila
  - [x] Planejar não bloqueia a API (fila)
- **Entregue em:** 2026-08-05

### BL-008 · [ia] Planner confiável (contexto temporal, few-shot, JSON mode, auto-correção)
- **Status:** Feito
- **Prioridade:** P1
- **Decisão (fechada):**
  1. Data/timezone/empresa/flags/limites no system prompt.
  2. Catálogo compacto por roteamento determinístico + fallback completo.
  3. `IaClient::chat($messages, $timeout, $opts)` — JSON mode com degradação.
  4. Normalização tolerante + auto-correção até 2 retentativas.
  5. Tabela `relatorio_execucoes` (prompt plaintext só com `RELATORIO_IA_LOG_PROMPT`).
- **Aceite:**
  - [x] Temperature 0.0 no planejamento; cache curto de prompt idêntico
  - [x] Provedor sem JSON mode continua no parser atual
- **Entregue em:** 2026-08-05

### BL-007 · [relatorios] Exatidão do compiler (ordenação, agregação, período, truncamento)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-05 — Relatórios IA / auditoria de exatidão
- **Decisão (fechada):**
  1. Ordenação e agregação no banco; facas filtram/ordenam antes do slice.
  2. `orcamentos.valor_primeira_faixa` materializada + backfill `chunkById(200)`.
  3. Datas normalizadas (date-only `lte`/`between` → fim do dia).
  4. ResultSet com `total_disponivel`/`truncado`; PDF declara o recorte.
  5. `count` × `count_distinct`; métrica não precisa ser coluna.
- **Aceite:**
  - [x] Ordenação por `total`/`parceiro_nome` (teste E1)
  - [x] Somatórios no universo (teste E2/E6)
  - [x] Filtro de mês inclui último dia (E4)
  - [x] PDF “Exibindo N de M”
  - [x] `RelatorioTest` existente preservado + `RelatorioExactidaoTest`
- **Entregue em:** 2026-08-05

### BL-006 · [fiscal] Cadastro de hubs fiscais (Focus NFe + tokens homolog/prod)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-05 — área de cadastro de hubs que fazem as interações com o fisco; Focus NFe conhecida; prever outros; vínculo dinâmico com o sistema
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`  
  - `CASOS_USO_M09_INTEGRACOES.txt` UC-INT-001 (Focus por empresa_id; homolog ≠ prod)  
  - `MULTI_EMPRESA_CNPJS_E_LIVROS.txt` (credenciais por empresa)  
  - `ARQUITETURA_ENGENHARIA_MELHORES_PRATICAS.txt` (adapter FocusNfeClient)  
  - `DOMINIO_SISTEMA_ERP_RLP.txt` D0.6 adapters
- **Referência (padrão 39):** BL-001 Provedores de IA (crypto + CRUD + testar + UI admin)
- **Decisão (fechada):**
  1. Entidade `fiscal_hubs` **por `empresa_id`** (não global como IA).
  2. Tokens **homologação e produção** separados, cifrados (`APP_KEY`); respostas só máscara.
  3. Provedores v1: `focusnfe` (URLs oficiais) + `generico` (URL custom).
  4. **Um hub `padrao`** por empresa — resolver runtime (`FiscalHubResolver`) para emissão futura.
  5. `ambiente_ativo` + kill-switch `ativo`; teste HTTP Basic em `/v2/empresas`.
  6. RBAC `fiscal.hubs.gerir` (ADMIN). **Sem emissão NF nesta entrega.**
- **Aceite:**
  - [x] Migration `fiscal_hubs` + código `HUB-00001` + permissions
  - [x] Crypto + FocusNfeClient + Service + Resolver
  - [x] API CRUD + testar (homolog/prod) escopada à empresa
  - [x] UI Administração → Hubs fiscais
  - [x] Testes Feature `FiscalHubTest`
- **Fora de escopo:** emissão/consulta/cancelamento NF; certificado A1 upload; webhooks Focus; SPED
- **Entregue em:** 2026-08-05

### BL-005 · [ia] Relatórios com IA (prompt → programa allowlist → PDF)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-04 — criar/gerenciar relatórios via prompt; IA gera a melhor programação segura; PDF retrato/paisagem com logo, título e rodapé
- **Referência:** provedores BL-001 (`app/Services/Ia/`), padrão CRUD/API do ORC
- **Decisão (fechada):**
  1. IA **não** gera SQL/PHP — gera `ReportSpec` JSON validado contra catálogo allowlist.
  2. Fluxo **assíncrono** (`GerarRelatorioJob` + serviço Compose `queue`).
  3. PDF via DomPDF: logo RLP, título, emissão + páginas; orientação retrato/paisagem.
  4. Fontes v1: orçamentos, parceiros, produtos, **mapa de facas** (coluna `desenho` = polígono/shape do formato ORC).
  5. RBAC `relatorio.ler` / `relatorio.escrever` (ADMIN/COMERCIAL; CONSULTA ler).
- **Aceite:**
  - [x] Migration `relatorios` + código `REL-AAAA-NNNNN` + permissions
  - [x] `IaClient::chat()` com rotação por prioridade
  - [x] Catalogo / Validator / Compiler + Planner + PDF + Job
  - [x] API CRUD + reprocessar + download + catalogo
  - [x] UI lista / novo / detalhe com polling
  - [x] Worker Compose `queue` + testes Feature/Unit
- **Fora de escopo:** gráficos, Excel, agendamento, editor visual, código executável pela IA
- **Entregue em:** 2026-08-04

### BL-004 · [comercial] Cadastro editável das bases do catálogo ORC (Papel / Acabamento / Tipo troca / Máquina G10)
- **Status:** Feito (+ extensão 2026-08-08: escalar `matriz_cm2`)
- **Prioridade:** P1
- **Origem:** Chat 2026-08-04 — manipular bases que amarram valores do cálculo sem estragar o ORC já excelente; futuro auto-carregamento
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`  
  - `GERACAO_ORCAMENTO.txt` (tabelas parametrizadas; engine só consulta)  
  - `FLEXIBILIDADE_LIMITES_CUSTOMIZACAO_ORCAMENTO.txt` (catálogo × matriz; nunca delete — inativar)  
  - `CASOS_USO_M11_PLATAFORMA.txt` UC-PLT-005 (TAB com vigência — futuro)  
  - `CODIFICACAO_INFORMACOES_SISTEMA.txt` (`TAB-*`)
- **Referência (exemplo):** trigger/28 (admin papéis + schema) / trigger/29 (`catalog_oficial.json`)
- **Decisão (fechada):**
  1. **4 bases no banco:** Papel (R$/m²), Acabamento (R$/m² + perda m²), Tipo troca produto (`tempo_h`), Máquina G10 (`hora_maquina` cores→R$/h).
  2. **Escalar promovido (2026-08-08):** `matriz_cm2` em `orc_catalogo_parametros` — ADR `docs/ADR_ORC_PARAMETROS_ESCALARES.md`. Demais (tinta, tubete, perdas acerto, caixas…) permanecem no JSON oficial.
  3. **Overlay híbrido:** DB populado → bases/escalares do DB; tabelas vazias / inativos → fallback JSON (testes e segurança).
  4. **Snapshot ORC intocado** — alterações valem só em novos cálculos.
  5. **Só inativar** (sem hard-delete); lookup inclui inativos; selects do ORC só ativos.
  6. **RBAC** `orcamento.catalogo.gerir` (ADMIN); seed idempotente via seeder + `orcamento:ensure-catalogo`.
  7. **UX:** form ORC e “Como calcula” mostram a tarifa vigente; resultado/detalhe mostram a do snapshot.
- **Aceite:**
  - [x] Migrations + models + seed do JSON oficial
  - [x] `OrcamentoCatalogo::load()` com overlay DB / fallback JSON
  - [x] API admin CRUD + audit
  - [x] UI Administração → Catálogo ORC (abas das 4 bases)
  - [x] Testes Feature `OrcamentoCatalogoTest` + motor existente preservado
  - [x] Extensão: `orc_catalogo_parametros` + aba Matriz + `metaForUi.matriz_cm2` + testes
- **Fora de escopo:** vigência/ratificação TAB completa; matriz de compatibilidade; auto-carga futura de estoque/ERP; demais escalares do JSON (exceto `matriz_cm2`)
- **Entregue em:** 2026-08-04 · extensão matriz: 2026-08-08

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
