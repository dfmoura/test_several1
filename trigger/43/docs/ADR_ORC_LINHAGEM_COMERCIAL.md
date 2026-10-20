# ADR — Linhagem comercial do ORC (Novo · Repetição · Repetição c/ alteração)

**Status:** Aceito  
**Data:** 2026-10-20  
**Contexto 43:** comercial · lista/ficha ORC e eco no PED  
**Relaciona:** `MAPA_FLUXO_POS_ORC.md` · `ADR_ORC_LINK_APROVACAO.md` · `ADR_ORC_ITENS.md`

---

## Contexto

Operação precisa ver, na lista, no detalhe e nas fichas, se o documento é **novo**, **repetição** (cópia comercial de um aprovado) ou **repetição com alteração**. O ato `duplicar` já existia, mas o vínculo era só audit + `copiado_de` efêmero.

---

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Dono = ORC** | PED é 1:1 com ORC; não há `duplicar` de PED |
| **Colunas** `origem_orcamento_id` + `linhagem` | Fato estável em list/show/ficha; sem depender de audit |
| **Valores** `NOVO` \| `REPETICAO` \| `REPETICAO_ALTERADA` | Três estados pedidos; default `NOVO` (legado incluso) |
| **Só `duplicar` cria `REPETICAO`** | Sem heurística “mesmo cliente + spec parecida” |
| **Latch no `update`** | Se fingerprint comercial diverge da origem → `REPETICAO_ALTERADA` (não volta sozinho) |
| **PED ecoa** | DTO + snapshot `orcamento_linhagem` / `orcamento_origem_*` no criar; sem FK PED↔PED |
| **UX = chip** | `StatusPill` / `ficha-chip-muted`; sem card novo |

`versao` continua sendo revisão **do mesmo** ORC — não é linhagem.  
`REP` no mapa de facas e “duplicar posição” no form **não** são linhagem documental.

### Fingerprint (o que conta como “alteração”)

Inclui o núcleo comercial da etiqueta/serviço/revenda (necessidade, medida, faca, papel, acabamento, cores/tintas, artes nomeadas, faixas/quantidade, SKU revenda, etc.) e `parceiro_id` / tipo de operação.

**Fora** (sózinho não marca alteração): observação, prazo, validade, tolerância, vendedor, frete, condição/forma de pagamento, gordura/redução, desconto do documento.

### UX

| Superfície | Indicador |
|------------|-----------|
| Lista ORC/PED | Chip só se `REPETICAO` / `REPETICAO_ALTERADA` (Novo implícito) |
| Detalhe ORC/PED | Chip + link à origem quando houver |
| Ficha operacional ORC/PED | `ficha-chip-muted` |
| Form pós-duplicar | Banner existente + linhagem persistida |
| Proposta / ficha cliente | Só referência leve à origem (`Ref. ORC-…`); sem jargão “alteração” |

---

## Proibido

1. Inferir linhagem por audit, `location.state` ou “parece igual”.
2. Usar `versao` como repetição.
3. Duplicar PED ou quebrar o 1:1 ORC↔PED.
4. Mexer em R1–R20 / motor por causa da linhagem.
5. Empilhar card, banner grande ou coluna que empurre o layout das listas.
6. Confundir com REP de faca ou duplicar posição de item.

---

## Aceite

1. `create` → `NOVO`, origem null.  
2. `duplicar` de APROVADO → novo em `REPETICAO` com `origem_orcamento_id`.  
3. Editar spec comercial da cópia → `REPETICAO_ALTERADA`.  
4. Mudar só prazo/obs → permanece `REPETICAO`.  
5. PED mostra a linhagem do ORC; ficha operacional ecoa.  
6. Isolamento `empresa_id` na FK de origem.
