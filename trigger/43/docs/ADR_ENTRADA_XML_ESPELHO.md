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

- `nfe_entradas`: EMP + chave + série/número/modelo + ide (`natOp`, `idDest`) + emit/dest + totais + `xml_path` + `movimento_id`.  
- `nfe_entrada_itens`: NCM, CEST, CFOP, orig, CST/CSOSN, bases/alíquotas/valores ICMS·IPI·PIS·COFINS (cópia) + `impostos` JSON cru.  
- Storage: disco `local` (privado) `nfe-entradas/{empresa_id}/{chave}.xml`.

---

## Fora de escopo

- Tela/export “Livro de Entradas” / EFD C100·C170  
- Focus download / manifestação SEFAZ  
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
