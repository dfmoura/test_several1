# ADR-039-NAT-001 — Naturezas Gerenciais (NAT) ≠ produto.natureza ≠ plano contábil

**Status:** Aceito  
**Data:** 2026-08-10  
**Contexto 39:** BL-032  
**Norma:** `../32` — `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt` · `CONTABILIDADE_FISCAL_SEM_FECHAMENTO.txt` · `DECISAO_NAO_IMPLEMENTAR_LAI_NO_ERP.txt` · `CODIFICACAO_INFORMACOES_SISTEMA.txt`

---

## Decisão

| Conceito | Tabela / código | Papel |
|----------|-----------------|--------|
| **Natureza gerencial** | `naturezas_gerenciais` · `NAT-1.01.01` | Classificação interna de dinheiro (DRE/caixa/margem). Árvore grupos **1–5**. |
| **Natureza do grupo de produto** | `produto_grupos.natureza` · `COMPRA\|VENDA\|AMBOS` | Orientação compra/venda do SKU. **Não** é NAT financeira. |
| **Conta financeira (tesouraria)** | `empresa_contas_financeiras` · `CFIN-` | Onde o dinheiro está (banco/caixa). Destino futuro de BX. **≠** NAT. |
| **Plano de contas do contador** | *(fora do ERP nesta fase)* | Contabilidade oficial / ECD. Ponte futura = **de-para**, não CoA nativo. |

**Uma tabela NAT gerencial; zero grupo 9 / LAI; zero plano contábil embutido.**

---

## Árvore canônica (seed)

Grupos (estudo 32):

1. Receitas  
2. Custos operacionais  
3. Despesas operacionais  
4. Investimentos / patrimônio  
5. Movimentações não-resultado  

- Código de negócio: hierárquico `1.01.01` (imutável após seed).  
- Exibição: `NAT-{codigo}`.  
- Só **folhas** têm `aceita_lancamento = true` (pais = agrupadores).  
- Catálogo **global** (não por EMP), como `produto_grupos`.

---

## Mutabilidade (BL-032)

- Seed idempotente a partir de `NaturezaGerencialCatalogData`.  
- Permitido: editar `nome` / `descricao`; soft-inativar (`ativo = false`).  
- **Proibido neste BL:** criar folhas custom, alterar `codigo`/`grupo`/`parent`, hard-delete, grupo 9.xx.

---

## Consequências (agora)

- CRUD leve + consulta de folhas ativas para picker futuro.  
- UI de catálogo sob Cadastros, rótulo **Natureza gerencial**.  
- Teste de fronteira: NAT ≠ `produto_grupos.natureza` ≠ CFIN ≠ CoA.

## Consequências (futuro — permitido, não nesta entrega)

- TIT / lançamento caixa: `natureza_id` **NOT NULL** (grupos 1–5, folha).  
- Defaults por tipo de operação (PA→1.01.01, frete receita vs despesa, BEM→4.xx…).  
- Tabela `natureza_de_para_contador` (nullable `conta_contador`, histórico) para export mensal.  
- DRE gerencial e fluxo de caixa **separados** (caixa × competência).  
- Centro de custo opcional (`cc_id`): Natureza = *o quê*; CC = *onde*.

## Proibido (regressão de domínio)

1. Reutilizar ou fundir com `produto_grupos.natureza`.  
2. Implementar plano de contas oficial / partidas dobradas / ECD “de passagem”.  
3. Criar grupo 9, LAI, livro auxiliar ou flag de “caixa 2”.  
4. Amarrar ORC/BEM/produto a NAT nesta fundação (TIT ainda não existe).  
5. Misturar investimento (4) com despesa (3) ou transferência (5) com resultado.

Alterar esta ADR exige decisão explícita alinhada ao estudo 32 (Direção + engenharia).

---

## Rastreio no código

- Model / seed: `NaturezaGerencial`, `NaturezaGerencialCatalogData`, `NaturezaGerencialSeeder`
- Service / API: `NaturezaGerencialService`, `NaturezaGerencialController`, `GET /consulta/naturezas-gerenciais`
- Teste de arquitetura: `tests/Unit/NaturezaGerencialBoundaryTest.php`
- Regra Cursor: `.cursor/rules/naturezas-gerenciais.mdc`
