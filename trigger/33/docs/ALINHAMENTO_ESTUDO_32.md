# Alinhamento ERP ↔ Estudo operacional (`trigger/32`)

Documento de rastreabilidade (ago/2026) — atualizado após realinhamento fiscal/fluxo.

## Cadeia feliz — uma jornada

Pedido é o documento-mestre. A tela `/pedidos/[id]` é a **jornada única**:

| Seq | Estudo | Ação na jornada (`nextAction`) |
|---|---|---|
| 0 | ORC + link | `/orcamentos/[id]` → calcular/salvar → link → aceite |
| 1 | PED + crédito/sinal | Gerar PED → `liberar_credito` / `baixar_sinal` |
| 2–3 | Confirmar → OS + OP | `confirmar` (status **LIBERADO** ou RASCUNHO legado) |
| 4 | Materiais (estoque) | reservas ATP; se faltar → **suporte** Compras (OC urgente) |
| 5 | Produção | `iniciar_producao` / `concluir_producao` (OP preferida, OS espelho) |
| 6 | NF-e + TIT + COB | `faturar` — **NF-e produção própria** (PA-ETQ, CFOP 5101/6101) |
| 7 | ENT | `entregar` |
| 8 | BX | `receber` / `baixar_sinal` |

Home comercial: ORC → PED → OP → NF-e → ENT → BX.  
**Compras e estoque = suporte** (INDICE §2 — paralelo / OP parada). Não iniciam o hub.

## Faturamento (MAPA_FATURAMENTO + CADASTRO_PRODUTOS_VENDA)

| Tipo de item | Documento | CFOP típico |
|---|---|---|
| Produção própria (etiqueta PA-ETQ) | **NF-e** única | 5101 / 6101 |
| Ferramental FAC (matriz 1º pedido) | **Linha na mesma NF-e** | 5101 / 6101 |
| Revenda (REV-RIB) | NF-e | 5102 / 6102 |
| Serviço avulso (SVC) | NFS-e (quando aplicável) | — |

**Não** se usa dual “NF-e revenda + NFS-e impressão” para etiqueta sob encomenda.  
Insumos (MP) saem no estoque/custo da OP — o cliente vê só a família fiscal + especificação comercial.

Famílias seed: `PA-ETQ-001` (NCM 3919.10.90), `PA-ETQ-002` (4811.41.90), `FAC-MATRIZ`.

## Fonte da verdade do CTA

- `apps/web/src/lib/jornada.ts` → `resolveNextAction`
- API `GET /api/pedidos/:id` devolve `nextAction` + `fluxo.etapas` (8 passos)
- UI: um botão primário = próxima etapa permitida
- Fiscal: `domain/venda/familia-pa.ts` + `domain/fiscal/planejar.ts`

## Codificação

`ORC-` / `PED-` / `OP-` / `OS-` / `TIT-` / `BX-` / `ENT-` / `OC-` (suporte) via `codigos-documento.ts`.

## Fora deste pacote (fase seguinte)

RMA, DEV, COT formal multi-fornecedor, REM, COM-, frete/CT-e, WhatsApp MSG, BEM, export contador/folha, Sicoob prod.  
**LAI proibido.**
