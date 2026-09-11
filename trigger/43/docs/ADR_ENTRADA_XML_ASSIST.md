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
