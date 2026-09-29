# ADR-043-ORC-014 — Troca PRETO INTEIRO = fração da cromia

**Status:** Aceito  
**Data:** 2026-09-29  
**Contexto 43:** comercial · motor ORC  
**Antecessor:** `ADR_ORC_MOTOR_REGRAS.md`  
**`motor_version`:** **3** (álgebra R5)

---

## Contexto

Com vários modelos no mesmo job e tipo de troca **PRETO INTEIRO**, o custo comercial da troca de arte não é bem representado só por `tempo_parada × taxa_hora`. O clichê de preto inteiro corresponde a **¼ da cromia** (mesma geometria da matriz/clichê).

A fórmula de cromia já existia em `OrcamentoMotor::calcularMatriz` + ceiling R$ 1. O catálogo `hora_parada_h["PRETO INTEIRO"]=0,25` continua sendo **horas de parada** (guia/OP) — **não** é o divisor da cromia.

---

## Decisão

Quando `tipo_troca_produto` = **`PRETO INTEIRO`** (match exato; **não** `+BORDA` / `+CALÇO`):

```
cromia = CEILING( ((Z×3,175)/10)+4 × (larg×col+4) × ncores × matriz_cm2 ; 1 )
valor_troca_produto = max(0, modelos − 1) × (cromia ÷ 4)
```

| Item | Comportamento |
|------|----------------|
| `valor_matriz` | Intacta (1º pedido / isenção) |
| Outros tipos de troca | R5 clássico: `hora × (modelos−1) × taxa` |
| `hora_troca_prod` | Continua do catálogo (produção) |
| Matriz `NÃO` / já cobrada | Cromia de referência ainda calculada; troca cromia/4 aplica se `modelos>1` |
| Divisor `/4` | Constante estrutural (`FRACAO_CROMIA_PRETO_INTEIRO`) — **não** reusa `tempo_h` |

---

## Faça

- Reusar `calcularMatriz` + `excelCeiling(..., 1)` — zero fórmula duplicada.
- Snapshot: `cromia_referencia`, `troca_produto_modo` (`cromia_preto_inteiro` \| `hora_parada`).
- Golden BRAHVA + unitário dedicados; incremento `motor_version`.

## Não faça

- Empilhar hora×taxa **e** cromia/4 no mesmo tipo.
- Aplicar a variantes `PRETO INTEIRO+…` sem ADR novo.
- Sobrescrever `valor_matriz` com a fórmula de troca.
- Tratar `tempo_h=0,25` como o `/4` da cromia.

---

## Rastreio

- `OrcamentoMotor` · `OrcamentoMotorRegras` (R5 + constante)
- UX: composição / parâmetros de ajuste (rótulo estrutural, sem override de hora)
- Testes: `OrcamentoMotorTest` · fixture BRAHVA
