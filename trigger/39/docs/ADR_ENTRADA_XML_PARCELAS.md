# ADR-039-CPR-003 — Parcelas XML → multi-TIT na entrada

**Status:** Aceito  
**Data:** 2026-08-11  
**Contexto 39:** BL-038  
**Norma:** `../32` — `CASOS_USO_M07_COMPRAS.txt` UC-CPR-004 · `CASOS_USO_M06_FINANCEIRO.txt` · `RECEBIMENTO_BAIXA_COBRANCA.txt` · `CONTABILIDADE_FISCAL_SEM_FECHAMENTO.txt`  
**Preserva:** `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_ENTRADA_XML_ASSIST.md` · `ADR_NATUREZAS_GERENCIAIS.md`

---

## Decisão

O XML da NF-e **assiste** o financeiro na entrada: as duplicatas `cobr.dup` viram **N títulos a pagar** (mesmo `movimento_id`, NAT `5.06`), sem auto-lançar e sem segundo caminho de estoque.

```
XML preview
  → parcelas (nDup / dVenc / vDup) + totais fiscais mínimos
  → humano confere / edita
  → receber()  →  MOV (estoque = OC) + TIT×N (pagar = parcelas)
```

| Verdade | Fonte | Uso |
|---------|--------|-----|
| Estoque / custo médio | Qtde×preço **OC** conferidos | MOV + `estoque_saldos` |
| Contas a pagar / caixa | Parcelas **NF** (`dup`) ou 1 vencimento manual | TIT `PAGAR` |
| Trilha ao contador | `nf_chave` + `nf_valor` + `nf_totais` no MOV | Export futuro; ERP **não** fecha SPED |

### Regras

1. Sem `parcelas[]` → **1 TIT** com `vencimento` + valor = soma itens (comportamento BL-033; zero regressão).  
2. Com `parcelas[]` (≥1) → **1 TIT por parcela**; `vencimento` raiz opcional; soma dos valores das parcelas = obrigação ao fornecedor.  
3. Soma `vDup` ≠ `vNF` → **ALERTA** no preview (não bloqueia).  
4. Soma parcelas ≠ valor itens OC:
   - se diferença = IPI/frete/outro da NF → **INFO** (esperado; pagar = vNF, estoque = OC/vProd);
   - senão → **ALERTA** (humano confere).  
5. Destinatário XML ≠ CNPJ da EMP ativa → **ALERTA** com CNPJs; se outra EMP da instalação casar o dest → sugere trocar de EMP (não misturar livro).  
6. Preview ≠ lançamento; humano confirma.  
7. Cada TIT: `parcela`, `n_dup`, documento `NF/{numero}-{nDup}` quando houver número.

### Modelo

- `estoque_movimentos.titulo` HasOne → **HasMany `titulos`** (API: `titulo` = 1º por compat.; `titulos` = lista).  
- Colunas TIT: `parcela`, `n_dup`.  
- Colunas MOV: `nf_valor`, `nf_totais` (JSON enxuto: v_prod, v_ipi, v_icms, v_frete, v_desc, v_outro, v_st, v_nf).

---

## Fora de escopo

- Escrituração / SPED / ECD / PGDAS  
- De-para NAT → plano de contas do contador  
- Focus download / manifestação  
- Rateio automático IPI no custo médio  
- COB bancária de contas a pagar  

---

## Proibido

1. Auto-receber no upload.  
2. Segundo writer de saldo paralelo a `receber()`.  
3. Usar `2.01` no TIT de compra de estoque.  
4. Apagar TIT ao estornar MOV sem fluxo auditável (futuro).  
5. Tratar divergência estoque×pagar como bug quando IPI/frete explicam a diferença.
