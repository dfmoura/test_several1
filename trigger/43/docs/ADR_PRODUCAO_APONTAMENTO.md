# ADR-043-PRD-004 — Apontamento no chão (concluir a OP)

**Status:** Aceito  
**Data:** 2026-09-23  
**Contexto:** instalação 43 · conclusão misturada no escritório da OP  
**Preserva:** `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_PRODUCAO_COLETA_DIRIGIDA.md` · `ADR_PAINEL_COCKPIT.md`

---

## Contexto

A OP já conclui com `POST /ordens-producao/{id}/concluir` (retorno → `ENTRADA_SOBRA`, PA → `ENTRADA_PA`, readequação do PED). O formulário vivia no detalhe da OP — PCP e chão no mesmo card. Depois das Retiradas, a baixa saiu da OP; o apontamento ainda estava no escritório.

## Decisão

```
1. RECEBER     quem pegou o material na máquina     (handoff, sem MOV)
2. APONTAR     retorno / perda / qtde boa / refugo  (formulário atômico)
3. CONCLUIR    mesmo POST …/concluir                (writer único)
4. VER         resultado + embalagem na OP
```

| Escolha | Motivo |
|---------|--------|
| **Duas portas, um cérebro** | OP (PCP) lê; Apontamentos (chão) grava. Sem segundo `concluir`. |
| **Sem documento `APONT-`** | O confirmar **é** o apontamento. Sem rascunho de retorno/perda. |
| **Fila + ficha** | Espelho das Retiradas. Sem hub, sem MES. |
| **Painel `op_curso`** | Mesma fila, agora só OP com `SAIDA_PRODUCAO` → `/ordens-producao/apontamentos`. KPI da cadeia continua contando todas as OP abertas. |
| **Menu** | Produção → **Apontamentos** (após Retiradas). |

### Superfícies

| Porta | Quem | Ação |
|-------|------|------|
| OP | PCP | Pedido, ficha de retirada (anexo), avaria da mesa, CTA. Sem concluir. Resultado e embalagem depois de `CONCLUIDA`. |
| Produção · Apontamentos | Chão | Receber na máquina, apontar, concluir. Complemento de papel aponta para a ficha do estoque. |
| Painel | Ação de hoje | `op_curso` se `count > 0`. |

### Fora de escopo

- Relógio, máquina, turno, apontamentos parciais  
- Ledger `APONT-` / rascunho antes de concluir  
- Avaria de mesa nesta tela (fica na ficha do estoque)  
- Segundo `EstoqueSaldoWriter`

## Invariantes

1. Isolamento `empresa_id`.  
2. Saldo e CM só via `EstoqueSaldoWriter`.  
3. `POST /ordens-producao/{id}/concluir` permanece o único motor.  
4. Handoff não bloqueia concluir (aviso, não trava).

Alterar esta ADR exige decisão explícita (produção). Sem MES e sem segundo writer.
