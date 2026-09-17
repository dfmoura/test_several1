# ADR-ORC-FACAS-COMPOSICAO — Uma ou mais facas no orçamento

**Status:** Aceito  
**Data:** 2026-09-14  
**Contexto:** comercial · ORC → PED → FAT  
**Espelho:** `ADR_ORC_MODELOS_COMPOSICAO.md` (artes)

---

## Contexto

O mapa `orc_mapa_facas` é N por EMP. O ORC guardava **0..1** faca desnormalizada no `input_snapshot` (sem `faca_id`), com um único `valor_faca_nova`. Jobs reais pedem **uma ou mais** facas no mesmo orçamento (conjugada / ferramental conjunto), sem virar N geometrias de motor nem N ORCs.

O motor R1–R20 assume **uma** geometria (`medida` / `puxada` / `colunas` / `z`).

---

## Decisão

Separar **geometria do cálculo**, **composição operacional de facas** e **add-on comercial** no mesmo ORC:

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
6. Várias geometrias de produção = **vários ORCs** — não N motores no mesmo job.

### UX

- Seção **“2. Faca (mapa ou nova)”**: lista · adicionar do mapa · **cotar faca nova** (sem gravar no inventário) · marcar principal · valor/prazo por linha.
- Principal = “define o cálculo”.
- Extras = ferramental do mesmo job sem reescrever R1–R20.
- Faca nova no ORC = cotação comercial; cadastro definitivo permanece em **Mapa de facas** após aprovação.

---

## Consequências

**Agora:** multi-faca no snapshot; motor intacto; FAT N linhas; regressão 0/1 faca legado.

**Proibido:** alterar R1–R20 por faca; SKU por faca; só texto em observação; segundo escritor de geometria no motor; auto-receber estoque de faca.

## Rastreio

- `App\Support\FacasComposicao` · `OrcamentoService` · `OrcamentoValidationRules` · `FaturamentoService::itensFaca`
- UI: `orcamentoForm.ts` · `FacasComposicaoEditor` · `OrcamentoFormPage` · ficha/proposta/desenho
