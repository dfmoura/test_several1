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
| **Menu** | Produção → **Na máquina**. Estoque → **A buscar**. |

### Superfícies

| Porta | Quem | Ação |
|-------|------|------|
| OP | PCP | Pedido, ficha de retirada (anexo), avaria da mesa, CTA. Sem concluir. Resultado e embalagem depois de `CONCLUIDA`. |
| Produção · **Na máquina** | Chão (`producao.ler`) | Conferir o que o estoque separou, **Confirmar: recebi**, produzir, concluir. Sem baixa nesta tela. Bobina = **volumes** e **metro linear** (writer em m²). |
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

## Emenda 2026-10-09 — fecho na ordem

O menu **Na máquina** sai. A API `/ordens-producao/apontamentos` permanece.

| Porta | Quem | Ação |
|-------|------|------|
| OP | Produção (`producao.escrever`) | Etiquetas boas, refugo, tolerância, **Fechar a ordem**. Sem grade de material. Retorno e perda vão zerados: o que ainda está fora entra como usado. |
| Estoque · **A buscar** | Almoxarifado | Saída e devolução de sobra, antes do fecho. |
| Painel `op_curso` | Ação de hoje | Mesma fila (OP com saída) → `/ordens-producao`. |

Handoff (`entregar-insumos`) não bloqueia o fecho e não tem cartão próprio.

## Emenda 2026-11-03 — fecho por modelo (satélite)

O card embutido na ficha da OP deixa de digitar boas/refugo. A porta de fecho vira satélite:

| Porta | Quem | Ação |
|-------|------|------|
| OP | Produção (`producao.ler`) | CTA **Fechar a ordem** → `/ordens-producao/:id/fechar`. Depois de `CONCLUIDA`: **Resultado** com totais + grade por modelo. Embalagem segue na OP. |
| `/ordens-producao/:id/fechar` | Produção (`producao.escrever`) | Grade **1 linha por modelo** (mesmo grão da Ficha da OP / planilha PED): planejado · boas · refugo. Totais = soma. Tolerância ±N% no **total**. Override + motivo iguais aos de hoje. |

```
modelos[] (boa/refugo por arte)
  → soma → qtde_boa / qtde_refugo
  → POST …/concluir (único motor)
  → 1× ENTRADA_PA no PA-ETQ do item
  → resultado_modelos JSON na OP (evidência)
```

| Invariante | Motivo |
|------------|--------|
| Um `POST …/concluir` | Sem segundo writer, sem doc `APONT-`, sem MES. |
| Totais no motor | Tolerância, PA, PED `qtde_produzida`/`qtde_faturavel` e readequação continuam no agregado. |
| `resultado_modelos` só evidência | Auditoria + Resultado. Não explode `PA-ETQ` por arte. |
| Sem modelos no item | Uma linha sintética (item) — mesma tela. |
| Payload legado sem `modelos[]` | Continua válido (totais só); `resultado_modelos` fica nulo. |

Fora: PA por modelo · MOV por modelo · grade de material no fecho · menu “Na máquina”.
