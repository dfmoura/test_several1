# ADR-043-CAD-002 — Família MUC (uso e consumo)

**Status:** Aceito  
**Data:** 2026-09-15  
**Contexto 43:** extensão do cadastro operacional  
**Norma:** `../32` — `CADASTRO_PRODUTOS_COMPRA.txt` §1/§4 (tipo SPED `07`, CFOP `1556`/`2556`) · `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt`  
**Preserva:** `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_NATUREZAS_GERENCIAIS.md` · `ADR_UNIDADES_PRODUTO.md` · `ADR_CADASTRO_INSUMO_VOLUME.md` · `ADR_CARTEIRA_FINANCEIRA.md` · `ADR_ESTOQUE_REPOSICAO_AJUSTE.md` · `ADR_PRODUCAO_PED_OP_ESTOQUE.md`

---

## Contexto

O cadastro operacional cobre **MP / EMB / REV / PA / SVC / FAC** — domínio da indústria de etiqueta.  
Itens de **uso e consumo** (limpeza, escritório, EPI, consumíveis administrativos) **não** são matéria-prima nem embalagem: SPED `07`, CFOP típico `1556`/`2556`, despesa no resultado — não `5.06` (pagamento a fornecedor de estoque produtivo).

Improvisar MUC como MP/EMB **estraga** custo médio, “A repor”, OP e crédito fiscal.

---

## Decisão

```
Família MUC  →  grupos enxutos  →  SKU MUC-*-nnn
     │
     ├─ compra: OC (mesmo ciclo) → receber → MOV (controle físico) + TIT despesa
     ├─ NAT padrão do TIT: 3.05.06 (Material de uso e consumo)
     ├─ fora de “A repor” produtivo (MP|EMB|REV)
     └─ fora de BOM / consumo de OP
```

| Conceito | Valor |
|----------|--------|
| **Família** | `MUC` |
| **SPED** | `07` (herdado do grupo) |
| **Grupos** | `MUC-ESC` · `MUC-FAB` · `MUC-EPI` · `MUC-GER` |
| **Prefixo SKU** | `MUC-ESC-nnn` … (mesmo padrão `FAMILIA-GRUPO-seq`) |
| **CFOP entrada padrão** | `2556` (interestadual; humano ajusta `1556` se MG) |
| **Lote / bobina** | Não (`controla_lote=false`, sem máscara dimensional) |
| **NAT TIT (receber)** | Folha **`3.05.06`** — despesa; **nunca** `5.06` nem `2.01` |
| **Saldo** | Entra via `EstoqueSaldoWriter` (controle físico). Despesa já reconhecida no TIT — AJU/saída MUC **não** gera segundo TIT de custo. |
| **OC homogênea** | Receber **proíbe** misturar linhas `MUC` com `MP\|EMB\|REV` na mesma conferência. |

### Natureza `3.05.06`

Nova folha no catálogo NAT (grupo 3 — Despesas):

- Código: `3.05.06`
- Nome: **Material de uso e consumo**
- Uso: TIT de entrada de OC só-MUC (default). Humano pode trocar para `3.05.02` (escritório) ou `3.04.02` (consumíveis de fábrica) na conferência.

Emenda correlata: `ADR_NATUREZAS_GERENCIAIS.md` · `ADR_COMPRAS_ATE_ESTOQUE.md`.

### O que **não** é MUC

| Caso | Caminho correto |
|------|-----------------|
| Insumo / embalagem / ribbon | MP / EMB / REV |
| Máquina / TI capitalizável | BEM + NAT `4.xx` |
| Aluguel, DAS, honorário pontual sem SKU | TIT **avulso** (`ADR_CARTEIRA_FINANCEIRA`) |
| Etiqueta sob medida | PA-ETQ + spec (anti-explosão) |

---

## Consequências (esta fatia)

1. `Produto::FAMILIAS` / `ProdutoGrupo::FAMILIAS` incluem `MUC`.  
2. Seed de grupos `MUC-*` via `ProdutoGrupoCatalogData`.  
3. Cadastro / Do XML / consulta aceitam família `MUC`.  
4. `EstoqueEntradaService::receber` classifica modo **ESTOQUE** vs **MUC**; default NAT e validações por modo.  
5. UI Compra: default de natureza conforme famílias da OC.  
6. UX cadastro: lead/checklist de compra para MUC (de-para útil; sem bobina).  
7. Reposição e OP **permanecem** só MP/EMB/REV (e MP no BOM).

## Fora de escopo (agora)

- Auto-CFOP por UF (humano ajusta 1556×2556).  
- Difal de uso e consumo automatizado.  
- Reposição mínima para MUC.  
- Consumo MUC com segundo lançamento NAT.  
- Catálogo seed de SKUs MUC (cadastro sob demanda na EMP).  
- Gate de implantação novo (usa `F5_PRODUTOS` existente).

## Proibido

1. Cadastrar uso/consumo como MP/EMB “para a NF entrar”.  
2. TIT `5.06` em OC só-MUC.  
3. TIT `2.01` na entrada (continua custo de OP).  
4. Misturar MUC + estoque produtivo no mesmo `receber()`.  
5. Incluir MUC em “A repor” ou BOM de OP sem ADR novo.  
6. Família genérica “OUTROS” / catálogo estilo Sankhya.  
7. Segundo writer de saldo.

Alterar esta ADR exige decisão explícita (Direção + engenharia + contador).

---

## Rastreio no código

- Modelos: `Produto::FAMILIAS` · `ProdutoGrupo::FAMILIAS`
- Catálogo: `ProdutoGrupoCatalogData` · `NaturezaGerencialCatalogData` (`3.05.06`)
- Entrada: `EstoqueEntradaService` (modo MUC × ESTOQUE)
- UI: `ProdutoFormPage` · `ProdutosPage` · `ProdutoNovoDaNfPage` · `ComprasOrdemDetailPage` · `produtoCadastroOrientacaoUi`
- Regra Cursor: `.cursor/rules/produto-muc.mdc`
- Testes: `ProdutoGrupoServiceTest` · `ComprasAteEstoqueTest` (ramo MUC) · regressão MP `5.06`
