# ADR — Gordura comercial no ORC (pad interno · pós-motor)

**Status:** Aceito  
**Data:** 2026-09-10 · emenda 2026-09-10 (R$ em vez de %)  
**Contexto 43:** comercial · extensão de `ADR_ORC_MOTOR_REGRAS` / `ADR_ORC_LINK_APROVACAO`  
**Norma:** estudo 32 — GERACAO_ORCAMENTO (proposta só comercial; custo/margem internos)

---

## Contexto

O comercial precisa **readequar** o preço ao cliente sem alterar tarifas do catálogo nem a álgebra R1–R20. “Gordura” é pad de negociação em **R$**: entra no valor orçado, **não** aparece na proposta pública nem na ficha do cliente.

---

## Decisão

| Escolha | Motivo |
|---------|--------|
| **`valor_gordura` no job** (R$ ≥ 0, default 0) | Um campo **por job** (hoje = ORC flat; com `ADR_ORC_ITENS` = por **item/posição**); mesma pad em todas as faixas da escada daquele job |
| **Pós-motor em `enrichResult`** | Não toca R1–R20 / `motor_version`; BRAHVA intacto |
| **Soma em `valor_etiqueta` + re-ceiling** | Matriz, faca e artes continuam cotados à parte; frete continua fora do total |
| **Snapshot:** `valor_etiqueta_base` + `valor_gordura` + `valor_etiqueta` | Auditoria interna; PED/FAT/comissão usam o `valor_etiqueta` final |
| **Fora do `dtoComercial`** | Cliente vê só totais/unitário finais — nunca a linha de gordura |
| **Sem coluna SQL** | Verdade no `input_snapshot` / `result_snapshot` |
| **Label UX: “Gordura”** | Sem “%”; campo em R$ |

```
motor (R1–R20 ou serviço)
  → valor_etiqueta_base
  → + valor_gordura → ceiling → valor_etiqueta
  → + matriz → valor_total
  → + faca + artes → valor_total_proposta
  → frete informativo (nunca soma)
```

### Regras

1. `valor_gordura` ≥ 0; ausente / null → 0 (ORCs legados inalterados).
2. Com `valor_gordura = 0`, faixas **não** ganham campos extras (snapshot mínimo).
3. Comissão do vendedor: base = etiquetas faturadas → inclui gordura (preço de venda).
4. Guia de produção / OP: **sem** gordura.
5. Industrialização **e** serviço: mesmo campo.

### UX (interno)

- Formulário ORC: campo **Gordura** (R$), nota “interno — cliente não vê”.
- Resultado / composição / ficha operacional A4: mostram a linha quando > 0.
- Proposta pública, prévia comercial e ficha do cliente: **omitidos**.

---

## Proibido

1. Colocar gordura dentro do motor R1–R20 ou diluir em papel/hora-máquina.
2. Expor `valor_gordura` / `valor_etiqueta_base` no DTO público ou na ficha do cliente.
3. Aplicar gordura sobre matriz, faca, artes ou frete.
4. Segundo escritor de preço no PED/FAT — o pad já está no `valor_etiqueta` do snapshot.

---

## Rastreio

- `OrcamentoService::enrichResult` · `OrcamentoValidationRules` · `persistableInput`
- UI: `orcamentoForm.ts` · `OrcamentoFormPage` · `OrcamentoResultado` · `OrcamentoFichaSheet` · `OrcamentoDetailPage`
- Testes: `OrcamentoGorduraTest` · asserts em proposta pública
