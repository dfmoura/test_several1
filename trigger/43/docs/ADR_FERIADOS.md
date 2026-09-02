# ADR-043-FER-001 — Feriados e prazo em dias úteis (ORC / PED)

**Status:** Aceito  
**Data:** 2026-09-01  
**Relacionada:** `ADR_CONDICOES_COMERCIAIS_PAR.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md`

---

## Decisão

| Conceito | Dono | Papel |
|----------|------|--------|
| **Feriado** | `feriados` · por EMP | Dia não útil no calendário operacional da EMP |
| **Prazo escalar** | `orcamentos.prazo_entrega_dias` / `pedidos.prazo_entrega_dias` | Quantidade de dias úteis prometida (inalterado) |
| **Prazo efetivo** | calculado | `prazo_entrega_dias` + `prazo_faca_dias` quando faca nova |
| **Data prevista** | calculada · `DiasUteisService` | Dia civil de entrega após N dias úteis |
| **Referência** | calculada | Âncora do contagem (ver regras abaixo) |

**Motor R1–R20 permanece intocado.** Feriados e conversão d.úteis → data ficam na camada comercial/calendário (mesma fronteira do frete estimado).

---

## Modelo

### Feriados (`feriados`)

- Escopo: **`empresa_id`** (cada EMP mantém seu calendário).
- Campos: `data`, `nome`, `tipo` (`NACIONAL` | `ESTADUAL` | `MUNICIPAL` | `EMPRESA`), `recorrente_anual`, `ativo`, softDeletes.
- Unicidade: `(empresa_id, data)`.
- Seed opcional: feriados nacionais fixos recorrentes (`POST /feriados/seed-nacionais`).

### Regras de dia útil

1. Segunda a sexta = candidato a dia útil.
2. Feriado ativo da EMP = não útil.
3. `recorrente_anual`: compara mês/dia (ano da linha é referência de cadastro).
4. Contagem: dia de referência **não** entra; somam-se N dias úteis **posteriores**.

### Referência para data prevista

| Situação | Referência |
|----------|------------|
| Preview / calcular ORC (sem persistir) | Hoje (timezone app) |
| ORC rascunho / enviado | `created_at` do ORC |
| ORC aprovado / PED | `decidido_em` do ORC, ou `created_at` do PED |

`validade_dias` da proposta permanece em **dias corridos** (link de aprovação) — fora desta ADR.

---

## API

- CRUD: `GET/POST/PUT/DELETE /feriados` · permissões `feriado.ler` / `feriado.escrever`
- Seed: `POST /feriados/seed-nacionais`
- Preview: `GET /calendario/previsao-entrega?dias=&prazo_faca_dias=&referencia=`
- Campos enriquecidos em ORC/PED/proposta pública:
  - `prazo_efetivo_dias`
  - `prazo_referencia_em`
  - `data_entrega_prevista`

---

## UX

- **Cadastros → Feriados**: manutenção por EMP, filtro por ano, seed nacionais.
- **ORC / fichas / proposta / PED**: exibir dias úteis **e** data prevista (`DD/MM/AAAA`).

---

## Proibido (regressão)

1. Catálogo de feriados sem `empresa_id`.
2. Alterar motor R1–R20 por causa de feriado.
3. Persistir `data_entrega_prevista` como fonte da verdade sem recalcular quando feriados mudarem (campo é **derivado**; dias úteis no documento são a promessa).
4. Tratar `validade_dias` como dias úteis sem ADR nova.

Alterar esta ADR exige decisão explícita alinhada à Direção + engenharia.
