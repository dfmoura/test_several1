# ADR-039-PRD-002 — Rastreio de insumos da produção (genealogia)

**Status:** Aceito  
**Data:** 2026-08-13  
**Contexto 39:** BL-054  
**Norma:** `../32` — `CONTROLE_ESTOQUE_PROFISSIONAL.txt` §6 · `CONCLUSAO_PRODUCAO.txt` §2 · `ESTOQUE_FLUXO_SAIDA_RETORNO_PA.txt` §2.2 · `POS_VENDA_RMA_GARANTIA.txt` §1–5 · `CASOS_USO_M03` UC-PRD-004 · `CASOS_USO_M04` UC-EST-001  
**Relacionada:** `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_ESTOQUE_LOTE_VALIDADE.md` · `ADR_ENTRADA_XML_ESPELHO.md`

---

## Contexto

Depois de produzir, o PA pode já estar no cliente. Reclamação de qualidade (adesivo, tinta, substrato) exige **rastreio antes de culpa**: da OP/PED até o lote usado, a NF de entrada e o fornecedor — para reportar com documento, não por achismo.

O sistema já grava o rastro: `SAIDA_PRODUCAO.item.lote_id` (FEFO) e `ENTRADA_COMPRA` com NF/OC/fornecedor. Falta a **visão de genealogia** — consultar e imprimir, sem segundo estoque.

Estudo 32 §6.2: lote em substrato/tinta “permite rastrear reclamação de cliente até a NF do fornecedor”. Conclusão da OP: “lotes usados registrados (rastreio)”. RMA (fase 2) **depende** deste rastro; não o substitui.

## Decisão

```
Cliente / PED / OP / lote / NF
  → MOV SAIDA_PRODUCAO (itens + lote_id + qtde)
  → estoque_lotes (código, entrada, validade)
  → origens do lote até o instante da saída:
       ENTRADA_COMPRA → fornecedor + NF + OC + nfe_entrada
       AJUSTE/VIRADA/BACKFILL → origem honesta, sem inventar fornecedor
```

Chave do acabado = **OP / PED** (não lote de PA — `ADR_ESTOQUE_LOTE_VALIDADE` deixa PA sem lote). O produto no cliente continua amarrado ao pedido.

### Composição, não cópia

Nenhuma tabela nova. Nenhuma escrita extra no writer. FEFO, CM no SKU e MOV intactos. Genealogia é **leitura** dos documentos já oficiais.

### Origem no tempo da saída

Só entram notas/ajustes do lote com `created_at` **≤** a `SAIDA_PRODUCAO`. NF posterior do mesmo código de lote (o ADR acumula qtde no mesmo `estoque_lotes`) **não** aparece — evita culpar fornecedor de carga que ainda não existia.

Mesmo código de lote alimentado por **duas NFs antes** da saída → lista as duas com `lote_misto`. Não escolhemos uma: o batch misturou.

### SKU sem lote (EMB, etc.)

A linha de consumo aparece. `rastreavel_fornecedor = false`. Não inventar a “última NF do SKU” — o saldo é poço; a origem não é unívoca. Política: substrato/tinta controlam lote.

### Dois sentidos

| Direção | Pergunta | Entrada |
|---------|----------|---------|
| Reversa | O que entrou nesta OP/PED? | OP, PED, cliente |
| Direta | Quais OPs usaram este lote/NF? | lote, NF de entrada |

Busca única (`GET /rastreio?q=`) cobre OP, PED, lote, NF e cliente.

### Papel da ficha

Relatório imprimível (retrato A4, padrão das fichas) para CQ/SAC/compras **levar ao fornecedor**: SKU, lote, validade, qtde, fornecedor, NF, OC, chave. Sem preço de venda (chão §2.6). Sem R$ de custo nesta entrega.

## Invariantes

1. Isolamento EMP: lote/OP/NF nunca cruzam `empresa_id`.  
2. Saldo e CM só via `EstoqueSaldoWriter`.  
3. Não apagar MOV/lote com movimento.  
4. Origem de fornecedor só de `ENTRADA_COMPRA` (e espelho `nfe_entrada` se houver).  
5. Permissão: `producao.ler` **ou** `estoque.ler`.

## Fora de escopo

- Módulo RMA / ticket de reclamação (estudo 32 POS_VENDA — fase 2)  
- Lote de PA / etiqueta de rolo / código de barras  
- Custeio FIFO por lote  
- CQ / quarentena  
- Endereço de almoxarifado  
- Recursão de retalho grupo 90 como SKU novo  

## Proibido

1. Segundo cadastro de “insumos da OP” paralelo ao MOV.  
2. Inventar fornecedor/NF em SKU sem lote ou lote de abertura/backfill.  
3. Atribuir NF posterior ao mesmo código de lote.  
4. Abrir RMA, DEV- ou NF de devolução nesta fatia.  
5. Mostrar preço/margem na ficha de rastreio.

Alterar esta ADR exige alinhamento explícito ao estudo 32.
