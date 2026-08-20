# Mapa de faturamento — visão única do FLEXOERP (39)

**Status:** Canônico (as-built)  
**Data:** 2026-08-18  
**Papel:** entender *de onde vem, o que nasce, para onde vai e o que não misturar*.  
**Não substitui** as ADRs (decisão) nem o estudo 32 (norma de domínio).

**Norma (estudo):** `../32` — `MAPA_FATURAMENTO_EXPLICADO.txt` · `FATURAMENTO_GERACAO_COBRANCA.txt` · `CONCLUSAO_PRODUCAO.txt` · `RECEBIMENTO_BAIXA_COBRANCA.txt` · `ENTREGA_CONFIRMACAO_CLIENTE.txt` · `COMISSOES_VENDEDORES_DETALHADO.txt` · `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt` · `CASOS_USO_M05` UC-FIS-001/002/005 · `CASOS_USO_M06` UC-FIN-001/002/003/010 · `ORDEM_SERVICO.txt` · `CADASTRO_PRODUTOS_VENDA.txt` §5.6

**Decisões 39:** `ADR_FATURAMENTO_COBRANCA.md` · `ADR_EMISSAO_NFE_NFSE.md` · `ADR_OPERACOES_SAIDA.md` · `ADR_ENTREGA_EXPEDICAO.md` · `ADR_COMISSAO_VENDEDOR.md` · `ADR_CARTEIRA_FINANCEIRA.md` · `ADR_ORC_ADIANTAMENTO_PIX.md` · `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_NATUREZAS_GERENCIAIS.md`

**Produto:** FLEXOERP · **licenciado:** RLP · **contexto:** EMP ativa (`empresa_id`) — EMP não é marca nem stage.

---

## 1. Ideia central

Faturar = transformar o **PEDIDO apto** em **documento comercial `FAT-`** + **cobrança (`TIT-`/`COB-`)** + **plano fiscal (`DFS-`)**, sem inventar preço nem numeração SEFAZ, e sem fechar apuração de imposto no ERP.

Quatro eixos andam juntos e **não são a mesma coisa**:

| Eixo | Objeto | Fecha quando | Não fecha |
|------|--------|--------------|-----------|
| **Comercial / financeiro** | `FAT-` → `TIT-` → `COB-` → `BX-` | saldo recebido | entrega |
| **Fiscal** | `DFS-` (NF-e e/ou NFS-e) via Focus | autorização **oficial** | caixa |
| **Logístico** | `ENT-` | confirmação de entrega/retirada | título |
| **Gerencial (vendedor)** | `COM-` → `CFE-` | BX do recebido (base RECEBIDO) | faturar ou expedir |

Um PED pode estar **entregue** e ainda **a receber**.  
Um PED pode ter **sinal pago** e ainda **sem NF oficial**.  
Um PED pode ter **NF pendente** e já ter **boleto/PIX do saldo**.  
Isso é normal — o mapa abaixo mostra quando cada eixo fecha.

Regra de ouro:

- NF autorizada ≠ dinheiro no caixa.
- TIT aberto ≠ mercadoria entregue.
- BX ≠ zerar o título editando o valor.
- FAT confirmado ≠ NF do fisco.
- Confirmar ENT ≠ baixar TIT.
- Pagar comissão ≠ faturar.

---

## 2. Decisão de desenho (estudo 32 → 39)

O estudo descreve o faturamento como *NF autorizada + títulos vivos*. O 39 **não discorda** — discorda da **ordem de espera**.

| Estudo 32 (intenção) | 39 (as-built — caminho escolhido) | Por quê |
|----------------------|-----------------------------------|---------|
| NF autorizada dispara TIT | `FAT-` dispara TIT/COB **no mesmo commit**; NF anda no mesmo FAT | SEFAZ/Focus instável não pode travar cobrança do saldo. Documento fiscal ≠ título (estudo §7). |
| Numeração fiscal = Focus/SEFAZ | ERP **omite** série/número; grava só a resposta. Prefixo interno `DFS-` ≠ número da nota | Nunca inventar NF. |
| Baixa PA na autorização | Continuará só na NF **Focus autorizada**. Stub e prévia **não** baixam | Estoque PA só com fato fiscal real. |
| 1 PED → N NFs parciais | Fase atual: **1 FAT vigente : 1 PED** (1 item). Estorno libera novo FAT | Alinhado a 1 PED : 1 item. Parcial = ADR futura. |
| Cancelamento Focus / DEV- | Estorno **comercial** enquanto NF pendente/rejeitada/stub | Sem chave SEFAZ não há cancelamento fiscal. |

**Não “corrigir” o 39 para esperar SEFAZ antes do TIT.** Isso quebraria a espinha que já opera (BL-049…065).

```
Estudo (intenção)     PED apto ──► Focus autoriza NF ──► TIT + estoque + ENT
39 (as-built)         PED PRODUZIDO ──► FAT + TIT/COB + plano DFS
                                           │
                                           ├─ hub apto  → POST Focus (ref idempotente)
                                           ├─ sem hub   → PLANEJADO + prévia imprimível
                                           └─ stub local → AUTORIZADO origem STUB (sem valor fiscal)
```

---

## 3. Mapa geral (as-built)

```
ORC (preço, condição, vendedor, RETIRAR/ENTREGAR TRAVADOS)
  │
  ├─ (exceção) sinal ──► TIT origem=ADIANTAMENTO + COB ──► BX ──► libera PED
  │
  ▼
PED- ──► OP- / OS- ──► PRODUZIDO (qtde_faturavel = qtde boa ±tolerância)
  │
  ▼  humano confirma (preview)     PRODUÇÃO não fatura
FAT- CONFIRMADO
  ├─ apropria min(sinal quitado, bruto)
  ├─ TIT origem=FATURA (1..N pela condição) ──► COB se PIX/Boleto
  ├─ COM- na apropriação do sinal (se houver vendedor)
  └─ DFS-  NFE (PA/REV/FAC) e/ou NFSE (SVC)
        │
        ▼
PED FATURADO ──► ENT- (balcão ou transporte) ──► PED ENTREGUE
                       │
                       ▼
              TIT intactos ──► BX na carteira ──► COM- PREVISTA
                       │
                       ▼
              PED ENCERRADO = entregue + nenhum TIT RECEBER aberto
```

Exceção **antes** da NF: sinal/adiantamento (TIT+COB sem NF integral).  
Exceção **depois** da NF oficial: cancelamento Focus (prazo legal) **ou** `DEV-` — **ainda não implementados**; ver §15.

---

## 4. Catálogo de objetos

| Código | Tabela | Papel | Quem gera |
|--------|--------|-------|-----------|
| `ORC-` | `orcamentos` | Snapshot comercial (preço, condição, vendedor, frete estimado, modo entrega) | Comercial |
| `PED-` | `pedidos` | Mestre operacional. Sem PED apto, não fatura | Sistema no aceite + `LIBERADO` |
| `OP-` / `OS-` | `ordens_producao` / `ordens_servico` | Concluem o item → `qtde_faturavel` | Produção |
| `FAT-AAAA-NNNNN` | `faturamentos` | Documento comercial/financeiro do evento. **Não** é a NF | `faturamento.escrever` |
| `DFS-AAAA-NNNNN` | `documento_fiscal_saidas` | Plano/execução NF-e ou NFS-e. Número SEFAZ só na resposta Focus | Mesmo faturar / emitir-nf |
| `TIT-` | `titulos` | Verdade financeira (valor, vencimento, saldo, NAT) | Sinal no aceite; saldo no FAT; COM no CFE; OC; avulso |
| `COB-` | `cobrancas` | Emissão bancária (liga TIT ↔ `BankProvider`) | Só PIX/Boleto |
| `BX-` | `titulo_baixas` | Recebimento/pagamento identificado | Financeiro / webhook |
| `ENT-` | `entregas` | Romaneio. **Não** mora no TIT | `expedicao.escrever` |
| `COM-` / `CFE-` | `comissoes` / `comissao_fechamentos` | Direito do vendedor sobre o **recebido** | Sistema na BX / financeiro no fechamento |
| `NAT-` | `naturezas_gerenciais` | Classifica o dinheiro (≠ CFOP) | Catálogo global, grupos 1–5 |
| `CFIN-` | `empresa_contas_financeiras` | Onde o dinheiro está (tesouraria) | Cadastro EMP |
| `EMP-` | `empresas` | Isolamento lógico de todo documento | Contexto `X-Empresa-Id` |
| `MSG-` | — | WhatsApp da NF/boleto — **fora desta fase** | — |
| `DEV-` | — | Estorno ponta a ponta — **fora desta fase** | — |

Prefixo `FAT-` / `DFS-` é **interno do ERP**. Chave 44, série e número da nota são **do fisco** (Focus). Stub local grava chave sintética com origem `STUB` e `oficial=false`.

---

## 5. Máquinas de status

### PED

```
LIBERADO → EM_PRODUCAO → PRODUZIDO → FATURADO → EM_ENTREGA → ENTREGUE → ENCERRADO
                              ▲            │
                              │            └─ recusa/cancel ENT → FATURADO de novo
                              └─ estorno FAT (NF não oficial)
CANCELADO (fora da cadeia feliz)
```

| Status | Significado no mapa |
|--------|---------------------|
| `PRODUZIDO` | Fila de faturamento. OP/OS concluída; `qtde_faturavel` > 0. |
| `FATURADO` | FAT vigente; TIT/COB do saldo nascidos; fila de expedição. |
| `EM_ENTREGA` | ENT vigente (aguarda retirada ou em trânsito). |
| `ENTREGUE` | Prova registrada. TIT podem continuar abertos. |
| `ENCERRADO` | Entrega ok **e** nenhum TIT RECEBER do PED em aberto/parcial. Não reabre. |

### FAT

| Status | Significado |
|--------|-------------|
| `CONFIRMADO` | Vigente. No máximo um por PED. |
| `ESTORNADO` | Histórico. Não apaga FAT/TIT/COB. Novo FAT permitido. |

`nf_status` no FAT **deriva** dos `DFS-` e **não** bloqueia cobrança:

| `nf_status` | Significado |
|-------------|-------------|
| `PENDENTE` | Planejado, erro, ou só stub. |
| `PROCESSANDO` | Focus aceitou; aguarda autorização. Bloqueia expedir (política) e estorno. |
| `AUTORIZADA` | Todos os tipos do plano autorizados. `oficial` só se origem `FOCUS`. |
| `REJEITADA` | Hub/SEFAZ recusou. FAT e TIT intactos. Retry = mesma `ref`. |

### DFS (documento fiscal)

`PLANEJADO` → `PROCESSANDO` → `AUTORIZADO`  
alternativas: `REJEITADO` / `ERRO` (retry mesma `ref`) · `CANCELADO` (FAT estornado ainda sem NF oficial).

Tipos no mesmo FAT: **NFE** (mod. 55) para PA/REV/FAC · **NFSE** (NFS-e Nacional) para SVC. Pedido misto gera os dois. Sem segundo documento do mesmo tipo no mesmo FAT.

### TIT (receber da venda)

`ABERTO` → `PARCIAL` → `QUITADO`  
`CANCELADO` no estorno do FAT (só origem `FATURA`, ainda aberto).  
Origens que **não** se misturam: `ADIANTAMENTO` (sinal) · `FATURA` (saldo) · `COMISSAO` · `OC` · `AVULSO`.

### ENT

`AGUARDA_RETIRADA` | `EM_TRANSITO` → `ENTREGUE`  
`RECUSADA` / `CANCELADA` → PED volta a `FATURADO`; novo ENT permitido.

### COM

`PREVISTA` (BX ou apropriação do sinal) → `LIBERADA` (CFE) → `PAGA` (TIT PAGAR 3.01.05 quitado).  
`ESTORNADA` se FAT estornado ainda em PREVISTA. Nunca apaga.

---

## 6. Quando o pedido está apto a faturar

Checklist **todos SIM** no caminho padrão (preview bloqueia o commit se falhar):

1. PED existe, EMP do contexto, não `CANCELADO`.
2. Status `PRODUZIDO` (OP/OS concluída — PRODUÇÃO não emite FAT).
3. Itens com `qtde_faturavel` > 0 e status `PRODUZIDO`.
4. Parceiro fiscal do PED (não prospect incompleto para a NF — avisos no plano fiscal; **não** bloqueia TIT).
5. Preço travado no snapshot do PED (`valor_etiqueta` da faixa = **total** das etiquetas, não unitário).
6. Condição de pagamento no snapshot (fallback: cadastro PAR / “à vista”).
7. Se forma PIX/Boleto e saldo > 0: conta financeira (`CFIN-`) da EMP.

**Não** é pré-requisito do FAT:

- entrega confirmada
- recebimento do saldo (salvo política comercial à vista — TIT nasce à vista; BX é outro passo)
- hub Focus apto (sem hub = prévia; local pode stub)
- apuração Simples/DAS no ERP
- estoque PA “para a NF” — PA entra na conclusão da OP; a **saída** fiscal ainda não dispara neste mapa (ver §15)

Humano confirma o preview. Não auto-faturar na conclusão da OP/OS.

---

## 7. Cálculo (o que o FAT cobra)

Fonte: snapshot do PED (faixa aceita do ORC). `PadraoDecimal` — nunca float.

```
unitário          = valor_etiqueta / quantidade_da_faixa     (6 casas)
etiquetas         = qtde_faturavel × unitário                 (qtde real ±tolerância)
+ matriz/clichê   = valor fixo da faixa                       (não escala com qtde produzida)
+ faca nova       = valor cotado se faca_nova no snapshot     (fixo)
= valor_bruto

adiantamento      = min(TIT ADIANTAMENTO quitado, valor_bruto)
valor_a_cobrar    = valor_bruto − adiantamento

parcelas          = parser da condição (à vista, N DDL, 14/28/42, % sinal)
                    apósAdiantamento: não gera 2ª parcela de sinal
```

**Proibido:** multiplicar `qtde_faturavel` por `valor_etiqueta` como se fosse preço unitário.

Frete **não** entra no FAT nesta fase (estimado no ORC; receita 1.01.05 e despesa de transportadora são eixos distintos — ver `ADR_ORC_FRETE_ESTIMADO.md` / `ADR_ENTREGA_EXPEDICAO.md`).

Ferramental vai como **linha do mesmo FAT** (família do item). Natureza do TIT da fatura segue a família principal (PA → `1.01.01`, REV → `1.01.02`, SVC → `1.01.03`). Folha `1.01.04` existe no catálogo e está reservada — **ainda não** é o NAT do TIT desta linha (ver §15).

Sinal já classificado em `1.01.01` no aceite — o FAT **apropria**, não relança.

---

## 8. Caminhos por família (mesmo PED, regras diferentes)

| Família | Antes do FAT | Documento fiscal | NAT do TIT FATURA | Estoque nesta fase |
|---------|--------------|------------------|-------------------|--------------------|
| **PA** (produção) | OP concluída + `ENTRADA_PA` | NF-e (CFOP típ. 5101/6101) | `1.01.01` | `SAIDA_VENDA` na NF Focus oficial |
| **REV** (revenda) | Item produzido/separado | NF-e (CFOP típ. 5102/6102) | `1.01.02` | idem |
| **SVC** (serviço) | OS concluída | NFS-e Nacional (catálogo `REBOBINACAO`/`ACERTO`/`AVULSO`/`MANUTENCAO`) | `1.01.03` | sem `ENTRADA_PA` típico |
| **FAC** (ferramental) | Já veio no PED/ORC | mesma NF-e do PA/REV | hoje viaja com a família do item | — |
| **Frete receita** | Modo ENTREGAR no snapshot | — | `1.01.05` reservada | não no FAT |
| **Amostra / protótipo** | Política própria (estudo) | — | não distorcer venda | fora desta fase |

Pedido misto PA+SVC → **um FAT**, **dois DFS** (NFE + NFSE). Sem split dual de um único item PA.

Cessão de impressora (comodato) **não entra neste mapa**: é `CES-` no patrimônio (`BEM CEDIDO`), sem FAT e sem NFS-e/NF-e. Ver `docs/ADR_OPERACOES_SAIDA.md`.

---

## 9. Elo NF × TIT × COB × BX × ENT × COM

Passo a passo do dinheiro e da nota **no 39**:

1. Condição do PED define o calendário.
2. No **commit do FAT** o ERP cria `TIT-` do saldo (`origem=FATURA`) com NAT folha 1–5.
3. Adapter bancário emite `COB-` se forma PIX/Boleto (idempotência por FAT+parcela). Transferência/Cartão → TIT sem COB.
4. No mesmo commit planeja `DFS-`. POST Focus **depois** do commit se hub apto. Falha fiscal **não** desfaz FAT/TIT/COB.
5. NF-e Focus autorizada → `SAIDA_VENDA` da qtde faturada (SKU do item). Stub/prévia/NFS-e não baixam.
6. Cliente paga → `BX-` na carteira (ou webhook). Limite de crédito sobe na baixa (quando o motor de crédito estiver no documento).
7. Cada BX de TIT `FATURA` (e a apropriação do sinal no faturar) gera `COM- PREVISTA` se houver vendedor no snapshot — proporcional às **etiquetas**, sem frete/matriz/faca.
8. Expedição gera `ENT-` **depois** do FAT. Política `politica_nf_antes_expedir=SIM`: sem hub a prévia basta; hub apto exige NF Focus autorizada; `PROCESSANDO` bloqueia.
9. Confirmar ENT **não** baixa TIT. À vista no balcão: CTA para Contas a receber.

Lembretes:

- Um faturamento → 0..N títulos (saldo zero se o sinal cobrir o bruto).
- Um título → 0..N baixas parciais até zerar saldo.
- COB é emissão bancária; a verdade no ERP é o TIT.
- Provider (mock / Inter / …) troca sem reescrever FAT/NF/TIT.
- Retry de NF = **mesma `ref` Focus** (UC-FIS-005).

---

## 10. Desfazer (três ramos — só o primeiro está vivo)

```
                    ┌─ NF ainda não oficial (pendente / rejeitada / stub)
FAT CONFIRMADO ─────┤     → ESTORNO COMERCIAL (BL-050)     ✅ vivo
                    │
                    ├─ NF Focus autorizada, prazo legal
                    │     → CANCELAMENTO FOCUS              ❌ ADR futura
                    │
                    └─ após prazo / mercadoria saiu / RMA
                          → DEV- ponta a ponta              ❌ ADR futura
```

### Estorno comercial (único ramo implementado)

Condições: FAT vigente · `nf_status` PENDENTE ou REJEITADA (stub não trava) · TIT `FATURA` todos `ABERTO` (ou nenhum) · COB não paga · sem BX · sem ENT vigente · COM só PREVISTA ou nenhuma · motivo ≥ 3 caracteres · permissão `faturamento.escrever`.

Efeitos: cancela COB no provider · TIT FATURA → `CANCELADO` · DFS → `CANCELADO` se ainda não oficial · FAT → `ESTORNADO` · PED → `PRODUZIDO` · **sinal intacto** · **estoque intacto** · novo FAT permitido. **Nunca apagar.**

Idempotente: FAT já estornado devolve o documento sem tocar o PED.

### O que o estorno comercial não é

Não é cancelamento SEFAZ. Não é `DEV-`. Não mexe em TIT `ADIANTAMENTO`. Não baixa/estorna PA (PA nunca saiu neste ramo).

---

## 11. Multi-empresa

- Todo FAT, DFS, TIT, COB, BX, ENT, COM carrega `empresa_id` da EMP do contexto.
- Recusar EMP sem vínculo (403). Header `X-Empresa-Id` sozinho não autoriza.
- Numeração fiscal é por CNPJ emissor via Focus — o ERP não inventa.
- EMP-folha/serviços não fatura etiquetas da EMP industrial por engano.
- Sem livro paralelo / LAI no ERP.
- Isolamento regride com `php vendor/bin/phpunit --filter MultiEmpresaAceiteTest`.

---

## 12. Papéis, permissões e UX

| Papel | Toca | Não toca |
|-------|------|----------|
| **Comercial** | solicita faturamento (`faturamento.escrever`); vê FAT | preço sem alçada; produção |
| **Produção** | conclui OP/OS; pode expedir (fábrica pequena) | emitir/estornar FAT; emitir NF |
| **Fiscal** | emite/consulta NF no FAT; trata rejeição | desfazer TIT porque a NF falhou |
| **Expedição** | ENT- (`expedicao.escrever`) | baixar TIT; confirmar só no WhatsApp |
| **Financeiro** | TIT/COB/BX, carteira, CFE/COM | confirmar entrega |
| **Direção** | alçada futura: perda, desconto fora do parâmetro, NF antecipada | — |
| **Contador** | lê XML/relatórios quando oficiais | o ERP **não** fecha DAS/SPED/ECD |

SoD: `faturamento.escrever` ≠ `producao.escrever`. `expedicao.escrever` ≠ `financeiro.escrever`.

### Superfícies (sem jargão de infra)

| Onde | O que a pessoa vê |
|------|-------------------|
| Pedido produzido | Preview humano → **Faturar e gerar cobranças** |
| Financeiro → Faturamentos | Lista `FAT-`; ficha com itens, sinal, parcelas, NF |
| Ficha da NF | Prévia JSON Focus + DANFE/DANFSe HTML A4 (marca **PRÉVIA SEM VALOR FISCAL** se não oficial) |
| Expedição | Fila após FATURADO; balcão × transporte |
| Contas a receber | Aging + ficha + BX; drill até PED/FAT/COB |
| Comissões | COM- / CFE- sobre o recebido |
| Painel | Fila “a faturar” (`PRODUZIDO`) e “a expedir” (`FATURADO`/`EM_ENTREGA`) |

EMP ativa visível no header. Seletor só se N>1. Atribuição TRIGGER discreta (rodapé/PDF) — EMP não é marca.

---

## 13. API (contrato estável)

```
GET  /pedidos/{id}/faturamento-preview
POST /pedidos/{id}/faturar
GET  /faturamentos
GET  /faturamentos/{id}
POST /faturamentos/{id}/estornar          { motivo }
POST /faturamentos/{id}/emitir-nf         mesma ref Focus; promove STUB
POST /faturamentos/{id}/consultar-nf
GET  /financeiro/faturamentos/:id/nf/:docId/ficha   (UI satélite, print)
```

Escopo: EMP do contexto + `hasEmpresaAccess`. Escrita: `faturamento.escrever`.

---

## 14. Relatórios que “provam” o mapa

| Prova | Onde está hoje | Estudo 32 |
|-------|----------------|-----------|
| Faturamentos do período (bruto, sinal, saldo, `nf_status`) | Lista/ficha FAT | Faturamento por período |
| Prévia / DANFE operacional | Ficha DFS | XML oficial após hub |
| Aging TIT 0–30–60–90+ + vence hoje | Carteira a receber/pagar | Aging |
| Adiantamentos a apropriar | TIT `ADIANTAMENTO` quitado até o FAT | Adiantamentos |
| Entregas pendentes com FAT | Fila expedição | Entregas com NF |
| Comissões RECEBIDO | COM- / CFE- | Comissão a provisionar |
| Previsão operacional (receber − pagar) | Carteira (label **não** é DRE) | Fluxo de caixa operacional |
| Export contador XML + `faturamento_resumo` | Ainda não | `EXPORT_CONTADOR_FOLHA_LAYOUT.txt` |
| DRE gerencial M10 | Ainda não (NAT 1–5 já seedada) | UC-GER-001 |

---

## 15. As-built versus estudo — e o próximo caminho

Caminho escolhido: **fechar o efeito de estoque da NF oficial (BL-066)** e parar. Cancelamento Focus, DEV- e parcial continuam ADR + BL — não reescrevem o FAT.

### Entregue (não mexer)

- Preview + FAT + apropriação de sinal + TIT/COB do saldo  
- Estorno comercial com NF não oficial  
- Plano DFS + emissão Focus + prévia + stub local (`FISCAL_EMISSOR=stub` só local/testing; hub sempre ganha)  
- `SAIDA_VENDA` na NF-e Focus autorizada (não no FAT, não no stub, não na NFS-e)  
- ENT- após FAT (política NF)  
- COM- base RECEBIDO + CFE  
- Carteira (aging, ficha, BX, avulso sem NAT da espinha)

### Fora de escopo até ADR (ordem recomendada)

1. **Cancelamento Focus + CCe (UC-FIS-003)** — estorna `SAIDA_VENDA` e destrava desfazer FAT com NF oficial.  
2. **`DEV-` ponta a ponta** — fiscal + estoque + financeiro + COM; pode vir de RMA.  
3. **Faturamento parcial (UC-FIS-004)** — N FAT/NF no mesmo `pedido_id` quando 1 PED : N itens ou entrega fracionada for política real.  
4. **Frete receita no FAT (`1.01.05`)** e NAT própria do ferramental (`1.01.04`) — hoje a faca viaja no bruto com a família do item; COM já exclui matriz/faca corretamente.  
5. **MSG- (WhatsApp oficial)** da NF/boleto — canal, não documento.  
6. **Juros / desconto / perda com alçada** e estorno de BX com efeito em COM-/PED encerrado.  
7. **DRE M10** e export contador — NAT já existe; não misturar com a carteira.

**Não fazer agora:** faturamento antecipado integral (NF antes de produzir) — alçada excepcional do estudo, não padrão. Catálogo `COND-` / motor CRT. Split dual mercadoria×serviço de um item PA. TMS/CT-e. LAI. Auto-faturar na OP.

---

## 16. Checklist do mapa (implantar / treinar / regressão)

- [x] Equipe distingue FAT × DFS/NF × TIT × COB × BX × ENT × COM  
- [x] Padrão: fatura após conclusão; sinal é exceção controlada  
- [x] Preço só do PED; unitário ≠ `valor_etiqueta`  
- [x] 1 FAT → 0..N TIT conforme condição; sinal não é cobrado de novo  
- [x] Numeração fiscal só do Focus (ou stub explícito, nunca “como se fosse o fisco”)  
- [x] Baixa de estoque PA **não** no FAT — `SAIDA_VENDA` só na NF-e Focus autorizada (BL-066)  
- [x] Frete receita ≠ frete despesa; frete fora do FAT nesta fase  
- [x] Estorno comercial ≠ cancelamento Focus ≠ DEV-  
- [x] Multi-empresa: `empresa_id` do contexto  
- [x] Contador fecha fiscal; ERP alimenta com disciplina  
- [ ] Parcial amarrado ao mesmo `ped_id` (fase seguinte)  
- [ ] Cancelamento/DEV com estorno completo  

Regressão de isolamento: `php vendor/bin/phpunit --filter MultiEmpresaAceiteTest`.  
Cadeia feliz: `OrcamentoAteComissaoE2ETest` · `FaturamentoPedidoTest` · `EmissaoFiscalSaidaTest` · `SaidaVendaNfAutorizadaTest` · `EntregaPedidoTest`.

---

## 17. Proibido

1. Cobrar de novo o sinal já baixado; cancelar TIT `ADIANTAMENTO` no estorno do FAT.  
2. Inventar série/número/chave/XML `nfeProc` **como se fossem do fisco**.  
3. Baixar PA no FAT, no ENT ou no stub.  
4. Faturar PED que não está `PRODUZIDO`.  
5. Auto-faturar na conclusão da OP/OS.  
6. PRODUÇÃO emitir ou estornar FAT.  
7. Segundo FAT **vigente** no mesmo PED.  
8. Apagar FAT/TIT/COB/DFS/ENT/COM.  
9. Estornar FAT com NF Focus autorizada/processando, TIT pago/parcial, COB paga, BX, ENT vigente ou COM já liberada/paga.  
10. Desfazer FAT porque o Focus rejeitou a nota.  
11. Multiplicar quantidade pelo `valor_etiqueta` da faixa.  
12. Fazer do TIT o dono do romaneio; auto-baixa na confirmação da ENT.  
13. Pagar comissão no faturar ou no confirmar ENT (exceto apropriação do sinal, que é RECEBIDO antecipado).  
14. Misturar EMP; tratar EMP como cliente ou stage.  
15. Fechar DAS/SPED/ECD/DRE nesta tela.  
16. Grupo 9 / LAI / “caixa 2”.

Alterar este mapa ou as ADRs que ele cita exige alinhamento explícito ao estudo 32.

---

## 18. Âncoras

| Para | Onde |
|------|------|
| Operar emissão FAT/TIT | `ADR_FATURAMENTO_COBRANCA.md` · `FaturamentoService` |
| Operar NF | `ADR_EMISSAO_NFE_NFSE.md` · `EmissaoFiscalService` |
| Trilhos industrialização × serviço × cessão | `ADR_OPERACOES_SAIDA.md` |
| Baixa PA na NF | `EstoqueSaidaVendaService` · MOV `SAIDA_VENDA` |
| Operar recebimento | `ADR_CARTEIRA_FINANCEIRA.md` · `RECEBIMENTO_BAIXA_COBRANCA.txt` |
| Operar entrega | `ADR_ENTREGA_EXPEDICAO.md` |
| Comissão | `ADR_COMISSAO_VENDEDOR.md` |
| Conclusão OP/OS | `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `CONCLUSAO_PRODUCAO.txt` |
| Sinal | `ADR_ORC_ADIANTAMENTO_PIX.md` |
| Naturezas | `ADR_NATUREZAS_GERENCIAIS.md` |
| Layout Focus | `../28` `FOCUS_NFE_MAPEAMENTO.md` |
| Norma mental original | `../32/MAPA_FATURAMENTO_EXPLICADO.txt` |
| Fronteira Cursor | `.cursor/rules/faturamento-cobranca.mdc` |

Faturar, neste produto, é **FAT vigente + títulos vivos no PED apto**.  
A nota fiscal anda no mesmo FAT; autorização oficial é o eixo fiscal, não o gatilho da cobrança.  
Cobrar sem NF (sinal) e desfazer (estorno comercial hoje; cancel/DEV depois) são ramos do mesmo mapa.
