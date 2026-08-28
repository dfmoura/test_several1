# ADR-043-ORC-003 — Regras do cálculo ORC (parametrização sem DSL)

**Status:** Aceito  
**Data:** 2026-08-28  
**Contexto 43:** comercial · extensão de `ADR_ORC_PARAMETROS_ESCALARES`  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §1.2 / §5 · `FLEXIBILIDADE_LIMITES_CUSTOMIZACAO_ORCAMENTO.txt` §2.3  
**Antecessor:** `ADR_ORC_PARAMETROS_ESCALARES.md` (`matriz_cm2`)

---

## Decisão

O produto **Regras do cálculo ORC** expõe o motor R1–R20 de forma auditável e permite à EMP **criar / atualizar / inativar parâmetros e linhas de catálogo** que alimentam o motor — **sem** editar a álgebra (sem DSL, `eval` ou expressões livres).

| Camada | Quem muda | Onde |
|--------|-----------|------|
| **Álgebra R1–R20** | Código versionado (`motor_version`) | `OrcamentoMotor` |
| **Constantes estruturais** | Código (somente leitura na UI) | Ex.: geometria matriz `3.175`, `+4` |
| **Parâmetros / tarifas** | Usuário com `orcamento.catalogo.gerir` | `orc_catalogo_*` por EMP |
| **Histórico** | Snapshot imutável | `catalog_snapshot` + `result_snapshot` |

**Frase canônica (estudo 32):** *Trocar um preço nunca exige mexer em fórmula.*

---

## `motor_version`

Todo resultado do motor inclui `motor_version: 1` no snapshot. Mudança de álgebra exige ADR novo + golden BRAHVA + incremento de versão — não edição na UI.

---

## Parâmetros promovidos (além de `matriz_cm2` / `peso_caixa_kg`)

Escalares em `orc_catalogo_parametros` (allowlist `OrcCatalogoParametro::CHAVES_CONHECIDAS`):

| Chave | Uso |
|-------|-----|
| `setup_horas` | R3 — setup embutido |
| `limite_metragem_bobina` | R4 / perda bobina |
| `minutos_troca_bobina` | R4 — minutos por milhão m (default 5) |
| `ceiling_etiqueta` | Fechamento comercial |
| `preco_caixa` | Embalagem |
| `tinta_faixa_m2` | Faixa tinta |
| `tinta_valor_ate_30_por_cor` | Tinta ≤ faixa |
| `tinta_valor_acima_m2` | Tinta > faixa |
| `perda_papel_f6` | Acerto 4 cores (fator F6) |
| `perda_acerto_m_4v` … `perda_acerto_m_8` | Metros de acerto 4V/5–8 |
| `tubete_1`, `tubete_1_5`, `tubete_3` | Preço tubete |
| `perda_papel_0` … `perda_papel_3` | Acerto 0–3 cores (m² fixos) |

Fallback: `catalog_oficial.json` quando linha ausente ou inativa. Seed idempotente não sobrescreve edição.

---

## Registro de regras (metadados)

`GET /orcamento-catalogo/regras` devolve passos estáveis (`R1_metragem`, `R2_m2`, …) com:

- rótulo + fórmula em texto (guia interno);
- chaves de parâmetros vinculados;
- flag `estrutural` (somente leitura) vs `parametrizado`.

CRUD do usuário = CRUD de **parâmetros e bases** (papel, acabamento, …). Regras estruturais não são excluídas.

---

## UX

1. **Catálogo ORC** — abas Parâmetros do motor · Perdas · Embalagem (+ existentes).
2. **Como calcula** — `/orcamentos/como-calcula` com fluxo R1–R20 ligado aos parâmetros vigentes da EMP.
3. **Resultado interno** — painel “Como chegou neste valor” a partir do snapshot (não na proposta ao cliente).
4. Wizard comercial: sem R$ solto de catálogo (GERACAO §1.1).

---

## Isolamento e segurança

- Escrita com `empresa_id` do contexto (`CatalogoOrcEmpresa`); 403 sem vínculo.
- Soft-inativar → fallback JSON; **proibido** hard-delete.
- Não misturar em `parametros_empresa`.
- Frete / faca / serviço continuam fora do motor (`ADR_ORC_FRETE_ESTIMADO`, `ADR_OPERACOES_SAIDA`).

---

## Proibido (regressão)

1. DSL / ExpressionLanguage / fórmulas digitadas pelo usuário.
2. Alterar álgebra R1–R20 sem ADR + `motor_version` + golden test.
3. Quebrar snapshot de ORCs já calculados ao mudar parâmetro.
4. Expor breakdown interno na proposta pública.

---

## Fora desta entrega

Matriz de compatibilidade · cenários/gordura · vigência temporal TAB · motor v2.

---

## Rastreio

- Model `OrcCatalogoParametro` · `OrcamentoMotorRegras` · overlay `OrcamentoCatalogo`
- API `/orcamento-catalogo/regras` · UI catálogo + `OrcamentoComoCalculaPage` · `OrcamentoResultado`
- Testes: `OrcamentoMotorTest` · `OrcamentoCatalogoTest` · BRAHVA
