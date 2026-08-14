# ADR-039-FAT-001 — Faturamento do PED + cobrança do saldo (adiantamento a apropriar)

**Status:** Aceito (emenda BL-050)  
**Data:** 2026-08-13  
**Contexto 39:** BL-049 · BL-050  
**Norma:** `../32` — `FATURAMENTO_GERACAO_COBRANCA.txt` · `MAPA_FATURAMENTO_EXPLICADO.txt` · `CONCLUSAO_PRODUCAO.txt` · `RECEBIMENTO_BAIXA_COBRANCA.txt` · `CASOS_USO_M05` UC-FIS-001/004 · `CASOS_USO_M06` UC-FIN-001/002  
**Relacionada:** `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_ORC_ADIANTAMENTO_PIX.md` · `ADR_CONDICOES_COMERCIAIS_PAR.md` · `ADR_NATUREZAS_GERENCIAIS.md`

---

## Contexto

OP/OS concluída deixa o PED `PRODUZIDO` com `qtde_faturavel` (quantidade boa ±tolerância). Falta o eixo financeiro do mapa: transformar o pedido apto em **documento de faturamento** + **TIT/COB do saldo**.

O sinal (quando houve) já existe: TIT `origem=ADIANTAMENTO` quitado no aceite, **sem NF**. O estudo manda apropriar esse valor contra a fatura — não cobrar de novo.

Focus NFe (`FocusNfeClient`) emite NF-e/NFS-e no mesmo faturar quando o hub está apto (`docs/ADR_EMISSAO_NFE_NFSE.md`). TIT/COB não esperam a autorização. Estoque PA continua só na NF autorizada.

## Decisão

```
PED PRODUZIDO (qtde_faturavel > 0)
  → preview (humano confirma)
  → FAT-  (documento comercial/financeiro; 1 por PED nesta fase)
       ├─ etiquetas = qtde_faturavel × (valor_etiqueta / qtde_faixa)
       ├─ + matriz/clichê (fixo da faixa) + faca nova (se no snapshot)
       ├─ apropria min(sinal quitado, valor)  → não gera 2ª cobrança do sinal
       └─ saldo > 0 → TIT origem=FATURA (1..N pela condição) → COB se PIX/Boleto
  → PED FATURADO
```

| Escolha | Motivo |
|---------|--------|
| **Documento `FAT-`** | Agrupa o evento de faturamento. NF Focus entra depois no mesmo FAT (`nf_status` reservado). Sem inventar série/número SEFAZ. |
| **Humano confirma** | Estudo: FISCAL/COMERCIAL fatura; PRODUÇÃO não emite. Preview → commit. |
| **Qtde real** | `CONCLUSAO_PRODUCAO` §4: faturar produzido dentro da tolerância, não o pedido “cheio”. Preço unitário travado no PED. |
| **Unitário ≠ `valor_etiqueta`** | Motor ORC: `valor_etiqueta` é o **total** das etiquetas da faixa. Unitário = `valor_etiqueta / quantidade` (6 casas). Matriz/clichê e faca são fixos do job — não escalam com a qtde produzida. |
| **Sinal = apropriação** | TIT de adiantamento permanece (histórico). FAT registra `valor_adiantamento`. Condição “50% sinal + …” **não** gera outra parcela de sinal. |
| **Condição do snapshot** | PED herda `input` do ORC. Parser leve (à vista, N DDL, 14/28/42, % sinal). Sem catálogo `COND-`. |
| **COB só PIX/Boleto** | Reusa `BankProvider`. Transferência/Cartão → TIT sem COB. |
| **Sem baixa de PA** | Estudo: estoque PA só na NF autorizada. `ENTRADA_PA` da OP permanece. |
| **1 FAT vigente : 1 PED** | Fase 1 alinhada a 1 PED : 1 item. Parcial (UC-FIS-004) fica para quando houver NF. Estorno (emenda) libera novo FAT no mesmo PED. |
| **SoD** | `faturamento.escrever` ≠ `producao.escrever`. PRODUÇÃO não fatura. |

### Natureza gerencial

Folha de receita no TIT da fatura: `1.01.01` (PA) · `1.01.03` (SVC) · `1.01.02` (REV). Sinal já classificado em `1.01.01` no aceite — não relança.

### Status

| PED | Significado |
|-----|-------------|
| `PRODUZIDO` | Apto a faturar (fila). |
| `FATURADO` | FAT vigente confirmado; TIT/COB do saldo emitidos (ou saldo zero após sinal). |

| FAT | Significado |
|-----|-------------|
| `CONFIRMADO` | Vigente. 1 por PED. |
| `ESTORNADO` | Histórico. Não apaga FAT/TIT/COB. |

`nf_status` no FAT deriva dos documentos fiscais (`PENDENTE` enquanto o hub não autoriza). Não bloqueia cobrança do saldo.

## Emenda — estorno com NF pendente (BL-050)

O estudo distingue **cancelamento fiscal** (NF autorizada + Focus + prazo legal) de **devolução DEV-**. Nenhum dos dois cabe aqui: a NF ainda não existe.

Enquanto `nf_status = PENDENTE` o FAT é só documento comercial/financeiro. Errar condição, parcela ou cliente e não poder refazer trava a operação. O caminho certo é **estorno compensatório** (UC-PLT-007 / RNF-13): nunca apagar; marcar estornado; cancelar TIT/COB abertos; devolver o PED à fila.

```
FAT CONFIRMADO + nf_status PENDENTE
  + TIT origem=FATURA todos ABERTO (ou nenhum)
  + COB não PAGA
  + sem BX
  → humano confirma com motivo
  → cancela COB no BankProvider
  → TIT FATURA → CANCELADO (saldo 0)
  → FAT → ESTORNADO (motivo + quem + quando)
  → PED → PRODUZIDO
  → sinal/adiantamento intacto · estoque intacto
  → novo FAT permitido no mesmo PED
```

| Escolha | Motivo |
|---------|--------|
| **Só NF pendente** | Sem chave SEFAZ não há cancelamento Focus. NF autorizada = outro ramo (UC-FIS cancelamento / DEV-). |
| **TIT tem que estar aberto** | Saldo já recebido exige compensação/crédito (RECEBIMENTO_BAIXA), não este atalho. |
| **Não mexer no sinal** | TIT `ADIANTAMENTO` é do aceite; a apropriação no FAT some com o estorno e volta a aplicar no próximo faturar. |
| **Não baixar/estornar PA** | Estoque PA só na NF autorizada — aqui nunca saiu. |
| **Não apagar** | FAT, TIT e COB permanecem. Unique `empresa+pedido` cai; vigente = `status=CONFIRMADO` com lock. |
| **Mesma permissão** | `faturamento.escrever` (COMERCIAL/FINANCEIRO/FISCAL). PRODUÇÃO não estorna. Motivo ≥ 3 caracteres. |

Idempotente: FAT já `ESTORNADO` devolve o documento sem tocar o PED (pode já haver um FAT novo vigente).

## Emenda — emissão NF-e / NFS-e no mesmo faturar (BL-051)

O FAT continua comercial/financeiro. No mesmo commit o sistema **planeja** `DocumentoFiscalSaida` (NF-e para PA/REV, NFS-e para SVC). Se o hub Focus padrão passou no teste do ambiente ativo, o POST sai depois do commit — numeração só na resposta. Falha fiscal não desfaz TIT/COB. IM não é obrigatória salvo `im_obrigatoria_nfse`.

Detalhe: `docs/ADR_EMISSAO_NFE_NFSE.md`.

## Emenda — prévia da nota sem hub (BL-052)

Enquanto o hub Focus da EMP não estiver cadastrado e testado, o FAT continua válido e o `DocumentoFiscalSaida` permanece `PLANEJADO`. A tela mostra a **prévia** (mesmo conteúdo que irá ao hub), a **nota imprimível** (DANFE / DANFSe HTML A4 — homologação e produção) e o JSON de envio. Não há XML autorizado, chave 44 nem baixa de PA. No dia do cadastro, o mesmo documento / mesma `ref` é enviado.

Detalhe: `docs/ADR_EMISSAO_NFE_NFSE.md`.

## Fora de escopo

- Cancelamento de NF autorizada (Focus + prazo legal)  
- Baixa de estoque PA/REV na autorização  
- Faturamento parcial / várias FAT vigentes no mesmo PED  
- ENT- / romaneio / WhatsApp da NF  
- Devolução DEV-  
- Motor CRT / catálogo `COND-`  
- Faturamento antecipado (NF antes de produzir) — alçada excepcional do estudo  
- Split dual mercadoria×serviço de um único item PA  

## Proibido

1. Cobrar de novo o sinal já baixado.  
2. Inventar número/série de NF.  
3. Baixar PA no FAT (só NF autorizada).  
4. Faturar PED que não está `PRODUZIDO`.  
5. Auto-faturar na conclusão da OP.  
6. PRODUÇÃO emitir ou estornar FAT.  
7. Misturar EMP (`empresa_id` do contexto).  
8. Apagar FAT/TIT/COB (só estorno).  
9. Estornar FAT com NF autorizada, TIT pago/parcial ou COB paga.  
10. Multiplicar `qtde_faturavel` por `valor_etiqueta` (total da faixa) como se fosse unitário.  
11. Fingir NF autorizada (chave/XML/DANFE) para “ver a nota” sem o hub.  

Alterar esta ADR exige alinhamento explícito ao estudo 32.
