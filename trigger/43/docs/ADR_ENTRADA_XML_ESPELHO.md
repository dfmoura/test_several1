# ADR-039-CPR-004 — Espelho fiscal na entrada (matéria-prima do livro)

**Status:** Aceito  
**Data:** 2026-08-13  
**Contexto 39:** BL-048  
**Norma:** `../32` — `CONTABILIDADE_FISCAL_SEM_FECHAMENTO.txt` · `PADRAO_DECIMAL_CALCULOS.txt` §5.4 · `CONTROLE_ESTOQUE_PROFISSIONAL.txt` §4 · `CADASTRO_PRODUTOS_COMPRA.txt` · `REVISAO_ICMS_ST.txt` · `REVISAO_ANTECIPACAO_ICMS_MG.txt` · `CASOS_USO_M07_COMPRAS.txt` UC-CPR-004  
**Preserva:** `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_ENTRADA_XML_ASSIST.md` · `ADR_ENTRADA_XML_PARCELAS.md`

---

## Decisão

Na confirmação da entrada, se o XML estiver presente, o ERP **guarda o documento legal** e um **espelho estruturado** — sem escriturar, sem recalcular imposto e sem misturar com estoque/financeiro.

```
OC ABERTA/PARCIAL
  → preview XML (já existe)
  → humano confere de-para / parcelas / lote
  → receber()  →  MOV (estoque=OC) + TIT (pagar=dup) + nfe_entrada (fiscal=XML)
```

| Verdade | Fonte | Agregado |
|---------|--------|----------|
| Estoque / custo médio | Qtde×preço **OC** conferidos | MOV |
| Contas a pagar | Parcelas **NF** (`dup`) | TIT `5.06` |
| Matéria-prima do livro | XML **verbatim** + snapshot copiado | `nfe_entrada` |

O ERP **não** fecha SPED nem publica “Livro de Entradas” oficial. O espelho é a base para export futuro ao contador e para créditos na virada ao Lucro Real (estudo 32).

### Regras

1. XML só preenche; humano confirma; `receber()` permanece o único lançamento de saldo.  
2. Sem XML → entrada operacional segue; **não** nasce `nfe_entrada` (aviso na UI, não bloqueio).  
3. Com XML → persiste arquivo privado (guarda 5 anos) + cabeçalho/itens **como vieram no XML** (PADRAO §5.4). Zero recálculo.  
4. Chave 44 única por EMP. XML cuja chave ≠ `nf_chave` informada → **bloqueia** (não amarra documento errado).  
5. Destinatário ≠ EMP ativa → continua **ALERTA** (não mistura livro); o espelho ainda é gravado se o humano confirmar.  
6. Item fiscal ≠ item de estoque (parcial / de-para / IPI). Impostos **não** entram em `estoque_movimento_itens`.  
7. Nome de produto: **espelho fiscal de entrada**. Nunca “livro oficial”, SPED ou apuração.

### Modelo

- `nfe_entradas`: EMP + chave + série/número/modelo + ide (`natOp`, `idDest`) + emit/dest + totais + **`complementos` JSON** (`infRespTec`, `infAdic`, `transp`, `pag`, `fat`, `ide_extra`, dest nome/e-mail) + `xml_path` + `movimento_id`.  
- `nfe_entrada_itens`: NCM, CEST, CFOP, orig, CST/CSOSN, bases/alíquotas/valores ICMS·IPI·PIS·COFINS (cópia) + **IBSCBS** (CST/`cClassTrib`/`gIBSCBS` em `impostos.ibscbs` + totais `IBSCBSTot`) + `impostos` JSON cru + **`x_ped` / `n_item_ped` / `n_fci`** (`prod/xPed`, `prod/nItemPed`, `prod/nFCI` — cópia fiel).  
- Lote: `prod/rastro` tem prioridade; se ausente, fallback conservador em `infAdProd`/`xProd` (rótulos `LOTE:` / `nLote`) — humano confirma no assist.  
- Storage: disco `local` (privado) `nfe-entradas/{empresa_id}/{chave}.xml`.

Pós-receber: ficha física com QR por volume → `GET /estoque/movimentos/{id}/ficha-entrada` (mesmo payload `VOL:…` da etiqueta F3).

### Emenda 2026-09-08 — complementos do cabeçalho (infRespTec+)

O XML já traz grupos que o snapshot anterior ignorava. Decisão: **cópia fiel em `nfe_entradas.complementos`**, mesma regra do espelho (sem recálculo, sem alimentar MOV/TIT).

| Grupo XML | Snapshot | Uso na conferência |
|-----------|----------|--------------------|
| `infRespTec` | `complementos.resp_tec` | Contato do responsável técnico do software emissor |
| `infAdic` (`infCpl` / `infAdFisco` / obs) | `complementos.inf_adic` | Pedido/romaneio/vendedor e texto livre do emitente |
| `transp` / `vol` / `veicTransp` / lacres | `complementos.transporte` | Modal de frete, transportadora, veículo, volumes (qVol/esp/marca/nVol/pesoL/pesoB/lacres) |
| `pag` / `cobr/fat` | `complementos.pag` · `complementos.fat` | Forma de pagamento e fatura (parcelas `dup` já viram TIT) |
| `ide` (dhSaiEnt / dPrevEntrega) | `complementos.ide_extra` | Saída e previsão de entrega |
| `dest/xNome` · `dest/email` | `complementos.dest` | Nome/e-mail do destinatário além do CNPJ/IE/UF |

Preview (`EstoqueEntradaXmlService`) e pós-receber (`NfeEntradaService::toOut`) expõem o mesmo bloco em `espelho.complementos`. Ausência no XML → `null` (não inventa).

---

## Fora de escopo

- Tela/export “Livro de Entradas” / EFD C100·C170  
- Download Focus (permanece fora)  
- Caixa DF-e / sync destinadas → **`ADR_CAIXA_DFE_NFE_DESTINADAS.md`** (XML ainda chega ao espelho só via `receber()` na OC)  
- Apuração de crédito / antecipação MG como guia  
- Rateio IPI no custo médio  
- Entrada sem OC · validação de assinatura  

---

## Proibido

1. Auto-receber no upload.  
2. Segundo writer de saldo.  
3. Recalcular ou arredondar imposto do XML.  
4. Inflar MOV/TIT com colunas fiscais de item.  
5. UI que se apresente como escrituração oficial / SPED.  
6. Obrigar XML para conferir a OC.
