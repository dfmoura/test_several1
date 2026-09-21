# ADR-ORC-FACAS-COMPOSICAO — Facas dentro do job (ferramental)

**Status:** Aceito · **emenda 2026-09-21** (escopo reduzido)  
**Data:** 2026-09-14  
**Contexto:** comercial · ORC → PED → FAT  
**Espelho:** `ADR_ORC_MODELOS_COMPOSICAO.md` (artes)  
**Norma superior (N geometrias / N specs):** [`ADR_ORC_ITENS.md`](ADR_ORC_ITENS.md) — cabeçalho × itens

---

## Contexto

O mapa `orc_mapa_facas` é N por EMP. O ORC guardava **0..1** faca desnormalizada no `input_snapshot` (sem `faca_id`), com um único `valor_faca_nova`.

O motor R1–R20 assume **uma** geometria (`medida` / `puxada` / `colunas` / `z`).

**Emenda 2026-09-21:** pedidos com **várias geometrias / produtos** na mesma proposta **não** se modelam como N facas no documento. Isso é **N itens** no ORC (`ADR_ORC_ITENS`). Esta ADR cobre só **ferramental do mesmo job** (0..1 geometria + extras opcionais de cobrança/referência).

---

## Decisão

Separar **geometria do cálculo**, **composição operacional de facas** e **add-on comercial** no **mesmo item/job** (hoje = ORC flat; com `ADR_ORC_ITENS` = cada posição):

| Campo | Onde | Papel |
|-------|------|--------|
| Escalares do motor | `medida`, `puxada_cm`, `largura_cm`, `z`, `colunas`, `maquina` | Geometria única — **inalterada** |
| `facas[]` | `input_snapshot` | Lista 0..N · uma `principal` · snapshot do mapa + cobrança |
| Escalares legado | `formato_faca`, `faca_nova`, `valor_faca_nova`, `prazo_faca_dias`, `faca_*` | Projeção da principal + Σ valores (compat) |
| `valor_faca_nova` / `valor_facas` | `result_snapshot` (enrich) | Σ `valor_faca` — add-on pós-motor (fora de R1–R20) |

```
1 faca principal     →  geometria / silhueta / formato (como aplicarFaca hoje)
0..N facas extras    →  referência operacional + valor/prazo opcional
Σ valor_faca         →  valor_total_com_faca (com artes/frete nas regras já vigentes)
FAT                  →  N linhas de ferramental (espelho artes); legado 1 linha = DESC_FACA
```

- Sem tabela SQL `orcamento_facas` no dia 1 (JSON no snapshot).
- Soft link opcional `mapa_faca_id` / `n_facas` — auditável; mapa pode evoluir depois da cotação.
- Comissão: ferramental fora da base (como hoje).
- Serviço: `facas = []` (sem BOM de faca).

### Regras

1. `facas` ausente na API → sintetiza 0..1 a partir dos escalares legado (ORCs antigos / testes).
2. `facas` presente (incl. `[]`) → normaliza; se N≥1, **exatamente uma** `principal`.
3. Cada item: `formato` ou `medida` ou `faca_nova`; `valor_faca` ≥ 0; `prazo_faca_dias` opcional.
4. Principal projeta escalares legado + campos visuais `faca_*`.
5. Geometria do motor: se a principal trouxer puxada/largura/z/medida/máquina, prevalece na projeção quando o payload veio só pela lista (UI já mantém sync ao marcar principal).
6. Várias geometrias de produção = **vários itens no mesmo ORC** (`ADR_ORC_ITENS`) — não N motores no mesmo job nem N facas “como se fossem produtos”.

### UX

- Seção **“2. Faca (mapa ou nova)”**: lista · adicionar do mapa · **cotar faca nova** (sem gravar no inventário) · marcar principal · valor/prazo por linha.
- Principal = “define o cálculo”.
- Extras = ferramental do mesmo job sem reescrever R1–R20.
- Faca nova no ORC = cotação comercial; cadastro definitivo permanece em **Mapa de facas** após aprovação.

---

## Consequências

**Agora:** composição de facas no snapshot do job; motor intacto; FAT N linhas de ferramental; regressão 0/1 faca legado.

**Com ADR_ORC_ITENS:** multi-produto / multi-geometria = N posições; esta ADR não é o agregador da proposta.

**Proibido:** alterar R1–R20 por faca; SKU por faca; só texto em observação; segundo escritor de geometria no motor; auto-receber estoque de faca; usar `facas[]` para simular N jobs.

## Rastreio

- `App\Support\FacasComposicao` · `OrcamentoService` · `OrcamentoValidationRules` · `FaturamentoService::itensFaca`
- UI: `orcamentoForm.ts` · `FacasComposicaoEditor` · `OrcamentoFormPage` · ficha/proposta/desenho
