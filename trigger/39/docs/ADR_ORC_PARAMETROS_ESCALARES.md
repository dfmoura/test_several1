# ADR-039-ORC-002 — Parâmetros escalares do catálogo ORC (`matriz_cm2`)

**Status:** Aceito  
**Data:** 2026-08-08  
**Contexto 39:** comercial · extensão BL-004  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §1.2 / §4.12 · `FLEXIBILIDADE_LIMITES_CUSTOMIZACAO_ORCAMENTO.txt` · UC-PLT-005 (vigência TAB — futuro)

---

## Decisão

Promover **`matriz_cm2` (R$/cm² do clichê)** a parâmetro escalar editável no **Catálogo ORC**, no mesmo padrão híbrido das 4 bases (papel, acabamento, troca, máquina G10):

| Papel | Onde | Significado |
|-------|------|-------------|
| **Vigente (novos ORCs)** | `orc_catalogo_parametros` chave `matriz_cm2` (ativo) | Tarifa que o motor usa agora |
| **Fallback** | `catalog_oficial.json` | Se linha ausente ou inativa |
| **Histórico do ORC** | `result_snapshot.catalog_snapshot.matriz_cm2` | Fotografia do cálculo — não muda depois |

**Não** usar `parametros_empresa` (ciclo EMP / ratificação — outro domínio).  
**Não** implementar vigência temporal início/fim (TAB) nesta entrega.

---

## UX integrada

1. **Catálogo ORC → aba Matriz (clichê):** edita R$/cm² (`orcamento.catalogo.gerir`).
2. **Formulário ORC:** com Matriz = SIM, mostra *tarifa vigente* vinda de `GET /orcamentos/catalogo` (`matriz_cm2`) — mesma fonte do motor.
3. **Resultado / detalhe:** exibe a tarifa do **snapshot** (prova do que valia naquele cálculo).
4. **Como calcula:** fórmula usa o valor vigente da API.

Proibido digitar R$/cm² no formulário comercial do dia a dia (parâmetro cadastrado, não número solto — GERACAO §1.1–1.2). Override técnico `overrides.matriz_cm2` permanece API avançada.

---

## Consequências (agora)

1. Tabela `orc_catalogo_parametros` (chave UQ, valor, rótulo, unidade, ativo, ordem).
2. Seed idempotente a partir do JSON (`0.28`); seed não sobrescreve edição.
3. `metaForUi()` e resumo admin expõem `matriz_cm2` (+ fonte).
4. Demais escalares do JSON (caixa, tinta, tubete…) **continuam no JSON** até promoção explícita.

## Consequências (futuro — permitido)

- Promover `preco_caixa`, faixas de tinta etc. na mesma tabela.
- UC-PLT-005 / TAB com vigência início/fim + ratificação — ADR novo.
- Matriz de compatibilidade (máquina × cores…) — outro ADR.

## Proibido (regressão)

1. Misturar escalares ORC em `parametros_empresa` sem ADR.
2. Quebrar snapshot de ORCs já calculados ao mudar a tarifa.
3. Abrir campo livre de R$/cm² no wizard comercial.
4. Hard-delete do parâmetro (só inativar → fallback JSON).

---

## Rastreio no código

- Model `OrcCatalogoParametro` · overlay em `OrcamentoCatalogo` · admin `OrcamentoCatalogoAdminService`
- API `/orcamento-catalogo/parametros` · UI `OrcamentoCatalogoPage` (aba Matriz) · hint em `OrcamentoFormPage`
- Teste: `tests/Feature/OrcamentoCatalogoTest.php` (bloco matriz_cm2)
