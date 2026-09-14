# ADR — Confirmação de pedido ao cliente (PED ficha-cliente)

**Status:** Aceito  
**Data:** 2026-09-14  
**Contexto:** instalação 43 · continuidade ORC→PED  
**Relacionados:** [`ADR_PRODUCAO_PED_OP_ESTOQUE.md`](ADR_PRODUCAO_PED_OP_ESTOQUE.md) · [`IDENTIDADE_TRIGGER.md`](IDENTIDADE_TRIGGER.md) · [`ADR_ORC_GORDURA_COMERCIAL.md`](ADR_ORC_GORDURA_COMERCIAL.md) · estudo 32 `GERACAO_PEDIDO.txt`

---

## Contexto

A ficha operacional do PED (`/pedidos/:id/ficha`) é documento-mestre de chão: spec, guia, OP/OS, sem preço (PRODUCAO §2.6). O comercial precisa de um **documento oficial ao cliente** pós-liberação — espelho do que a proposta ORC é no pré-aceite.

## Decisão

```
ORC  →  ficha operacional  |  ficha-cliente (proposta)
PED  →  ficha operacional  |  ficha-cliente (confirmação)   ← esta ADR
```

| Superfície | Rota | Público | Preço |
|------------|------|---------|-------|
| Ficha operacional | `/pedidos/:id/ficha` | Interno / chão | Não |
| Confirmação ao cliente | `/pedidos/:id/ficha-cliente` | Cliente B2B | Sim (travado no PED) |

### Princípios

1. **Não misturar públicos** — a ficha operacional permanece intacta; confirmação é segunda superfície.
2. **Casca comercial** — mesma linguagem visual da proposta ORC (`orc-pub` + A4 retrato + print browser). Sem DomPDF no monólito.
3. **Fonte de verdade** — snapshot do PED + `preco_unitario` / `valor_total` dos itens; condições/frete/arte do `snapshot.input`.
4. **Identidade** — EMP herói comercial; FLEXOERP selo; TRIGGER no rodapé (`IDENTIDADE_TRIGGER`).
5. **Sem vazamento interno** — sem guia de produção, OP/OS, rastreio, gordura/`valor_etiqueta_base`, breakdown R1–R20.
6. **Assinaturas** — bloco emitente + cliente (padrão OC).

### Conteúdo mínimo

Emitente (EMP) · Cliente · Spec comercial (ou serviço) · Itens com qtde/unitário/total · Condições (prazo, tolerância, pagamento, frete) · Disposições gerais · Arte de referência (se houver) · Observação · Assinaturas.

### API

`GET /api/v1/pedidos/{id}` (detalhe) passa a incluir `empresa` comercial e campos extras do `parceiro` (CNPJ/contato/endereço) — só no detalhe, sem alterar a listagem.

## Não fazer

1. Enriquecer a ficha operacional com preço “para o cliente”.  
2. Reintroduzir DomPDF no monólito.  
3. Expor gordura ou custos na confirmação.  
4. Substituir a proposta ORC pela confirmação PED (momentos diferentes: pré-aceite × pós-contrato operacional).

Alterar esta ADR exige alinhamento explícito ao estudo 32 e à identidade de documentos.
