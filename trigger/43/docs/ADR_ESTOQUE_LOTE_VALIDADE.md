# ADR-039-EST-003 — Lote, data de entrada e validade

**Status:** Aceito  
**Data:** 2026-08-12  
**Contexto 39:** BL-045  
**Norma:** `../32` — `CONTROLE_ESTOQUE_PROFISSIONAL.txt` §6 · `CASOS_USO_M04_ESTOQUE.txt` · `CADASTRO_PRODUTOS_COMPRA.txt` · `AJUSTE_ESTOQUE_INVENTARIO.txt`

---

## Contexto

O saldo vivia só em `(empresa, SKU)`. Isso basta para tubete, caixa e ribbon — e quebra a operação nos substratos e tintas: reclamação de cliente, FEFO de adesivo/tinta (shelf life 12–24 meses) e o pré-requisito do Bloco K exigem **lote do fornecedor + data de entrada + vencimento**.

Nem todo SKU controla lote. Obrigar lote em EMB/REV/PA polui a conferência e o inventário.

## Decisão

```
Produto.controla_lote?  ──não──► saldo SKU como hoje (custo médio intacto)
        │
        sim
        ▼
estoque_lotes (identidade + qtde)  ·  MOV item.lote_id
consumo: FEFO (validade ASC, nulos por último) → FIFO (data_entrada)
```

| Conceito | Papel |
|----------|--------|
| Flag `controla_lote` | SKU entra/sai **com** lote. Default `false`. |
| Flag `controla_validade` | Exige (ou deriva) `data_validade`. Implica lote. |
| `prazo_validade_dias` | Shelf life cadastral; sugere vencimento na entrada. |
| `estoque_lotes` | Identidade do lote na EMP: código, entrada, fabricação, validade, qtde. |
| `estoque_saldos` | **Continua** o saldo oficial do SKU + custo médio móvel. |
| MOV item `lote_id` | Rastro do movimento. Sem lote no SKU sem controle. |

**Custeio permanece no SKU** (custo médio ponderado móvel — estudo 32 §1.4). Lote não vira FIFO de custo.

**Política de cadastro (Camada A, estudo 32 §6.2):**

| Grupo | Lote | Validade | Prazo |
|-------|------|----------|-------|
| MP-PAP, MP-FLM, MP-LAM | sim | sim | 548 d (18 meses) |
| MP-TIN, MP-ADF | sim | sim | 365 d |
| MP-CLD | sim | sim | 730 d |
| MP-TEC | sim | não | — |
| EMB-*, REV-*, PA-*, SVC-*, FAC-* | não | não | — |

Operador pode desligar/ligar no cadastro. Validade sem lote é inválida (o sistema força lote).

**Consumo:** FEFO automático na saída (OP) se o lote não for informado. Vencido **não bloqueia** a fábrica (CQ/quarentena fora de escopo); a UI marca `VENCIDO` / `A VENCER` (60 dias).

**Genealogia (BL-054):** a OP/PED leem `SAIDA_PRODUCAO.item.lote_id` e resolvem origens (`ENTRADA_COMPRA` / NF / fornecedor) **até o instante da saída**. Ver `ADR_RASTREIO_INSUMOS_PRODUCAO.md`. Lote de PA continua fora.

**Entrada OC:** SKU com lote exige código + data de entrada (default: data da NF ou hoje). Validade: informada, ou derivada de `prazo_validade_dias`. XML `rastro` (nLote/dFab/dVal) só **preenche** — humano confirma.

**AJU / INV:** contagem por lote fica fora desta entrega. Ajuste positivo em SKU com lote cria/usa o lote informado (ou sintético `AJU-…` / `INV-…`); negativo consome FEFO. Virada A03 grava `lote_payload` (1–2 lotes de abertura) no mesmo AJU.

**Backfill (teste/implantação):** SKU que já tem saldo e passou a controlar lote, sem linhas em `estoque_lotes`, recebe lotes de abertura **sem** alterar `estoque_saldos` e **sem** MOV novo — só amarra identidade à qtde já documentada. Origem `BACKFILL`. Não é caminho operacional do dia a dia.

## Invariantes

1. SKU com lote: `sum(estoque_lotes.qtde) = estoque_saldos.qtde`.  
2. SKU sem lote: nenhum `estoque_lotes`; `lote_id` nulo no MOV.  
3. Saldo SKU e CM só via `EstoqueSaldoWriter`.  
4. Isolamento EMP: lote nunca cruza `empresa_id`.  
5. Mesmo código de lote no mesmo SKU/EMP acumula qtde (mesmo batch do fornecedor).

## Fora de escopo

- Endereço (rua/estante)  
- Contagem cega por lote no INV  
- Empenho/reserva por lote  
- Custeio FIFO/lote  
- Etiqueta interna / código de barras do rolo  
- Quarentena / CQ  
- PA com lote de produção  

## Proibido

1. Editar qtde de lote fora do writer.  
2. Obrigar lote em SKU sem `controla_lote`.  
3. Misturar custo médio no lote.  
4. Auto-receber XML por causa de `rastro`.  
5. Apagar lote com movimento (rastreio).  

Alterar esta ADR exige decisão explícita alinhada ao estudo 32.

---

## Emenda 2026-09-05 — lote como volume (bobina Exact)

Norma complementar: **`ADR_CADASTRO_INSUMO_VOLUME.md`**.

- Em substratos com `rastro` unitário (ex. Avery Exact), **1 `nLote` ≈ 1 volume físico**.  
- Dimensão real (largura × comprimento) confirma-se na **entrada**, não no cadastro do SKU.  
- Multi-`rastro` por linha de NF → N lotes/volumes (fase F2 do ADR de insumo). O assist atual que pré-preenche só o 1º rastro permanece até essa fase — **não** altera o writer de saldo.  
- Endereço / QR do volume / QR do vão continuam **fora de escopo** desta ADR (fases F3–F4).
