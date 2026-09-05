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

- Hoje o preview pode sugerir lote a partir do **primeiro** `rastro` da linha — suficiente para tinta/batch, insuficiente para Exact com N bobinas.  
- Evolução aceita: conferência lista **todos** os `rastro` → N volumes em `receber()`, soma = qtde da linha.  
- De-para `cProd` → SKU permanece a âncora; descrição/código do fornecedor não se reescrevem.
