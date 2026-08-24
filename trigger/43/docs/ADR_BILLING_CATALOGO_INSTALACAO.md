# ADR — Catálogo de mensalidade da instalação (setup em tempo real)

**Status:** Aceito · **Data:** 2026-08-23  
**Norma:** `ADR_CONSOLE_PLATAFORMA.md` · `ADR_ATIVACAO_EMPRESA.md` · `ADR_INTER_BILLING_MENSALIDADE.md`

## Contexto

O valor da mensalidade FLEXORC (conta → TRIGGER) vivia em `FLEXORC_BILLING_VALUE` / `config/erp.php`. Em produção com `config:cache`, alterar `.env` exige redeploy e não reflete na hora para o cliente. O console TRIGGER já opera contas, cortesia e integração Inter — faltava governar o **plano comercial** sem tocar no servidor.

## Decisão

| Escolha | Motivo |
|---------|--------|
| Tabela singleton `billing_catalogo_instalacao` | Mesmo padrão de `billing_integracao_inter`; 1 instalação = 1 preço de tabela |
| `BillingCatalog` lê banco → fallback env | Bootstrap/CI intactos; runtime sem cache de config para preço |
| Console `/plataforma/configuracao/mensalidade` + `plataforma.billing.gerir` | Ops TRIGGER; `ADMIN` do cliente não vê nem edita |
| Audit `PLATAFORMA_BILLING_CATALOGO` | Histórico de quem mudou e valores anterior/novo |
| UI cliente reflete no próximo `GET /ativacao` | Já usa `BillingCatalog` — zero mudança de contrato |
| Inter: `invalidarPixAberto` ao mudar preço | QR antigo não cobra valor errado |
| ASAAS: `PUT /subscriptions/{id}` com `updatePendingPayments: false` | Novo valor no **próximo ciclo** — padrão SaaS B2B |

```
Operador PLATAFORMA → PUT /plataforma/billing/catalogo
  → billing_catalogo_instalacao
  → BillingCatalog (fonte única)
  → /conta/mensalidade (cliente)
  → sync Inter (invalida PIX) + ASAAS (assinaturas ativas)
```

## Fora de escopo

- Preço por conta ou por EMP (continua tabela única da instalação)
- Vigência agendada (“sobe em 01/09”) — evolução futura via audit + job
- Edição pelo `ADMIN` do FLEXORC

## Consequências

- MRR do painel recalcula com o valor do banco
- Primeira edição cria a linha; antes disso `fonte=env`
- Testes: `BillingCatalogoInstalacaoTest`
