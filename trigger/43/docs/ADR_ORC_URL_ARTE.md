# ADR — URL pública da arte no orçamento (prova para aprovação)

**Status:** Retirado da superfície operacional · **Data:** 2026-09-02 · **Emenda:** 2026-09-21  
**Norma relacionada:** `ADR_ORC_LINK_APROVACAO.md` · `ADR_ORC_MODELOS_COMPOSICAO.md`

## Contexto

O cliente precisava conferir o **formato final da arte** antes de aprovar a proposta. A arte costuma viver fora do ERP. Em 2026-09-21 a operação retirou o campo da estrutura do ORC (formulário, detalhe, ficha e proposta) — a prova de arte deixa de ser etapa do fluxo comercial no sistema.

## Decisão (atual)

| Escolha | Motivo |
|---------|--------|
| **Sem campo na UX operacional** | Formulário ORC, detalhe, ficha interna, proposta pública e confirmação PED **não** exibem nem pedem `url_arte`. |
| **Snapshot / API opcional (legado)** | `input_snapshot.url_arte` e validação `http(s)` permanecem no motor/API para não quebrar ORCs antigos nem testes de contrato. Sem UI para gravar novos. |
| **Sem upload/R2 neste ADR** | Continua fora de escopo. |

## Decisão histórica (congelada)

Campo único opcional no snapshot, só `http`/`https`, link externo na proposta — ver histórico git desta ADR antes da emenda 2026-09-21.

## Fora de escopo

- Upload de arquivo / R2
- Reintroduzir o campo sem nova ADR de produto

## Consequências

- Comercial não cola URL de arte no ORC.
- Proposta e fichas ficam sem bloco “Arte para aprovação”.
- Valores legados no snapshot ficam inertes (não apagados automaticamente).
