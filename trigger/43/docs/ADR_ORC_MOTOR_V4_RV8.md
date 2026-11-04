# ADR-043-ORC-015 — Motor v4 · paridade Excel rv8

**Status:** Aceito  
**Data:** 2026-11-04  
**Contexto 43:** comercial · motor ORC  
**Antecessor:** `ADR_ORC_MOTOR_REGRAS.md` · `ADR_ORC_TROCA_PRETO_INTEIRO_CROMIA.md`  
**Fonte Excel:** `orca_oficial_v8.xlsm` / `ORÇAMENTO OFICIAL rv8.xlsm` (álgebra ≡ rv7)  
**`motor_version`:** **4**

---

## Contexto

O motor v3 e o `catalog_oficial.json` ainda seguiam o **rv4**. A planilha oficial evoluiu (rv7→rv8) com mudanças de álgebra em perdas e tinta. Diff rv7↔rv8 = só inputs de amostra; o salto a portar é **rv4 → rv8**.

---

## Decisão

Bump `MOTOR_VERSION` para **4**. Quatro mudanças de álgebra (sem DSL):

### R6 — Perda de acerto (I)

Unificado para todas as cores (0–8 e `4V` ≡ Excel `4.1`):

```
perda_acerto_m2 = (largura ÷ 100) × ml(cores) × colunas
```

`ml(cores)` vem de `perda_papel_acerto_ml` (aba `PERDA DE ACERTO OK`, col. C).  
Deixa de usar m² fixos 0–3, `(larg+1)/100×F6` e metros 4V–8 sem ×colunas.

### R5b — Perda troca produto (J)

```
perda_troca_m2 = (largura ÷ 100) × colunas × 7 × max(0, modelos − 1)
```

Fator **7** é constante estrutural (como o 5 da bobina). Com **1 modelo = 0**.

### R7 — Perda acabamento (K)

```
perda_acab_m2 = tabela(acabamento) × (largura ÷ 100) × modelos
```

Multiplicador = **modelos** (`H8`), não colunas.

### Tinta (G) — colunas rv8

`TINTA (2)!H:P` com rates por `1|2|3|4|4.1|5|6|7|8`.  
`4V` resolve para a coluna `4.1`. Lisa (0) → taxa 0.  
Seleção de faixa MTS inalterada (≤20…≤300 / >300).

---

## O que **não** muda (intencional)

| Item | Motivo |
|------|--------|
| `valor_caixa = 0` | Caixa escolhida na OP — fora do preço da etiqueta |
| PRETO INTEIRO = `(modelos−1)×(cromia÷4)` | Motor v3 / ADR-014 — manter |
| Gordura / frete / faca / artes | Pós-motor |
| Snapshot imutável de ORCs já calculados | Recalcular só sob ação explícita |
| Seed não sobrescreve parâmetros editados pela EMP | `ADR_ORC_MOTOR_REGRAS` |

---

## Catálogo

- Fonte canônica do sync: xlsm **rv8**.
- `perda_papel_acerto_ml` = tabela ml da aba OK (incl. `4V`←`4.1`).
- `tinta_matriz.rates` expande colunas `4.1`/`5`–`8`.
- Escalares legados `perda_papel_0_3` / `perda_acerto_m_*` / `perda_papel_f6` permanecem no JSON/UI para compat e overlay EMP, mas **não** alimentam R6 no motor v4 quando `usaTintaMatriz()`.

---

## Faça

- ADR + golden tests + `motor_version` 4 juntos.
- Mapear `4.1` ↔ `4V` na chave de cores (UI continua `4V`).
- Fixture BRAHVA regenerada sob v4 (não misturar “Excel legado” com “rv8”).
- Diff de preço em staging antes de seed EMP.

## Não faça

- Recolocar caixa no preço.
- Estender cromia/4 a `PRETO INTEIRO+BORDA*` sem ADR.
- Force-update de preços de papel da EMP.
- DSL / fórmula digitada pelo usuário.

---

## Rastreio

- `OrcamentoMotor` · `OrcamentoCatalogo` · `OrcamentoMotorRegras`
- `scripts/sync_orcamento_from_xlsm.py` · `catalog_oficial.json`
- Testes: `OrcamentoMotorTest` · fixtures BRAHVA + rv8
