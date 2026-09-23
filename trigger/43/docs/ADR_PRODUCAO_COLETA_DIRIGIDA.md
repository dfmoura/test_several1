# ADR-043-PRD-003 — Coleta dirigida (requisição OP → volumes → produção)

**Status:** Aceito (Fases A–D entregues)  
**Data:** 2026-09-23  
**Contexto:** instalação 43 · gap de visibilidade na separação da OP  
**Preserva:** `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_ESTOQUE_LOTE_VALIDADE.md` · `ADR_CADASTRO_INSUMO_VOLUME.md` · `ADR_RASTREIO_INSUMOS_PRODUCAO.md` · `ADR_PAINEL_COCKPIT.md`

---

## Contexto

A OP já baixa MP/EMB com `SAIDA_PRODUCAO` via `EstoqueSaldoWriter` (empenho leve → confirmar). SKU com lote consome **FEFO** (validade) → **FIFO** (entrada). Volume, local e validade já existem no almoxarifado (F3/F4). Sem a coleta dirigida, o operador via só SKU + quantidade.

## Decisão

```
1. PLANEJAR     preview FEFO/FIFO + local + L×C + validade     (OP e Estoque)
2. RETIRAR      QR VOL: ou manual — só no Estoque (ficha)      (mesmo writer)
3. BAIXAR       volumes explícitos → SAIDA_PRODUCAO
4. ENTREGAR     quem recebeu na máquina                        (handoff, sem MOV)
5. VER          ficha anexada à OP (ciclos MOV)
6. AVARIA       apontar na ficha → requisitar de novo (complemento)
```

| Escolha | Motivo |
|---------|--------|
| **Mesmo motor, duas portas** | OP (PCP) e Estoque → Retiradas (chão). Sem segundo cérebro. |
| **Baixa no confirmar** | Empenho continua leve. Sem saldo `empenhado`. |
| **QR = leitura** | Como Guardar: scan não grava; humano confirma. |
| **Handoff na OP** | `insumos_entregues_*` — quem/quando. Não é ledger. Complemento zera o handoff. |
| **Uma fila no Painel** | `op_separacao` só se `count > 0` → `/estoque/retiradas`. |
| **Menu + aba** | Item **Retiradas** em Produção (após a OP) e aba no Estoque. Sem hub de rastreio. |
| **Ficha = confrontação** | Sistema (pedido) × físico baixado. QR ou manual. Ciclos = MOV. Sem `REQ-`. |

### Superfícies

| Porta | Quem | Ação |
|-------|------|------|
| OP · Separação | PCP / produção | Pedido, ficha anexo (leitura), avaria, handoff. Sem confirmar baixa. |
| Estoque · Retiradas | Almoxarifado | Única confirmação física (todas as saídas, QR ou manual, extra, reposição) |
| Painel | Ação de hoje | Fila se houver pendência |

### Fora de escopo

- Empenho reservado / segundo saldo  
- Documento `REQ-` como ledger  
- WMS / app dedicado / lote de PA  
- Quarentena que bloqueie vencido  
- Custeio FIFO no lote  

## Invariantes

1. Isolamento `empresa_id`.  
2. Saldo e CM só via `EstoqueSaldoWriter`.  
3. Sem cadastro paralelo de insumos da OP — o fato oficial continua o MOV.  
4. Genealogia permanece leitura dos MOV.  
5. Soma de `volumes[]` = quantidade requisitada.

## Aceite

- [x] Fase A — preview + volumes no confirmar · `ProducaoColetaDirigidaTest`  
- [x] Fase B — `/estoque/retiradas` + QR + `POST …/confirmar`  
- [x] Fase C — handoff + fila `op_separacao` no Painel  
- [x] Fase D — ficha de confrontação (sistema × físico) anexada à OP · avaria → novo ciclo  
- [x] `requisitar` sem `volumes` intacto  
- [x] Confirmação física só no Estoque (OP não baixa)  

Alterar esta ADR exige decisão explícita (produção + estoque). Sem segundo writer e sem empenho pesado sem ADR novo.
