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

`BL-068`

---

## Itens

### BL-067 · [domínio/comercial/fiscal] Separar industrialização × serviço × cessão de bem
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-18 — prestação de serviço (rebobinação, manutenção) e comodato de impressora não podem viver no mesmo bolo da NF-e de etiqueta; estudo 32; exemplo NFS-e `../21`; sem estragar industrialização
- **Depende de:** BL-044 · BL-049 · BL-051 · BL-023
- **Destrava:** Locação cobrada com TIT (depois); hora-máquina no preço do serviço (GERACAO §10.3)
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `CADASTRO_PRODUTOS_VENDA.txt` §1 / §5.6 — PA × REV × SVC; rebobinação pendente NF-e×NFS-e
  - `ORDEM_SERVICO.txt` — OS ≠ OP; sem oficina paralela
  - `GERACAO_ORCAMENTO.txt` §2 / §10.3 — tipos de ORC; serviço avulso = hora + embalagem
  - `PATRIMONIO_CONTROLE.txt` — BEM `CEDIDO`
  - `CASOS_USO_M05` UC-FIS-001 AL1
- **Referência (padrão 39):** `docs/ADR_OPERACOES_SAIDA.md` · `docs/ADR_EMISSAO_NFE_NFSE.md` · NFS-e `../21` · Focus `../28`
- **Decisão (fechada):**
  1. Três trilhos: industrialização (ORC R1–R20 → OP → NF-e); serviço (ORC comercial → OS → NFS-e Nacional); cessão (CES- no BEM, sem FAT/NF).
  2. Etiqueta que circula permanece NF-e. NFS-e 13.05 não substitui industrialização.
  3. Serviço: catálogo `REBOBINACAO`/`ACERTO`/`AVULSO`/`MANUTENCAO`; preço informado; sem faca/papel.
  4. Comodato: `documento_fiscal=NENHUM`. Locação ≠ ISS (SV 31). Manutenção cobrada = serviço.
  5. Motor R1–R20 intacto. Códigos ISS no catálogo (não hardcoded 130501 para tudo).
- **Aceite:**
  - [x] ORC de serviço sem medida/papel/cores
  - [x] PED OS + FAT TIT 1.01.03 + DFS NFS-e com cTrib do catálogo
  - [x] Comodato cede BEM, zero FAT/DFS
  - [x] Cessão no ORC é recusada (UX aponta patrimônio)
  - [x] Industrialização inalterada
- **Fora de escopo:** locação com TIT recorrente; componentes R1–R20 só-máquina; split dual PA
- **Não fazer:** NFS-e de etiqueta vendida; NF no comodato; segundo ERP de oficina
- **Entregue em:** 2026-08-18
- **Implementação (39):**
  - ADR-039-DOM-002 `docs/ADR_OPERACOES_SAIDA.md` · regra `.cursor/rules/operacoes-saida.mdc`
  - `CatalogoServicoSaida` · `OrcamentoServicoPrecificador` · `CessaoBem`
  - `PrestacaoServicoAteFaturamentoTest` · `CessaoBemTest`

### BL-066 · [estoque/fiscal] SAIDA_VENDA na NF-e Focus autorizada
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-18 — mapa de faturamento; seguir o estudo 32 sem estragar FAT/TIT/ENT/stub
- **Depende de:** BL-044 · BL-049 · BL-051 · BL-065
- **Destrava:** Cancelamento Focus com estorno de estoque (próximo); DEV-
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `ESTOQUE_FLUXO_SAIDA_RETORNO_PA.txt` §4.3 / §5 — NF-e autorizada → MOV `SAIDA_VENDA` (PA ou REV)
  - `MAPA_FATURAMENTO_EXPLICADO.txt` §8 — baixa PA/REV no evento de autorização; rejeição não baixa
  - `FATURAMENTO_GERACAO_COBRANCA.txt` §3 — só NF autorizada baixa estoque
  - `CASOS_USO_M05` UC-FIS-001 — pós-condição de autorização
- **Referência (padrão 39):** `docs/MAPA_FATURAMENTO.md` · `docs/ADR_EMISSAO_NFE_NFSE.md` · `EstoqueSaldoWriter`
- **Decisão (fechada):**
  1. Baixa **somente** `DocumentoFiscalSaida` `AUTORIZADO` origem `FOCUS` tipo NFE. Stub, prévia, NFS-e e rejeição **não** mexem em saldo.
  2. MOV `SAIDA_VENDA` via `EstoqueSaldoWriter`. 1 MOV por DFS (idempotente). Liga `pedido_id` + `faturamento_id` + `documento_fiscal_saida_id` + chave 44.
  3. Quantidade = linha de produto do FAT (`qtde_faturavel`). Matriz/clichê e faca nova **não** baixam.
  4. SKU = `pedido_itens.produto_pa_id` (PA; REV quando houver SKU). Sem SKU: aviso, não bloqueia FAT, não inventa produto.
  5. Saldo insuficiente / SKU congelado: **bloqueia o POST Focus** (checklist). Se a NF já autorizou (consultar assíncrono): não desfaz a nota; registra mensagem; sem segundo MOV.
  6. FAT/TIT/COB/ENT intactos. Estorno comercial continua bloqueado com NF oficial.
- **Aceite:**
  - [x] Focus autoriza NFE com PA em saldo → `SAIDA_VENDA` + saldo desce a qtde faturada
  - [x] Stub / prévia / NFS-e → zero MOV
  - [x] Retry / consultar → 1 MOV
  - [x] Promoção STUB→Focus → baixa só na promoção
  - [x] Matriz/faca não somam quantidade
  - [x] Sem SKU: FAT e NF seguem; sem MOV
  - [x] Saldo insuficiente bloqueia emissão, não o FAT
  - [x] EMP isolada (MOV na EMP do DFS; testes de NF/FAT existentes)
- **Fora de escopo:** cancelamento Focus; estorno de `SAIDA_VENDA`; DEV-; lote de PA; faturamento parcial
- **Não fazer:** baixar no FAT; baixar no stub; inventar SKU; desfazer NF porque faltou saldo depois da autorização
- **Entregue em:** 2026-08-18
- **Implementação (39):**
  - `EstoqueSaidaVendaService` · `estoque_movimentos.documento_fiscal_saida_id` / `faturamento_id`
  - Hook em `EmissaoFiscalService::aplicarResultado`
  - Checklist bloqueia POST se SKU sem saldo
  - `SaidaVendaNfAutorizadaTest`

### BL-065 · [fiscal] Emissor de teste sem A1 (stub local, hub sempre ganha)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-18 — sem certificado A1 no hub Focus e sem upload no ERP; completar o fluxo NF no teste local com chaves sintéticas; não atrapalhar quando A1/hub estiver ok (local, homolog, produção); estudo 32; sem estragar
- **Depende de:** BL-051 · BL-052 · BL-053 · BL-006
- **Destrava:** UAT do pipeline FAT→DFS→DANFE sem A1; promoção à autorização Focus na mesma `ref`
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `HOMOLOGACAO_ERP_RLP.txt` H0.2 / 2.1 / R-HML-02 — DEV = mock; HML = Focus homolog + A1 homolog; PROD = Focus prod
  - `CASOS_USO_M05_FISCAL.txt` UC-FIS-001/005 — numeração só da SEFAZ via Focus; A1 por empresa_id no hub
  - `ESPECIFICACAO_SOFTWARE_ERP_RLP.txt` RF-FAT-01 — não inventar numeração SEFAZ
  - `CASOS_USO_M09_INTEGRACOES.txt` UC-INT-001 — homolog ≠ prod
- **Referência (padrão 39):** `BANK_PROVIDER=mock` · `docs/ADR_EMISSAO_NFE_NFSE.md` · BL-006 (A1 fora do ERP)
- **Decisão (fechada):**
  1. A1 continua na Focus, não no FLEXOERP. Sem upload de certificado.
  2. `FISCAL_EMISSOR=stub` só em `ERP_STAGE=local|testing`. Homolog e production ignoram o flag.
  3. Hub Focus apto **sempre ganha**. Stub só na ausência do hub.
  4. Stub grava `autorizacao_origem=STUB`, protocolo `SIM-`, chave 44 com DV (tpEmis=9). Sem XML `nfeProc`. `oficial=false`.
  5. Mesma `ref`: quando o hub ficar apto, emitir-nf promove STUB → FOCUS (substitui numeração).
  6. Estorno e estoque PA: stub não trava / não baixa. Focus autorizado continua a regra atual.
- **Aceite:**
  - [x] Policy bloqueia homolog/production
  - [x] Sem hub + stub: AUTORIZADO STUB, chave, pode estornar
  - [x] Hub apto: Focus, stub morto
  - [x] Promoção mesma ref
  - [x] Testes existentes sem hub continuam PLANEJADO (phpunit `FISCAL_EMISSOR=focus`)
- **Fora de escopo:** upload A1; XML `nfeProc`; baixa PA; Focus homolog sem certificado
- **Não fazer:** fingir autorização SEFAZ; stub em homolog/prod; chave oficial sem origem STUB
- **Entregue em:** 2026-08-18
- **Implementação (39):**
  - `FiscalEmissorPolicy` · `FiscalEmissorStub` · `NfeChaveAcesso`
  - `documento_fiscal_saidas.autorizacao_origem`
  - `FISCAL_EMISSOR` em `.env` / Compose

### BL-064 · [financeiro] Carteira operacional (aging + ficha + BX completa + avulso)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-18 — melhorar o financeiro no padrão do sistema; estudo 32; sem estragar TIT/COB/BX
- **Depende de:** BL-021 · BL-032 · BL-033 · BL-035 · BL-049 · BL-061 · BL-063
- **Destrava:** DRE M10 (depois); conciliação OFX; juros/desconto/perda; estorno de BX
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `CASOS_USO_M06_FINANCEIRO.txt` UC-FIN-005/006
  - `RECEBIMENTO_BAIXA_COBRANCA.txt` §3–5, §7, §9
  - `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt`
  - `CASOS_USO_M10_GERENCIAL.txt` — DRE é outra tela
- **Referência (padrão 39):** `docs/ADR_NATUREZAS_GERENCIAIS.md` · `docs/ADR_FATURAMENTO_COBRANCA.md` · Painel (KPI receber/pagar)
- **Decisão (fechada):**
  1. Espinha TIT/COB/BX intacta. Carteira = aging + ficha + forma na BX + lançamento pontual.
  2. Faixas: a vencer / vence hoje / 1–30 / 31–60 / 61–90 / 90+. UI padrão em aberto.
  3. Previsão operacional = receber − pagar em aberto. Não é DRE.
  4. Avulso (`origem=AVULSO`) para o que não nasce de FAT/OC/CFE. NAT reservadas bloqueadas.
  5. Cancelar avulso só ABERTO sem BX. Nunca apagar.
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] GET `/titulos` com situacao/faixa + meta aging/previsão
  - [x] POST avulso + cancelar; forma canônica na BX
  - [x] UI unificada receber/pagar (aging, ficha, baixa, lançamento)
  - [x] Painel aterra na faixa vencida
  - [x] Testes: aging, avulso, NAT reservada, SoD, EMP, regressão listagem
- **Fora de escopo:** DRE; WhatsApp; OFX/CNAB; juros/desconto/perda; estorno de BX; TIT de frete
- **Não fazer:** bypass FAT/OC/COM via avulso; LAI; fingir DRE no financeiro
- **Entregue em:** 2026-08-18
- **Implementação (39):**
  - ADR-039-FIN-002 `docs/ADR_CARTEIRA_FINANCEIRA.md` · regra `.cursor/rules/carteira-financeira.mdc`
  - `TituloAging` + `TituloService` carteira/avulso · UI `TitulosCarteiraPage`

### BL-063 · [plataforma/ux] Painel = cockpit gerencial da EMP (não sitemap)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-16 — Painel organizado como dashboard gerencial; bloco de identidade enxuto; remover Prioridades; estudo 32; sem estragar
- **Depende de:** — (read model sobre módulos já existentes)
- **Destrava:** —
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `INDICE_FLUXO_OPERACIONAL.txt` — cadeia ORC→PED→OP→FAT→ENT→BX
  - `CASOS_USO_M11_PLATAFORMA.txt` — home conforme perfil; EMP do contexto
  - `CASOS_USO_M10_GERENCIAL.txt` — DRE interno é outra tela; Painel **não** finge DRE
- **Referência (padrão 39):** `docs/MODELO_INSTALACAO_MULTI_EMPRESA.md` §6 · `docs/IDENTIDADE_TRIGGER.md` (EMP ≠ marca)
- **Decisão (fechada):**
  1. Menu lateral permanece o catálogo. Painel não duplica atalhos por área (Prioridades sai).
  2. Identidade produto/licenciado/TRIGGER fica no shell. Painel só EMP ativa + perfil + flags venda/estoque.
  3. Um GET `/painel` por EMP: cadeia (contagens/saldos) + filas (só o que pede ação). RBAC omite o bloco; isolamento por `empresa_id`.
  4. Sem DRE/SPED no home. Sem N chamadas de listagem na SPA.
- **Aceite:**
  - [x] Faixa compacta EMP + flags; sem cards de produto/licenciado
  - [x] Sem seção Prioridades
  - [x] KPIs da cadeia + Atenção; 403/isolamento por EMP
  - [x] Perfil comercial não vê financeiro/produção
- **Fora de escopo:** DRE M10; gráficos; ranking de vendedor; mapa de facas no home
- **Não fazer:** voltar sitemap no Painel; tratar EMP como marca; inventar indicadores sem documento
- **Entregue em:** 2026-08-16
- **Implementação (39):**
  - `PainelService` + `GET /api/v1/painel` + `PainelTest`
  - `DashboardPage` + CSS do cockpit

### BL-062 · [qualidade] Homologação E2E ORC → COM PAGA sem A1/hub
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-16 — teste completo do orçamento até baixa e pagamento da comissão; certificado A1 ainda não entra; estudo 32; sem estragar
- **Depende de:** BL-044 · BL-049 · BL-051/052 · BL-060 · BL-061
- **Destrava:** —
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `INDICE_FLUXO_OPERACIONAL.txt` — cadeia ORC→PED→OP→FAT→ENT→BX
  - `HOMOLOGACAO_ERP_RLP.txt` H0.1 / H0.2 / 6.1 — homologar o fluxo; Focus homolog ≠ prod; sem A1 não inventar NF
  - `COMISSOES_VENDEDORES_DETALHADO.txt` — COM- na BX, CFE-, TIT 3.01.05
  - `FATURAMENTO_GERACAO_COBRANCA.txt` · `ENTREGA_CONFIRMACAO_CLIENTE.txt` · `RECEBIMENTO_BAIXA_COBRANCA.txt`
- **Referência (padrão 39):** BL-052 prévia sem hub · BL-061 COM- · canário BRAHVA
- **Decisão (fechada):**
  1. Cadeia feliz automatizada via API real (motor BRAHVA + vendedor 3%), sem atalho de fixture no meio.
  2. Sem hub/A1: FAT + TIT/COB + DocumentoFiscalSaida `PLANEJADO` (prévia). Zero chave/número/XML falso.
  3. Ordem canônica: ORC → aceite (crédito OK) → PED → OP → FAT → ENT balcão → BX receber → COM PREVISTA → CFE → TIT PAGAR 3.01.05 → BX → COM PAGA.
  4. Provas de fronteira no mesmo roteiro: matriz fora da base; ENT não gera COM; PRODUÇÃO não fatura; COMERCIAL não fecha CFE.
  5. Seed: vendedor demo `PAR-00011` (3%) + contato autorizador no cliente exemplo — para UAT na UI, sem mudar o motor.
- **Aceite:**
  - [x] Feature `OrcamentoAteComissaoE2ETest` ponta a ponta
  - [x] Sem hub: `nf_status=PENDENTE`, DFS `PLANEJADO`, chave nula
  - [x] COM só na BX; paga após CFE+TIT+BX; natureza 3.01.05
  - [x] Seed vendedor + contato (idempotente)
- **Fora de escopo:** upload A1; mock Focus AUTORIZADO; XML `nfeProc` forjado; TMS; DEV-
- **Não fazer:** inventar NF autorizada para “completar” o teste; pular OP/ENT; pagar comissão no faturar
- **Entregue em:** 2026-08-16
- **Implementação (39):**
  - `apps/api/tests/Feature/OrcamentoAteComissaoE2ETest.php`
  - `DatabaseSeeder::seedCliente` — `PAR-00011` vendedor + contato no `PAR-00010`

### BL-061 · [comercial/financeiro] Vendedor no ORC + COM- sobre o recebido
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-16 — vendedores já no PAR; colocar no orçamento com comissão; fechar para pagar a partir da baixa do cliente; entrega no transporte segue ENT- + BX negociada; estudo 32; sem estragar
- **Depende de:** BL-049 · BL-050 · BL-060
- **Destrava:** —
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `COMISSOES_VENDEDORES_DETALHADO.txt` — base RECEBIDO, COM-, fechamento, natureza 3.01.05
  - `GERACAO_ORCAMENTO.txt` §3.1 — vendedor define %
  - `RECEBIMENTO_BAIXA_COBRANCA.txt` — BX ≠ entrega
  - `CASOS_USO_M06` UC-FIN-008
  - `ENTREGA_CONFIRMACAO_CLIENTE.txt` — eixos distintos
- **Referência (padrão 39):** PAR `papel_vendedor` / `comissao_percentual` / `vendedor_parceiro_id`; motor ORC já usa `comissao_pct` na formação do preço; TIT/BX e ENT- já existem
- **Decisão (fechada):**
  1. Vendedor no ORC (FK + snapshot). Prefill do cliente; % do cadastro nas faixas; alíquota paga = % da faixa aceita.
  2. Base RECEBIDO: COM- na BX do TIT da venda (etiquetas; sem frete/ferramental). Sinal só na apropriação do FAT.
  3. Ciclo PREVISTA → CFE- LIBERADA → TIT PAGAR 3.01.05 → PAGA. 1 vendedor por ORC.
  4. ENT- intacto: transporte confirma entrega; baixa segue a condição; comissão não nasce no romaneio.
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] Migration COM/CFE + vendedor no ORC/PED + permissões
  - [x] ORC/PAR UI vendedor; apuração na BX; fechamento + TIT
  - [x] Painel no PED; tela Comissões
  - [x] Testes: BX, sinal, sem vendedor, SoD, EMP, residual, estorno FAT
- **Fora de escopo:** rateio multi-vendedor; base FATURADO; meta; DEV-; extrato só-meu
- **Não fazer:** auto-COM no faturar/ENT; relêr PAR depois do snapshot; incluir frete na base
- **Entregue em:** 2026-08-16
- **Implementação (39):**
  - ADR-039-COM-001 `docs/ADR_COMISSAO_VENDEDOR.md` · regra `.cursor/rules/comissao-vendedor.mdc`
  - `Comissao` + `ComissaoFechamento` + `ComissaoService` · rotas `/comissoes*` · UI `/financeiro/comissoes`

### BL-060 · [expedição/logística] ENT- após faturar (balcão × transporte + confirmação)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-16 — produto na expedição, nota e cobrança já geradas; organizar retirada no balcão × transporte, confirmar entrega e seguir baixa conforme negociado; estudo 32; sem estragar
- **Depende de:** BL-049 · BL-051/052 · BL-058
- **Destrava:** —
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `ENTREGA_CONFIRMACAO_CLIENTE.txt` — ENT-, modos, confirmação, eixos distintos
  - `FRETE_TRANSPORTADORAS.txt` — sem TMS; transportadora = PAR
  - `GERACAO_PEDIDO.txt` §4 — `EM_ENTREGA` / `ENTREGUE` / `ENCERRADO`
  - `RECEBIMENTO_BAIXA_COBRANCA.txt` §5 — BX não é confirmação de entrega
  - `CASOS_USO_M06` UC-FIN-010 · `DECISAO_MODELO_DOMINIO` §5.1 · RN-10
- **Referência (padrão 39):** FAT/TIT já nascem no faturar; modo `RETIRAR`/`ENTREGAR` no snapshot ORC; Contas a receber já baixa TIT
- **Decisão (fechada):**
  1. Agregado `ENT-AAAA-NNNNN` no módulo `expedicao/` — não dentro de TIT.
  2. Fila = PED `FATURADO`. Expedir gera ENT vigente (1 por PED). `RETIRAR` → aguarda no balcão; `ENTREGAR` → frota/transportadora/outro em trânsito.
  3. Confirmar com prova mínima (nome no balcão; canhoto/rastreio/obs no transporte) → PED `ENTREGUE`.
  4. TIT intactos; CTA para Contas a receber se saldo aberto. `ENCERRADO` só com entrega ok + receber quitado.
  5. Política NF antes de expedir = SIM: sem hub a prévia basta; hub apto exige autorizada.
  6. Recusa/cancelamento histórico; PED volta a `FATURADO`. Estorno FAT bloqueado após expedir.
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] Migration ENT + permissões `expedicao.*` + status PED
  - [x] API preview/expedir/confirmar/recusar/cancelar + fila
  - [x] UI Expedição + card no PED + romaneio imprimível
  - [x] Testes: balcão, transporte, SoD, NF, EMP, encerrar, estorno bloqueado
- **Fora de escopo:** TMS; CT-e; WhatsApp; foto; parcial; DEV-; baixa PA no ENT
- **Não fazer:** auto-baixa na confirmação; romaneio no TIT; expedir sem FAT
- **Entregue em:** 2026-08-16
- **Implementação (39):**
  - ADR-039-EXP-001 `docs/ADR_ENTREGA_EXPEDICAO.md` · regra `.cursor/rules/expedicao-entrega.mdc`
  - `Entrega` + `EntregaService` · rotas `/entregas*` · UI `/expedicao`



### BL-059 · [cadastros] CEP multi-fonte (completar campos que uma API omite)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-14 — ViaCEP/BrasilAPI nem sempre devolvem logradouro/bairro/IBGE; estudo 32; sem estragar
- **Depende de:** BL-055 (contrato ViaCEP + geo opt-in)
- **Destrava:** —
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `APIS_FREE_CONSULTA_CADENCIA.txt` §3.2 / §6.3 / §7.6 / §8 — Tipo A, cache, fallback em cadeia, nunca crawling, nunca API no browser
  - `CADASTRO_PARCEIROS.txt` — IBGE obrigatório na NF-e; endereço é sugestão (Salvar confirma)
- **Referência (padrão 39):** `GET /consulta/cep` + `api_cache` TTL 90d; aba Endereço PAR/EMP; prospect rápido; XML IBGE via CEP
- **Decisão (fechada):**
  1. ViaCEP **permanece** o contrato (logradouro, bairro, localidade, UF, IBGE). BrasilAPI CEP v2 **não** entra no endereço — continua só geo (BL-055).
  2. Se ViaCEP estiver completo (rua + bairro + município + UF + IBGE) → para. Cadência: 1 req.
  3. Se falhar ou omitir campo → **um** round paralelo: BrasilAPI CEP v1 (rua) + OpenCEP (IBGE). Merge **só preenche vazio**; nunca sobrescreve ViaCEP.
  4. Cache `cep:{cep}` do **resultado mesclado**. Cache legado incompleto (só ViaCEP) reconsulta **uma** vez. Falha de rede não é cacheada.
  5. CEP genérico (só cidade) continua 200; operador completa rua. Todas as APIs fora → 502; inexistente → 422. Cadastro nunca trava.
  6. Backend only. Timeout 5s. UX: não apagar campo já digitado; aviso discreto se rua/IBGE ainda vazios.
  7. **ViaCEP canônico** `GET https://viacep.com.br/ws/{cep}/json/` — primária do CEP; se cair, entra de novo no round de fallback. **Consultar CNPJ** (estudo 32 §7.1): 1 CEP (ViaCEP em cadeia) só se o cartão omitir IBGE/rua; não sobrescreve RFB; falha de CEP não derruba o CNPJ.
- **Aceite:**
  - [x] `CepLookupService` + `BrasilApiClient::getCep` delega (call sites intactos)
  - [x] Completa IBGE/logradouro quando a primária omite
  - [x] Geo/rota intactos; ViaCEP completo não chama fallback
  - [x] Testes: completo, merge, primária fora, 502, 422, cache, legado, CEP genérico
- **Fora de escopo:** geo; crawling; tabela IBGE local; chave paga
- **Não fazer:** expor provedor no browser; substituir ViaCEP quando ele já tem o dado; misturar lat/lng no endereço
- **Entregue em:** 2026-08-14
- **Implementação (39):**
  - `CepLookupService` · config `erp.cep` · `ConsultaCepFallbackTest`
  - PAR / EMP / prospect: `patchEnderecoFromCep` + `mensagemCepImportado`

### BL-055 · [cadastros] Lat/lng do parceiro (API free, evento humano)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-13 — distância de carro EMP→PAR; um botão; estudo 32; sem estragar
- **Depende de:** —
- **Destrava:** BL-056
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `APIS_FREE_CONSULTA_CADENCIA.txt` §3.2 / §6 / §8 — Tipo A, cache, nunca crawling, nunca API no browser
  - `CADASTRO_PARCEIROS.txt` — endereço fiscal NF-e; entrega à parte (BL-022)
  - UC-CAD-006 — consulta CNPJ/CEP com cache; falha não trava o save
- **Referência (padrão 39):** `GET /consulta/cep` + `BrasilApiClient` + `api_cache` (ViaCEP, TTL 90d); aba Endereço do PAR; botão Consultar CNPJ (preenche, Salvar confirma)
- **Decisão (fechada):**
  1. Fonte de B = **endereço cadastral** (CEP já na tela), não GPS do aparelho.
  2. ViaCEP **permanece** dono de logradouro/IBGE (NF-e). BrasilAPI CEP v2 **só** enriquece `latitude`/`longitude` (`location.coordinates`).
  3. Colunas `latitude`/`longitude` (decimal) em `parceiros`. Opcional nas linhas de `parceiro_enderecos_entrega` (mesmo serviço; lista vazia = fiscal).
  4. Um botão na aba Endereço: **“Posição e distância”** — nesta BL só o passo 1 (captura B). Passo 2 (km) entra na BL-056 no **mesmo** botão.
  5. Botão preenche campos; **Salvar** do PAR confirma. Sem save implícito. Sem mapa na v1.
  6. Cache `api_cache` chave `cep_geo:{cep}`; TTL 90d. Backend only. Timeout 5–8s. Falha → lat/lng vazios, save livre.
- **Aceite:**
  - [x] Migration PAR (+ entrega opcional) + DTO
  - [x] Consulta geo no `BrasilApiClient` / `GET /consulta/cep` enriquecido (sem quebrar ViaCEP/IBGE)
  - [x] Botão na aba Endereço; permissão `parceiro.escrever`
  - [x] Testes: hit de cache, CEP sem ponto, falha API não bloqueia save, EMP isolation
- **Fora de escopo:** km de carro; openrouteservice; GPS; mapa; motor ORC; frete; origem EMP
- **Não fazer:** expor BrasilAPI no frontend; substituir ViaCEP; crawlear CEP; travar cadastro
- **Entregue em:** 2026-08-13
- **Implementação (39):**
  - `BrasilApiClient::getCepGeo` + `GET /consulta/cep/{cep}?geo=1` (opt-in; default ViaCEP intacto)
  - Colunas `latitude`/`longitude` em `parceiros` e `parceiro_enderecos_entrega`
  - Botão **Posição e distância** nas abas Endereço e Entrega; Salvar confirma
  - `ConsultaCepGeoTest`

### BL-056 · [cadastros] Km de carro EMP (origem fixa) → PAR
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-13 — ponto A fixo na planta; ponto B no PAR; OSM de verdade; estudo 32
- **Depende de:** BL-055
- **Destrava:** BL-058
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `APIS_FREE_CONSULTA_CADENCIA.txt` — Tipo A, cache, chave no backend, 429/backoff
  - `FRETE_TRANSPORTADORAS.txt` — isto **não** é TMS; só distância estimada
- **Referência (padrão 39):** mesmo botão da BL-055; origem na **EMP** (não `parametros_empresa`); `X-Empresa-Id`
- **Decisão (fechada):**
  1. Ponto A = origem operacional da EMP (`origem_latitude` / `origem_longitude` no cadastro da empresa). Ex. planta `-18.9219, -48.2943`. Não hardcoded.
  2. Rota = **openrouteservice** `driving-car`. **Proibido** `router.project-osrm.org` (demo).
  3. Mesmo botão: **1)** B (BL-055) → **2)** só se B ok, A→B de carro. Grava `distancia_km`, fonte, data, `distancia_empresa_id` (km é EMP×B, não atributo universal do PAR).
  4. Cache por A+B. Quota humana. Se rota falhar: lat/lng ficam; km = “—”.
  5. UI: *“2,4 km de carro (OpenStreetMap)”*. Sem mapa. Ficha PAR: linha discreta se houver km da EMP atual.
- **Aceite:**
  - [x] Origem A na EMP + km no PAR (com EMP que calculou)
  - [x] Cliente ORS no backend (chave env); timeout; cache; atribuição OSM
  - [x] Botão em sequência 1→2; EMP-00002 não herda km da EMP-00001
  - [x] Testes: sem A, sem B, 429, cache hit, isolamento EMP
- **Fora de escopo:** catálogo R$/km; wizard ORC; NF; GPS; OSRM demo; Nominatim em produção
- **Não fazer:** chamar rota na listagem ou a cada abertura de tela; km sem EMP
- **Entregue em:** 2026-08-13
- **Implementação (39):**
  - Origem operacional `origem_latitude`/`origem_longitude` no cadastro da EMP (aba Operação); seed EMP-00001 planta `-18.9219, -48.2943`
  - `OpenRouteServiceClient` `driving-car` (chave `ORS_API_KEY`); cache `ors_drive:{A}:{B}` 90d; 429 sem retry
  - `GET /consulta/cep/{cep}?geo=1&rota=1` — passo 1 B, passo 2 A→B só se B ok
  - `distancia_km` + fonte + data + `distancia_empresa_id` no PAR e na entrega; Salvar confirma
  - Mesmo botão **Posição e distância**; ficha: linha discreta se houver km da EMP atual
  - `ConsultaRotaCarroTest`

### BL-057 · [comercial] Catálogo ORC — faixas de peso (R$/km dinâmicas)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-13 — até X kg = R$/km; campos dinâmicos; perfil etiqueta em rolo; estudo 32
- **Depende de:** — (pode em paralelo a BL-055/056)
- **Destrava:** BL-058
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `GERACAO_ORCAMENTO.txt` §1.1–1.2 — parâmetro cadastrado, nunca R$ solto no cálculo
  - `GERACAO_ORCAMENTO.txt` §4.11 — caixa 1″=20 rolos / 3″=12 rolos
  - `FRETE_TRANSPORTADORAS.txt` §3 — tabela, mínimo; não TMS
  - `FLEXIBILIDADE_LIMITES_CUSTOMIZACAO_ORCAMENTO.txt` — catálogo N linhas; liberdade zero para inventar
  - `ADR_ORC_PARAMETROS_ESCALARES.md` — tarifa ORC ≠ `parametros_empresa`
- **Referência (padrão 39):** Catálogo ORC abas Papel/Acabamento (CRUD linhas, `orcamento.catalogo.gerir`); **não** `orc_catalogo_parametros` (escalar único)
- **Decisão (fechada):**
  1. Nova aba **Frete**: tabela filha de faixas **dinâmicas** (adicionar / inativar / reordenar). Não hardcode de 5 inputs.
  2. Política recomendada no seed (kg já recortados, **R$ vazio**, inativas até o comercial preencher): **20 / 50 / 100 / 200 kg + acima**. N livre; dia 1 = essas 5.
  3. Colunas por faixa: `kg_ate`, `preco_por_km`, `minimo_rs`, `ativo`, `ordem`. Contínuas, sem furo. “Acima” = último `kg_ate` nulo; R$ vazio = sob consulta (não sugere).
  4. Fórmula (usada na BL-058): `máximo(mínimo, preco_por_km × km)`, arredonda para cima (§1.6).
  5. Escalar auxiliar na mesma aba: `peso_caixa_kg` (estimativa de carga = `qtde_caixas` × este peso) — sem campo livre de kg no wizard.
  6. Sem matriz km×kg. Sem seed de preço inventado.
- **Aceite:**
  - [x] Tabela + CRUD + aba Frete no Catálogo ORC
  - [x] Seed 5 faixas de kg sem R$; seed não sobrescreve edição
  - [x] Validação: faixas contínuas; `preco_por_km`/`minimo` com `PadraoDecimal`
  - [x] Testes admin + permissão `orcamento.catalogo.gerir`
- **Fora de escopo:** lookup no ORC (BL-058); CUB; CEP; transportadora; natureza 1.01.05; motor R1–R20
- **Não fazer:** misturar em `parametros_empresa`; campo R$ no wizard; 10 degraus estilo Correios no seed
- **Entregue em:** 2026-08-13
- **Implementação (39):**
  - Tabela `orc_catalogo_faixas_frete` + model `OrcCatalogoFaixaFrete`
  - Seed 20/50/100/200 kg + acima, R$ vazio, inativas; `peso_caixa_kg` na mesma aba (escalar em `orc_catalogo_parametros`)
  - CRUD `GET/POST /orcamento-catalogo/faixas-frete` · `PUT .../{faixaFrete}` · permissão `orcamento.catalogo.gerir`
  - Aba Frete no Catálogo ORC; seed não sobrescreve edição
  - `OrcamentoCatalogoTest`

### BL-058 · [comercial] ORC — Retirar no local × Entregar (frete estimado no fechamento)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-13 — retira ignora cálculo; entregar = faixa R$/km × km do destino; ao final do preço; estudo 32
- **Depende de:** BL-056 · BL-057
- **Destrava:** —
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `GERACAO_ORCAMENTO.txt` §1.3 snapshot · §1.5 interno ≠ CONSOLIDADO · §1.6 arredonda para cima · §6 “condições de pagamento e frete”
  - `FRETE_TRANSPORTADORAS.txt` — Cliente retira | frota | transportadora; frete cobrado ≠ pago
  - `GORDURA_ORCAMENTO_COMPENSA_OU_NAO.txt` — não esconder no papel
  - `CADASTRO_PARCEIROS.txt` + BL-022 — entrega padrão do PAR; sem snapshot ORC/PED nesta BL
- **Referência (padrão 39):** wizard já excelente; fechamento como **matriz** (linha à parte, não no unitário); `input_snapshot` / `result_snapshot`; chip ao lado do parceiro
- **Decisão (fechada):**
  1. No ORC, opção **Retirar no local** | **Entregar**. Padrão = **Retirar** (não inflar). Retirar → frete R$ 0; km pode aparecer só como contexto.
  2. **Entregar** → ao **fechamento** (não no motor R1–R20): peso est. da faixa (`qtde_caixas` × `peso_caixa_kg`) escolhe a faixa de kg vigente → `máximo(mínimo, R$/km × km)`. Destino = lat/lng da **entrega principal** se houver; senão **fiscal** do PAR. Km = o gravado na BL-056 para a EMP atual (sem nova chamada ORS no calcular).
  3. Peso (e portanto a faixa de R$/km) **pode diferir por faixa de quantidade**. Km é o mesmo. Matriz continua uma vez. Frete **não** entra no unitário da etiqueta.
  4. Sem km, sem faixa, sem peso_caixa, ou “acima” sem tarifa → não inventa; frete “—” e Entregar não soma. ORC calcula igual hoje.
  5. Snapshot: modo, km, destino (fiscal|entrega), kg est., faixa, tarifa, mínimo, R$ por faixa de qtd. Mudar catálogo depois **não** altera ORC gravado (§1.3).
  6. Proposta cliente (§6): linha Frete estimado se Entregar; sem R$/km na composição interna. CONSOLIDADO público: valor, não fórmula.
  7. ADR curto na execução (`docs/ADR_ORC_FRETE_ESTIMADO.md`).
- **Aceite:**
  - [x] ADR + opção Retirar/Entregar no wizard (fechamento)
  - [x] Lookup catálogo + km do PAR da EMP; linha no resultado / ficha interna
  - [x] Retirar = 0; Entregar sem dados = não soma; motor R1–R20 inalterado
  - [x] Snapshot auditável; EMP isolation; testes Feature
- **Fora de escopo:** NF modalidade/CIF Focus; natureza 1.01.05; TIT de frete; CUB; CT-e; recálculo de rota no ORC; campo R$ livre; gordura; transportadora
- **Não fazer:** três chamadas ORS; diluir frete no papel/hora-máquina; default Entregar
- **Entregue em:** 2026-08-13
- **Implementação (39):**
  - ADR-039-ORC-005 `docs/ADR_ORC_FRETE_ESTIMADO.md` · regra `.cursor/rules/orc-frete-estimado.mdc`
  - `OrcamentoFreteEstimadoService` pós-motor; `PadraoDecimal::roundCeil`; default RETIRAR
  - Wizard Retirar/Entregar; resultado / ficha / proposta (CONSOLIDADO: valor, não R$/km)
  - Snapshot `input.modo_entrega` + `result.frete`; catálogo novo não altera ORC gravado
  - `OrcamentoFreteEstimadoTest` · canário BRAHVA 3090 intacto
- **Emenda 2026-08-15:** Entregar → origem **Calculada** (padrão, catálogo) | **Manual** (um R$ da proposta, igual em todas as quantidades, sem exigir km). Snapshot `origem_frete` + `valor_frete_manual`. CONSOLIDADO não vaza origem. R$ solto sem origem explícita continua proibido.

### BL-054 · [produção/estoque] Rastreio de insumos após produzir (lote + NF + fornecedor)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-13 — depois de produzir, rastrear corretamente todos os insumos (lote, notas) mesmo com o PA já no cliente, para reportar ao fornecedor; estudo 32; sem estragar
- **Referência:** `docs/ADR_RASTREIO_INSUMOS_PRODUCAO.md` · `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_ESTOQUE_LOTE_VALIDADE.md` · `../32` CONTROLE_ESTOQUE §6 · CONCLUSAO_PRODUCAO §2 · POS_VENDA_RMA §1–5 · UC-EST-001
- **Decisão:** Genealogia **composta** dos MOV oficiais (`SAIDA_PRODUCAO.lote_id` → `ENTRADA_COMPRA` até o instante da saída). Sem tabela nova, sem lote de PA, sem RMA. Busca OP/PED/lote/NF/cliente; ficha A4 para o fornecedor; SKU sem lote não inventa origem; lote misto lista todas as NFs.
- **Aceite:**
  - [x] ADR + emendas lote/OP + regra Cursor
  - [x] `RastreioInsumosService` + `GET /rastreio` (busca, OP, PED, lote)
  - [x] Painel na OP e no PED + busca Produção → Rastreio
  - [x] Ficha impressa (OP/PED/lote)
  - [x] Testes: NF+lote, tempo, lote misto, EMB sem rastro, busca, EMP
- **Fora de escopo:** RMA; lote de PA; etiqueta de rolo; FIFO de custo; CQ
- **Entregue em:** 2026-08-13

### BL-053 · [fiscal] Impressão da nota (DANFE / DANFSe) sem hub
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-13 — imprimir a **nota** (NF-e e, no mesmo caminho, NFS-e) mesmo sem hub, em homologação e produção; não a ficha cadastral do ERP
- **Referência:** `docs/ADR_EMISSAO_NFE_NFSE.md` · layout `../28` (`danfe.ts` / `danfse-v2.ts`) · exemplo `../32/nfe_venda` · rota satélite `fichaNav` + `window.print`
- **Decisão:** HTML A4 retrato no visual DANFE (canhoto, emitente, chave, destinatário, duplicatas, impostos, transporte 9, itens) e DANFSe (prestador, tomador, discriminação). Sem hub: número/série/chave/protocolo = **—**; marca **PRÉVIA SEM VALOR FISCAL**. Homologação autorizada: selo SEFAZ de homologação. DomPDF fora. Mesma `ref` no retry.
- **Aceite:**
  - [x] `DocumentoFiscalFichaSheet` layout DANFE / DANFSe + `DocumentoFiscalFichaPage`
  - [x] Rota satélite `/financeiro/faturamentos/:id/nf/:docId/ficha`
  - [x] Botão “Imprimir nota” na prévia (FAT e PED)
  - [x] Prévia API com endereço emitente / duplicatas / CSOSN
- **Fora de escopo:** DomPDF; XML/`nfeProc` e DANFE oficiais do Focus; barcode/QR de chave falsa; e-mail da nota
- **Entregue em:** 2026-08-13

### BL-052 · [fiscal] Prévia da NF-e/NFS-e sem hub (JSON Focus, sem XML falso)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-13 — não cadastrar hub homolog/prod agora; ver notas e conteúdo como se o pipeline já existisse; estudo 32; sem estragar
- **Referência:** `docs/ADR_EMISSAO_NFE_NFSE.md` · emenda `docs/ADR_FATURAMENTO_COBRANCA.md` · `../32` FATURAMENTO §3–4 · UC-FIS-001/002 · UC-INT-001
- **Decisão:** `PLANEJADO` grava o payload Focus na planejação; UI mostra prévia humana + JSON de envio com selo “não é documento autorizado”; chave/número/XML SEFAZ só na resposta real; mesma `ref` no retry quando o hub for cadastrado
- **Aceite:**
  - [x] Payload na planejação (e backfill se vazio)
  - [x] API `previa` + `envio_hub` (sem `_meta`, sem número SEFAZ)
  - [x] UI FAT/PED com prévia e JSON
  - [x] Testes: sem hub NFe/NFSe, GET, hub OK continua oficial
- **Fora de escopo:** mock Focus `AUTORIZADO`; XML `nfeProc` forjado; DANFE servidor; baixa PA
- **Entregue em:** 2026-08-13

### BL-051 · [fiscal] Emissão NF-e / NFS-e no faturar (hub Focus)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-13 — Pedidos / Faturar e gerar cobranças já apto a emitir NF-e e NFS-e; teste como hub Focus; ativação automática quando hub OK; IM não obrigatória em todos os municípios; estudo 32; layout 28; sem estragar
- **Referência:** `docs/ADR_EMISSAO_NFE_NFSE.md` · emenda `docs/ADR_FATURAMENTO_COBRANCA.md` · `../32` FATURAMENTO §3 · UC-FIS-001/002/005 · `../28` FOCUS_NFE_MAPEAMENTO + modelos nfe/nfse
- **Decisão:** FAT+TIT/COB intactos; planeja DocumentoFiscalSaida (PA/REV→NF-e, SVC→NFS-e); POST Focus após commit se hub padrão com teste OK do ambiente ativo (`emissao_habilitada` automático); numeração só na resposta; IM opcional salvo `im_obrigatoria_nfse`; retry mesma `ref`; estoque PA continua só na autorização
- **Aceite:**
  - [x] ADR + emenda FAT + regra Cursor
  - [x] Adapter Focus emitir/consultar NFe e NFSe Nacional
  - [x] Planejar no faturar + emitir se hub apto + retry/consultar
  - [x] Cadastro EMP: IM opcional + flag municipal NFS-e
  - [x] Hub: teste OK liga emissão automática
  - [x] UI Pedidos / FAT / Hubs / Empresas
  - [x] Testes: sem hub, NFe, NFSe sem IM, retry idempotente, EMP, IM opcional
- **Fora de escopo:** baixa PA; cancelamento Focus; DANFE servidor; split dual de um item PA
- **Entregue em:** 2026-08-13

### BL-050 · [comercial/financeiro] Estorno do FAT com NF pendente (refaturar)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-13 — pedido faturado, NF pendente, poder estornar nota e cobrança para fazer de novo; estudo 32; sem estragar
- **Referência:** `docs/ADR_FATURAMENTO_COBRANCA.md` (emenda) · `../32` FATURAMENTO §6 · MAPA §11 · UC-PLT-007 · UC-FIS cancelamento (não aplicável: NF ainda não existe)
- **Decisão:** FAT vigente + `nf_status=PENDENTE` + TIT do saldo abertos → estorno compensatório (motivo) → cancela COB/TIT FATURA → FAT `ESTORNADO` → PED `PRODUZIDO`; sinal e estoque intactos; novo FAT permitido; nunca apagar
- **Aceite:**
  - [x] ADR emenda + regra Cursor
  - [x] Unique vigente (não 1 FAT físico / PED)
  - [x] API `POST /faturamentos/{id}/estornar` + UI PED/FAT
  - [x] Testes: feliz, refaturar, sinal intacto, TIT pago, NF autorizada, motivo, SoD, EMP, idempotência
- **Fora de escopo:** cancelamento Focus de NF autorizada; DEV-; estorno com TIT já baixado
- **Entregue em:** 2026-08-13

### BL-049 · [comercial/financeiro] Faturamento do PED + cobrança do saldo (sinal a apropriar)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-13 — produção concluída; seguir faturamento e cobranças; caso com adiantamento/sinal; estudo 32; sem estragar
- **Referência:** `docs/ADR_FATURAMENTO_COBRANCA.md` · `../32` FATURAMENTO_GERACAO_COBRANCA · MAPA_FATURAMENTO_EXPLICADO · CONCLUSAO_PRODUCAO · RECEBIMENTO_BAIXA · UC-FIS-001 · UC-FIN-001/002
- **Decisão:** PED `PRODUZIDO` → FAT- (preview humano) → apropria sinal quitado → TIT/COB só do saldo; preço e qtde_faturavel travados; 1 FAT/PED; sem Focus/baixa PA
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] FAT + itens + TIT.pedido/faturamento + permissões
  - [x] Parser de condição + apropriação de sinal
  - [x] API preview/faturar + UI no PED e fila
  - [x] Testes (sem sinal, com sinal, parcelas, idempotência, EMP)
- **Fora de escopo:** Focus NF-e; baixa PA; parcial; ENT-; cancel/DEV; COND-/CRT
- **Entregue em:** 2026-08-13

### BL-048 · [compras/fiscal] Espelho fiscal na entrada (XML + snapshot)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-13 — entrada da nota deve capturar o máximo (base do livro de entrada); estudo 32; persistir agora, livro/export no final; sem estragar BL-037/038
- **Referência:** `docs/ADR_ENTRADA_XML_ESPELHO.md` · `../32` CONTABILIDADE_FISCAL_SEM_FECHAMENTO · PADRAO_DECIMAL §5.4 · CONTROLE_ESTOQUE §4 · REVISAO_ICMS_ST · REVISAO_ANTECIPACAO_ICMS_MG
- **Decisão:** no `receber()`, se XML presente → `nfe_entrada` (arquivo privado + itens/impostos copiados); MOV/TIT intactos; sem XML a OC ainda recebe; UI só leitura “Espelho fiscal”; ERP não escrituração
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] Extrator acréscimo (CST/orig/ICMS/IPI/PIS/COFINS/idDest)
  - [x] Tabelas `nfe_entradas` / `nfe_entrada_itens` + storage
  - [x] Preview `espelho` + XML no confirmar
  - [x] Teste Colacril + regressão sem XML / chave divergente
- **Fora de escopo:** livro/export UI; Focus; SPED; antecipação MG como guia; rateio IPI no CM
- **Entregue em:** 2026-08-13

### BL-047 · [produção] Ficha impressa PED + OP
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-12 — ficha em Pedidos e Ordens de produção; estudo 32; sem estragar
- **Referência (padrão 39):** shell `.ficha-*` + `fichaNav` + `window.print` (BL-015/018/019/024/027)
- **Estudo 32:** `GERACAO_PEDIDO.txt` (PED = documento-mestre) · `PRODUCAO_OPERACIONAL_GERENCIAL.txt` §2.6 (chão sem preço/margem) · `CASOS_USO_M03` UC-PRD-001
- **Decisão (fechada):** HTML A4 **retrato** (não paisagem — paisagem é do cálculo ORC). DomPDF fora. Snapshot operacional: spec + guia física + materiais; **sem** R$ de venda/custo. Rotas satélite fora do AppShell.
- **Aceite:**
  - [x] `PedidoFichaSheet` + `PedidoFichaPage` em `/pedidos/:id/ficha`
  - [x] `OrdemProducaoFichaSheet` + `OrdemProducaoFichaPage` em `/ordens-producao/:id/ficha`
  - [x] Botão “Imprimir ficha” no detalhe de cada um (nova aba via `fichaNav`)
  - [x] Guia de produção física reusa `orcamentoGuiaProducao` (faixa sem dinheiro)
- **Fora de escopo:** PDF servidor; ficha de OS; preço na ficha de chão; e-mail da ficha
- **Entregue em:** 2026-08-12

### BL-046 · [produção] Devolver OP ao PED (sem saída requisitada)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-12 — OP não requisitada poder voltar ao pedido; sem estragar; estudo 32
- **Referência:** `docs/ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `../32` UC-PRD-001/004 · GERACAO_PEDIDO §7 · PRODUCAO_OPERACIONAL_GERENCIAL
- **Decisão:** OP sem MOV de produção → `CANCELADA` com motivo; item `PENDENTE`; PED `LIBERADO` se não houver outra ordem aberta; nova OP permitida. Com saída → bloqueio (sem estorno).
- **Aceite:**
  - [x] API `POST /ordens-producao/{id}/devolver-ao-pedido`
  - [x] Restaura item/PED; não apaga OP; não mexe estoque
  - [x] UX na ficha da OP + reabrir no pedido
  - [x] Testes: devolve sem saída; recusa com saída; reabre OP
- **Fora de escopo:** estorno de SAIDA_PRODUCAO; cancelar PED; devolver OS
- **Entregue em:** 2026-08-12

### BL-045 · [estoque/cadastros] Lote + data de entrada + validade (FEFO)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-12 — lote do produto em estoque (quem tiver); entrada e vencimento; reorganizar em teste; estudo 32
- **Referência:** `docs/ADR_ESTOQUE_LOTE_VALIDADE.md` · `../32/CONTROLE_ESTOQUE_PROFISSIONAL.txt` §6
- **Decisão:** Flag no SKU; `estoque_lotes` + MOV.item.lote_id; CM no SKU; FEFO na saída; XML rastro só preenche; virada gera 1–2 lotes; backfill se saldo já existe
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] Migration flags + lotes + FKs
  - [x] Writer único + entrada/AJU/OP/virada/consulta
  - [x] UX saldos/lotes/extrato/cadastro/receber
  - [x] Testes + seed/repopulação
- **Fora de escopo:** endereço; contagem INV por lote; empenho; custo FIFO; etiqueta de rolo; CQ
- **Entregue em:** 2026-08-12

### BL-044 · [produção/estoque/comercial] PED → OP/OS → saída/retorno/PA ±tolerância
- **Status:** Fechado (2026-08-12)
- **Origem:** Chat 2026-08-12 — pós-aprovação/baixa adiantamento: gerar OP/OS, saída MP, produção, estoque consumido/retorno/PA, readequação ±20%; estudo 32; sem estragar
- **Referência:** `docs/ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `../32` GERACAO_PEDIDO · PRODUCAO · ESTOQUE_FLUXO · CONCLUSAO · M03
- **Decisão:** ORC `LIBERADO` → PED idempotente → OP (PRODUCAO) / OS (SERVICO); MOV `SAIDA_PRODUCAO` / `ENTRADA_SOBRA` / `ENTRADA_PA` via writer; conclusão com ±`tolerancia_qtd_pct`; PA família `PA-ETQ`; sem app PCP paralelo
- **Entrega:**
  - [x] ADR + migrations PED/OP/OS + permissões `producao.*`
  - [x] `PedidoService` no gatilho de liberação financeira
  - [x] OP: requisitar + concluir (retorno/perda/PA/readequação)
  - [x] OS leve (concluir sem PA)
  - [x] UI Pedidos / OP / OS
  - [x] `ProducaoPedOpEstoqueTest` + regressão adiantamento/aprovação
- **Fora de escopo:** empenho com saldo reservado; lote/FIFO; CQ; faturamento Focus; CRT; NEC automática; reabertura OP

### BL-043 · [comercial/produção] Guia de produção no ORC (pós-cálculo)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-12 — após calcular, guia de tudo que será utilizado para produzir; sem estragar; estudo 32
- **Referência:** `docs/ADR_ORC_GUIA_PRODUCAO.md` · `../32/GERACAO_ORCAMENTO.txt` §1.5/§9.2/§10 · `../32/PRODUCAO_OPERACIONAL_GERENCIAL.txt` §2.2/§2.6
- **Decisão:** 3ª aba interna **Guia de produção** (consumos físicos, sem R$); derivação do snapshot; motor/proposta/breakdown intactos; fora do link público
- **Aceite:**
  - [x] ADR
  - [x] Helper `orcamentoGuiaProducao.ts` + aba em `OrcamentoResultado`
  - [x] Form + detalhe passam especificação
  - [x] Sem alteração no motor / DTO público
- **Fora de escopo:** SKU/empenho OP; impressão dedicada; exposição ao cliente
- **Entregue em:** 2026-08-12

### BL-042 · [estoque] Inventário profissional + ajuste (INV → AJU + alçadas + extrato)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-12 — ajuste profissional respeitando estudo 32; sem estragar BL-036/espinha OC
- **Referência:** `docs/ADR_ESTOQUE_INVENTARIO_AJUSTE.md` · `ADR_ESTOQUE_REPOSICAO_AJUSTE.md` · `../32/AJUSTE_ESTOQUE_INVENTARIO.txt`
- **Decisão:** INV cego 1ª/2ª → AJU com alçadas → MOV via writer; avulsa permanece; extrato SKU; congelamento leve; sem NF/OP/SPED
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] Migration INV + FKs AJU + `estoque.aprovar_gestor`
  - [x] APIs inventário / extrato / alçada
  - [x] UI Inventários + extrato
  - [x] Feature tests + regressão BL-036 / multi-EMP
- **Fora de escopo:** OP/sobra/REM; lote/endereço; Focus 5.927; Bloco H; ABC automático
- **Entregue em:** 2026-08-12

### BL-041 · [comercial] Snapshot condição/forma no ORC (input_snapshot)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-12 — seguir BL-040; sem estragar motor/PED
- **Referência:** `docs/ADR_CONDICOES_COMERCIAIS_PAR.md` (emenda) · estudo 32 FATURAMENTO / GERACAO_PEDIDO
- **Decisão:** `condicao_pagamento` + `forma_pagamento` no `input_snapshot` (sem coluna SQL); prefill do PAR; UI form/detalhe/ficha/proposta pública; motor intacto
- **Aceite:**
  - [x] Validação + persistência no snapshot
  - [x] Prefill ao escolher parceiro
  - [x] Ficha / detalhe / link público
  - [x] Teste `test_snapshot_condicoes_comerciais_no_input`
- **Fora de escopo:** COND-; CRT; PED; colunas SQL em orcamentos
- **Entregue em:** 2026-08-12

### BL-040 · [cadastros/comercial/compras] Condições comerciais do PAR (defaults → documento)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-12 — Parceiros → Condições comerciais; estudo 32; sem estragar
- **Referência:** `docs/ADR_CONDICOES_COMERCIAIS_PAR.md` · `../32/CADASTRO_PARCEIROS.txt` · `FATURAMENTO_GERACAO_COBRANCA.txt`
- **Decisão:** PAR = defaults (forma canônica + sugestões de condição); OC prefill editável; ORC só hint; sem COND-/CRT/schema ORC
- **Aceite:**
  - [x] ADR
  - [x] UX Parceiros + ficha
  - [x] Prefill condição na nova OC
  - [x] Hint de defaults no ORC (sem persistir)
- **Fora de escopo:** COND-; motor CRT; snapshot condição no ORC/PED; comissão/tabela preço
- **Entregue em:** 2026-08-12

### BL-039 · [compras/fiscal/ux] Avisos XML acionáveis (dest EMP + IPI)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-11 — tratar avisos do XML Colacril (dest UDI × EMP RLP; parcelas 4170,50 × OC 3800)
- **Referência:** `ADR_ENTRADA_XML_PARCELAS.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md` · NF estudo 32 `…577306…`
- **Decisão:** warnings estruturados `INFO|ALERTA`; dest sugere EMP correta; diff = IPI/frete vira INFO; UI por nível + totais NF
- **Aceite:**
  - [x] Mensagens com CNPJ/EMP sugerida
  - [x] IPI classificado INFO
  - [x] Teste com XML real Colacril + regressão
- **Entregue em:** 2026-08-11

### BL-038 · [compras/financeiro/fiscal] Parcelas XML → multi-TIT na entrada
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-11 — XML deve popular financeiro; coerência contábil/fiscal; estudo 32; sem estragar BL-037
- **Referência:** `docs/ADR_ENTRADA_XML_PARCELAS.md` · `ADR_ENTRADA_XML_ASSIST.md` · `../32` CONTABILIDADE_FISCAL_SEM_FECHAMENTO · RECEBIMENTO_BAIXA · M06/M07
- **Decisão:** `cobr.dup` → N TIT PAGAR (NAT 5.06) no mesmo `receber()`; fallback 1 TIT; MOV guarda `nf_valor`/`nf_totais`; estoque continua OC; ERP não fecha SPED
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] Extractor todas as dups + totais
  - [x] `receber` com `parcelas[]` + UI editável
  - [x] Teste multi-TIT + regressão 1 TIT / XML assist
- **Fora de escopo:** SPED/ECD; rateio IPI no custo; Focus; COB a pagar
- **Entregue em:** 2026-08-11

### BL-037 · [compras/estoque/fiscal] Assistência XML na entrada (UC-CPR-004 lean)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-11 — continuar implementação profissional pós BL-036; estudo 32 UC-CPR-004
- **Referência:** `docs/ADR_ENTRADA_XML_ASSIST.md` · `ADR_COMPRAS_ATE_ESTOQUE.md` · `../32/CASOS_USO_M07_COMPRAS.txt`
- **Decisão:** preview XML → prefill NF/vencimento/de-para → humano confirma `receber()`; persiste `cProd`; sem Focus/auto-lançar
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] `NfeCompraExtractor` + `produto_fornecedor_codigos`
  - [x] `POST …/receber/xml/preview` + maps no receber
  - [x] UI upload na OC
  - [x] `EntradaXmlAssistTest` + regressão compras/estoque
- **Fora de escopo:** Focus download; entrada sem OC; multi-TIT por dup; inventário cego
- **Entregue em:** 2026-08-11

### BL-036 · [estoque/compras] Reposição por mínimo + AJU (contagem avulsa)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-11 — estoque completo com ajuste; pedido por mínimo/gerencial; fluxo OC→receber→TIT→BX; estudo 32; sem estragar BL-033
- **Referência:** `docs/ADR_ESTOQUE_REPOSICAO_AJUSTE.md` · `ADR_COMPRAS_ATE_ESTOQUE.md` · `../32` CONTROLE/AJUSTE
- **Decisão:** lista A repor → OC DIRETA; AJU PENDENTE → `estoque.aprovar` → MOV AJUSTE; NEC/COT fora do menu; kit seed MP/EMB/REV com mínimos
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] Migration AJU + `estoque.aprovar`
  - [x] APIs reposição + ajustes
  - [x] UI A repor / Ajustes
  - [x] `EstoqueReposicaoAjusteTest` + regressão `ComprasAteEstoqueTest`
- **Fora de escopo:** Focus/cProd; inventário cego completo; UI NEC/COT; OP/saídas
- **Entregue em:** 2026-08-11

### BL-035 · [comercial/financeiro] Adiantamento PIX no aceite ORC + spine CR/COB/BankProvider
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-11 — 1º pedido / limite 0: PIX na tela de aprovação; aguardar adiantamento; BX libera; estudo 32; Inter como exemplo
- **Referência:** `docs/ADR_ORC_ADIANTAMENTO_PIX.md` · `../32/APROVACAO_ORCAMENTO_CLIENTE.txt` §5.1 · `../32/INTEGRACAO_BANCARIA_MULTI_PROVIDER.txt`
- **Decisão:** aceite = APROVADO no clique; `financeiro_status` AGUARDA_ADIANTAMENTO|LIBERADO; TIT RECEBER + COB + Mock/Inter BankProvider; webhook idempotente
- **Aceite:**
  - [x] Aprovar com limite 0 emite PIX (copia-e-cola) na resposta / tela pública
  - [x] GET pós-aceite `modo=pagamento` enquanto aguarda
  - [x] Webhook mock baixa 1× e libera ORC; 2º = DUPLICADO
  - [x] Contas a receber UI + badge financeiro no ORC
  - [x] `AdiantamentoOrcamentoTest` + regressão `OrcamentoAprovacaoTest` / `MultiEmpresaAceiteTest`
- **Fora de escopo:** PED/OP; CRT crédito; CNAB; Sicoob prod; WhatsApp API

### BL-034 · [arquitetura/qualidade] Aceite automatizado multi-empresa (§7.B)
- **Status:** Feito
- **Prioridade:** P1
- **Origem:** Chat 2026-08-11 — fechar entendimento instalação×EMP×ambientes; próximo passo = teste de aceite
- **Referência:** `docs/MODELO_INSTALACAO_MULTI_EMPRESA.md` §7.B · middleware `SetEmpresaContext` · `hasEmpresaAccess`
- **Decisão:** um Feature test canônico cobre vínculo, 403, troca de contexto, isolamento de listagem e CFIN por EMP (sem retestar Focus — já em `FiscalHubTest`)
- **Aceite:**
  - [x] `MultiEmpresaAceiteTest` 6/6
  - [x] Norma §7.B aponta o filtro phpunit
- **Fora de escopo:** smoke de Lightsail/portas; SoD compras≠financeiro; seletor visual no header (manual)

### BL-033 · [compras/estoque/financeiro] Fluxo insumos → estoque (NEC→[COT]→OC→MOV→TIT→BX)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-10 — comprar insumos/MP/embalagens até estoque; estudo 32; recomendar e decidir sem burocratizar; implementar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `COMPRAS_COTACAO_URGENCIA.txt` · `CASOS_USO_M07_COMPRAS.txt`
  - `CONTROLE_ESTOQUE_PROFISSIONAL.txt` · `RECEBIMENTO_BAIXA_COBRANCA.txt`
  - `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt` · `CODIFICACAO_INFORMACOES_SISTEMA.txt`
- **Referência (padrão 39):** ADR `docs/ADR_COMPRAS_ATE_ESTOQUE.md` · NAT/CFIN/unidades · BL-014 XML fornecedor · BL-032 NAT
- **Decisão (fechada):** espinha `NEC → [COT] → OC → entrada NF×OC×conferência → MOV → TIT → BX`; COT pulável; sem REQ pesada; TIT estoque = NAT `5.06` (não `2.01`); SoD COMPRAS≠FINANCEIRO
- **Aceite:**
  - [x] ADR + regra Cursor
  - [x] Migrations + models + CodigoGenerator (NEC/COT/OC/MOV/TIT/BX)
  - [x] Services + APIs + permissões RBAC
  - [x] UI Compras / Estoque / Contas a pagar
  - [x] Teste Feature fluxo feliz + fronteira NAT (`ComprasAteEstoqueTest` 3/3)
  - [x] Diagrama atualizado
- **Fora de escopo:** Focus auto-download, de-para cProd, OP/UC-CPR-005, remessa industrial, entrada sem OC, CR/COB, inventário/AJU
- **Entregue em:** 2026-08-10
- **Arquivos:**
  - `ADR_COMPRAS_ATE_ESTOQUE.md` · `.cursor/rules/compras-estoque.mdc`
  - migrations `2026_08_10_140000_*` / `140100_*`
  - Services `Compras/*` · `Estoque/*` · `Financeiro/TituloService`
  - Controllers + rotas API · pages `Compras*` · `EstoquePage` · `ContasPagarPage`
  - `ComprasAteEstoqueTest.php` · NAT `5.06` no catálogo

### BL-032 · [financeiro/arquitetura] Naturezas gerenciais receita/despesa (fundação NAT)
- **Status:** Feito
- **Prioridade:** P0
- **Origem:** Chat 2026-08-10 — estrutura naturezas receita/despesa; amarração contábil plano de contas só pensada, não fazer; estudo 32; recomendar e decidir sem estragar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32`
  - `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt`
  - `CONTABILIDADE_FISCAL_SEM_FECHAMENTO.txt`
  - `DECISAO_NAO_IMPLEMENTAR_LAI_NO_ERP.txt`
  - `CODIFICACAO_INFORMACOES_SISTEMA.txt`
- **Referência (padrão 39):** catálogo global `produto_grupos` + seed; ADR BEM/unidades; CFIN ≠ ledger
- **Decisão (fechada):** árvore gerencial grupos **1–5** (`naturezas_gerenciais`, exibição `NAT-1.01.01`); **não** enum flat; **não** plano de contas; **não** reutilizar `produto_grupos.natureza`; seed + editar nome/descrição + soft-inativar; sem folhas custom; sem TIT/BX/de-para nesta entrega
- **Aceite:**
  - [x] ADR `docs/ADR_NATUREZAS_GERENCIAIS.md` + regra Cursor
  - [x] Migration + model + CatalogData + seeder idempotente
  - [x] Service + APIs + consulta folhas ativas + permissões
  - [x] UI catálogo em árvore
  - [x] Teste de fronteira + diagrama
- **Fora de escopo:** plano de contas, de-para contador, TIT/COB/BX, CC, DRE UI, defaults por operação, LAI/grupo 9
- **Entregue em:** 2026-08-10
- **Arquivos:**
  - `NaturezaGerencial*` · `NaturezasGerenciaisPage` · `ADR_NATUREZAS_GERENCIAIS.md`
  - `.cursor/rules/naturezas-gerenciais.mdc`
  - testes `NaturezaGerencialBoundaryTest` · `NaturezaGerencialTest`

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
  - [x] Destinatário oficial (`autorizado_aprovar`) + seleção no envio + instrução na página
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
- **Status:** Removido (2026-08-11) — módulo + Dompdf retirados do sistema; ver migration `2026_08_11_120000_drop_relatorios_module`
- **Prioridade:** P1
- **Origem:** Chat 2026-08-07 — PDF engessa UX; análise HTML vs PDF; decisão híbrido futuro; adiar enquanto foco é cadastro/ORC; não apagar
- **Referência (domínio):** `/home/dfmoura/Documents/test_several1/trigger/32` (M10 gerencial CSV/PDF futuro — sem Relatórios IA)
- **Decisão original:** **Feature flag master OFF**. Não hard-delete. Não tocar IaProvedores, migrations, queue Compose, DomPDF package.
  - API: middleware `relatorio.ia` → 404 se `RELATORIO_IA_HABILITADO=false` (default).
  - Jobs: no-op se flag OFF.
  - SPA: menu/dashboard/rotas só com `VITE_RELATORIO_IA_HABILITADO=true`.
  - Testes: phpunit força flag ON; testes do módulo preservados.
  - Futuro (reabrir): HTML preview + PDF export do mesmo documento (plano profissional).
- **Aceite (histórico do freeze):**
  - [x] Menu Relatórios e card dashboard ocultos por padrão
  - [x] Rotas SPA `/relatorios*` ausentes com flag OFF
  - [x] API `/api/v1/relatorios*` → 404 com flag OFF
  - [x] Código/services/jobs/tabelas/permissions seed preservados
  - [x] IaProvedores intocado
  - [x] README + .env.example documentam reabertura
- **Fora de escopo (no freeze):** apagar código, dropar tabelas, evoluir layout HTML/PDF agora
- **Entregue em:** 2026-08-07
- **Remoção definitiva:** 2026-08-11 — código, Dompdf, UI, flags, permissions e tabelas removidos; IaProvedores e fichas HTML print preservados

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
- **Decisão:** **HTML pronto para impressão** (A4 retrato, `window.print` / Salvar como PDF). DomPDF fora; ficha é snapshot operacional do cadastro.
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
- **Decisão:** quatro camadas (TRIGGER atribuição · produto **FLEXOERP** · licenciado herói · EMP contexto); UI = “Desenvolvido por”+logo; documentos = “Powered by TRIGGER”; fonte única `brand.ts` + `config('erp.brand')`; docs `IDENTIDADE_TRIGGER.md` + `MODELO_INSTALACAO_MULTI_EMPRESA.md` (glossário). *Refino 2026-08-11:* produto nomeado FLEXOERP (antes “ERP RLP”); RLP permanece licenciado.
- **Aceite:**
  - [x] Doc normativa + README/LIGHTSAIL alinhados
  - [x] `TriggerAttribution` + `brand.ts` usados em login, BrandBar, ficha
  - [x] Byline **por Trigger Data Intelligence** sob o produto (sidebar + login)
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
- **Decisão:** **HTML pronto para impressão** (A4 retrato, `window.print` / Salvar como PDF no browser). DomPDF fora; ficha é snapshot de consulta/impressão operacional.
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
- **Status:** Removido (2026-08-11) — regras de DomPDF/retenção saíram com o módulo; mem_limits Compose e swap Lightsail permanecem
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
- **Status:** Removido (2026-08-11) — módulo Relatórios IA retirado
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
- **Status:** Removido (2026-08-11) — módulo Relatórios IA retirado
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
- **Status:** Removido (2026-08-11) — módulo + Dompdf retirados; IaClient/provedores preservados
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
