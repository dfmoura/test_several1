# ADR-039-CPR-002 — Assistência XML na entrada (UC-CPR-004 lean)

**Status:** Aceito  
**Data:** 2026-08-11  
**Contexto 39:** BL-037  
**Norma:** `../32` — `CASOS_USO_M07_COMPRAS.txt` UC-CPR-004 · `CADASTRO_PRODUTOS_COMPRA.txt` (cProd)  
**Preserva:** `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_ESTOQUE_REPOSICAO_AJUSTE.md`

---

## Decisão

XML **assiste** a conferência; **não** lança estoque sozinho.

```
OC ABERTA/PARCIAL
  → upload XML (preview)
  → preenche NF/chave/data + 1º vencimento (dup)
  → sugere de-para linha XML × item OC
  → humano confirma → receber() existente (MOV + TIT 5.06)
  → opcional: grava cProd → SKU para a próxima
```

| Camada | Papel |
|--------|--------|
| `NfeCompraExtractor` | Cabeçalho + itens + 1ª `dup.dVenc` |
| `EstoqueEntradaXmlService` | Preview + match + persist maps |
| `EstoqueEntradaService::receber` | Única espinha de lançamento |
| `produto_fornecedor_codigos` | De-para por EMP + fornecedor + cProd |

### Match (ordem)

1. De-para `cProd` (**ALTA**)  
2. Qtde pendente OC = `qCom` único (**MEDIA**)  
3. NCM único / único item pendente (**BAIXA**)  
4. Sem match → humano escolhe  

Warnings (não bloqueiam): emitente ≠ fornecedor OC; dest ≠ CNPJ EMP.

---

## Fora de escopo

- Download Focus (permanece fora)  
- Caixa DF-e / sync NFeDistribuicaoDFe / manifestação → **`ADR_CAIXA_DFE_NFE_DESTINADAS.md`** (alimenta este assist; não o substitui)  
- Entrada sem OC  
- Multi-TIT por parcelas da NF → **BL-038** / `ADR_ENTRADA_XML_PARCELAS.md`  
- Espelho fiscal / persistência do XML → **BL-048** / `ADR_ENTRADA_XML_ESPELHO.md`  
- Validação de assinatura / escrituração  

---

## Proibido

1. Auto-receber no upload do XML.  
2. Novo caminho de saldo paralelo a `receber()`.  
3. Confiar só no header sem humano no loop.  
4. Focus como dono do domínio.

---

## Emenda 2026-09-05 — multi-rastro / volumes

Norma: **`ADR_CADASTRO_INSUMO_VOLUME.md`** (fase F2).

- Conferência lista **todos** os `rastro` → N volumes em `receber()`, soma = qtde da linha OC.  
- De-para `cProd` → SKU permanece a âncora; descrição/código do fornecedor não se reescrevem.  
- **N dets → 1 linha OC:** com de-para **ou** OC com um único item pendente (reposição consolidada em m²), o assist agrega qCom e rastros na mesma linha — bobinas não viram linhas novas da OC.

## Emenda 2026-09-11 — remap UI

Ao alterar o de-para na conferência, a UI recompõe **qtde comercial e volumes** juntos (não só a qtde).

## Emenda 2026-09-11 — F2.1 dimensão Exact

Norma: **`ADR_CADASTRO_INSUMO_VOLUME.md`** (F2.1).

- `infAdProd` com `NxLxC` (ex. `4x205x1000`, misturas com `|`) → slots; amarre a cada `rastro` por área (= `qLote`).  
- Preview/assist sugere `largura_mm` + `comprimento_m` por volume; sem match → warning `DIMENSAO_VOLUME_INCOMPLETA`.  
- Remap UI usa o mesmo parser (`nfeExactDimensoes.ts`).

## Emenda 2026-09-12 — fallback composição OC

Norma: **`ADR_OC_RASCUNHO_ENVIO.md`**.

Sem `rastro` na NF e item com `controla_lote` + composição do pedido: preview sugere `lotes[]` via `OcComposicaoVolumes` (warning `VOLUME_OC_COMPOSICAO`), com nLote interno `INT-…` determinístico. XML/rastro continua prevalecendo.
## Emenda 2026-09-12 — confronto pedido × NF

- Parse `infAdProd` Thermotag: `12RLS X 110MM X 1000M` (`expandirSlotsRls`, fallback se Exact vazio).
- Preview: `confronto_volumes` + warning `PEDIDO_VS_NF_VOLUMES` quando bobinas/m² divergem.
- UI: bloco **Confronto pedido × NF × conferido**; com divergência → desfecho (`RECEBER_CONFORME_NF` / `RECEBER_PARCIAL_FISICO` / `AGUARDAR_FORNECEDOR`) + obs no MOV; botão **Alinhar à NF**.
- Param EMP `compras.divergencia_volumes` (`EXIGIR_DESFECHO` default).

## Emenda 2026-09-12 — hierarquia UX na conferência

Sem mudar `receber()` nem o triplo ledger (estoque ≠ pagar ≠ fiscal):

- Resumo fixo no topo: **entrada estoque** · **a pagar (NF)** · **OC após confirmar** (+ tip quando valor cheio / físico faltando).
- Progressive disclosure: espelho fiscal, de-para NF→OC e (quando vazio) parcelas ficam em `<details>`; zona primária = confronto + qtde/volumes + desfecho.
- Desfechos em linguagem operacional (`Receber o que chegou` / `Receber alinhado à NF` / `Não receber — aguardar fornecedor`); códigos API inalterados.
- Avisos `PARCELAS_VS_*` apresentados como esclarecimento (não como erro de sistema).

## Emenda 2026-09-14 — confronto só com detalhe de volumes

`OcReceberConfronto` monta linha **somente** quando há faixas no pedido **ou** detalhe físico na NF (`rastro` / Exact / RLS×MM×M).

- Só `qCom` (ex. ribbon UN, tubete, lote único sem rastro) → **sem** bloco Confronto — evita “—” enganoso.
- `controla_lote` sozinho não abre confronto de bobinas; continua exigindo lote na conferência se o SKU controla lote.
- `receber()` e o triplo ledger inalterados.

**Proibido:** inventar bobinas a partir de `infAdProd` fiscal (ex. DCR/SUFRAMA); exigir desfecho de volumes quando não há volumes para confrontar.
