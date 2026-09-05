# ADR-039-UNID-001 — Unidades e conversão no cadastro de produto

**Status:** Aceito  
**Data:** 2026-08-08  
**Contexto 39:** cadastro 1.d · BL-029  
**Norma:** `../32` — `CONVERSOES_UNIDADES_MEDIDA.txt` · `CADASTRO_PRODUTOS_COMPRA.txt` · `CADASTRO_PRODUTOS_VENDA.txt` · `PADRAO_DECIMAL_CALCULOS.txt` · UC-CAD-005

---

## Decisão

**Modelo dual canônico** (não “unidades alternativas” abertas estilo Sankhya):

| Papel | Campo / lugar | Significado |
|-------|----------------|-------------|
| **Documento / NF** | `produtos.unidade_comercial` | Unidade em que compra ou vende (KG, M2, MIL, UN…) |
| **Estoque oficial** | `produtos.unidade_interna` | **Única** unidade do saldo (RL, M, KG, UN…). O saldo vive só nela. |
| **Ponte** | `produtos.fator_conversao` DECIMAL(19,10) | Convenção: **1 × comercial = fator × interna** |
| **Insumos de fórmula** | `produtos.atributos` JSON | `largura_mm`, `comprimento_m`, `gramatura_g_m2` (+ futuros: tubete, densidade, qtd/caixa…) — **não são unidades** |

Catálogo oficial de siglas: `UnidadesMedida` (estudo 32 §1).  
Motor de sugestão: `FatorConversaoSugeridor` (pontes RL↔M, M↔M2, M2↔KG…).

---

## Por que não copiar Sankhya (TGFVOA / unidades alternativas)

| Sankhya (típico) | RLP (este ADR) |
|------------------|----------------|
| N unidades alternativas livres no item | Um par documento↔estoque + atributos que **geram** o fator |
| Fator digitado por par, muitas vezes sem física | Fator derivado de largura/comprimento/gramatura (ou constante MIL↔UN) |
| Saldo pode ficar ambíguo entre “versões” | Saldo **sempre** na unidade interna |
| Flexível demais para indústria de bobina | Menos superfície de erro; auditoria clara |

Sankhya serve de **inspiração de UX** (mostrar equivalências), não de modelo de dados.  
Quando o documento precisar de uma terceira leitura (ex.: CX no pedido além de MIL no estoque), isso entra como **unidade do documento** (PED/NF) convertida para a interna — não como N unidades oficiais concorrentes no SKU.

---

## Visibilidade da seção dimensional (UI)

A seção **só** aparece quando:

1. **`exige_dimensao_sku` do grupo** = true (catálogo canônico — bobina no SKU), **ou**
2. O motor de fator listou `largura_mm` / `comprimento_m` / `gramatura_g_m2` em `faltando`, **ou**
3. O produto **já tem** esses valores gravados (edição/legado).

**Proibido:** abrir por heurística de unidade (ex.: “tem KG ou M2”).  
Trocar para grupo sem máscara **limpa** as dimensões no formulário.

Código: `produtoBobinaDimensoesUi.ts` · `ProdutoBobinaDimensoes` (PHP).

---

## Visibilidade da conversão (UI)

O **modelo dual** permanece no schema para todo SKU. A **superfície** de conversão é progressiva:

| Modo | Quando | Título | Fator / equação |
|------|--------|--------|-----------------|
| **simples** | comercial = estoque (ou estoque vazio) | `Unidades` | ocultos |
| **conversão** | comercial ≠ estoque | `Unidades e conversão` | visíveis |

Código: `produtoUnidadesConversaoUi.ts` · `ProdutoUnidadesConversao` (PHP) · ficha alinhada.

---

## Consequências (agora)

1. UI do produto: unidades (sempre) → dados da bobina (**só se a regra dimensional**) → fator (**só se unidades diferem**), com rótulo **Unidade de estoque** para `unidade_interna`.
2. `unidade_interna` vazia na gravação **normaliza** para `unidade_comercial` e fator `1` quando iguais.
3. Atributos dimensionais permanecem em JSON — extensão sem migration a cada ponte nova.
4. Conversão incompleta **não inventa** fator (regra de ouro §12.10 do estudo 32).
5. PA-ETQ, REV-RIB, EMB, SVC, FAC, MP-TIN **não** abrem bobina por padrão.

## Consequências (futuro — permitido)

- Tabela filha `produto_unidades_documento` (ou equivalente) **só** se aparecer necessidade real de N pares documento↔estoque por parceiro/CFOP — sempre apontando para a **mesma** unidade interna.
- Colunas flat para `largura_mm` etc. **só** se consulta/estoque exigir índice SQL forte; até lá JSON + índices de app bastam.
- Visão multi-unidade do saldo (RL / M / M2 / KG) = **leitura calculada**, nunca segundo saldo.

## Proibido (regressão de domínio)

1. Introduzir tabela de “unidades alternativas” genéricas sem ADR novo.
2. Manter saldo em mais de uma unidade oficial.
3. Tratar largura/comprimento/gramatura como “unidade”.
4. Converter ida-e-volta (m→kg→m) degradando precisão.
5. Assumir fator default em silêncio quando o cadastro está incompleto.

Alterar esta ADR exige decisão explícita alinhada ao estudo 32 (Direção + engenharia + domínio industrial).

---

## Emenda 2026-09-05 — dimensões nominais ≠ identidade do SKU

Norma complementar: **`ADR_CADASTRO_INSUMO_VOLUME.md`**.

- `largura_mm` / `comprimento_m` / `gramatura_g_m2` no produto = **insumos de fórmula / referência de compra** (programa Exact, ponte de conversão).  
- Dimensão **real** da bobina vive no **volume** (`estoque_lotes` / conferência) — não explode SKU por mm×m.  
- `exige_dimensao_sku` do grupo = **oferece** seção dimensional nominal; **não** obriga L×C como chave do cadastro (Camada A / Exact).  
- Preferência substrato Exact: comercial M2 = interna M2 (fator 1) quando a NF fatura em M2.

---

## Rastreio no código

- `UnidadesMedida` · `FatorConversaoSugeridor` · `PadraoDecimal` · `ProdutoBobinaDimensoes` · `ProdutoUnidadesConversao`
- UI: `ProdutoFormPage` · `produtoBobinaDimensoesUi.ts` · `produtoUnidadesConversaoUi.ts` · `ProdutoFichaSheet`
- Teste de arquitetura: `tests/Unit/ProdutoUnidadesBoundaryTest.php`
- Regra Cursor: `.cursor/rules/produto-unidades.mdc`
