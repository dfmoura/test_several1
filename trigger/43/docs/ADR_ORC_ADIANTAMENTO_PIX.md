# ADR — Adiantamento PIX no aceite do orçamento (COB / BankProvider)

**Status:** Aceito · **Data:** 2026-08-11  
**Norma:** `../32/APROVACAO_ORCAMENTO_CLIENTE.txt` §5.1 · `../32/INTEGRACAO_BANCARIA_MULTI_PROVIDER.txt` · UC-COM-009 / UC-FIN-001..003  
**Ref. banco:** [Inter Cobrança BolePix](https://developers.inter.co/references/cobranca-bolepix)

## Contexto

O link de aprovação (ADR_ORC_LINK_APROVACAO) registra o aceite comercial. Falta o cenário A do estudo: **primeira compra / limite zero** → emitir cobrança PIX na mesma tela do aceite e manter o sistema **aguardando adiantamento** até a BX.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Aceite ≠ liberação financeira** | Estudo: APROVOU → COBROU → RECEBEU → PRODUZIU. Pagamento **não** substitui o clique APROVAR. |
| ORC `status=APROVADO` no clique | Aceite comercial é fato irrevogável; rótulo operacional “aguardando adiantamento” via `financeiro_status`. |
| `financeiro_status` = `AGUARDA_ADIANTAMENTO` \| `LIBERADO` | Sem inventar status comercial intermediário; PED futuro consome `LIBERADO`. |
| Exige sinal se `limite_credito ≤ 0` **ou** param EMP `orc.adiantamento_obrigatorio` | Cenário A; calibrável. Percentual: `orc.adiantamento_percentual` (default **50**). |
| TIT `RECEBER` + COB + BankProvider | Spine M06; CAP (TIT PAGAR) intacto. |
| `MockBankProvider` default | CI/local sem mTLS; `BANK_PROVIDER=inter` para sandbox. |
| Webhook `/api/v1/webhooks/bancarios/{provider}` + `webhook_inbox` | BX idempotente; libera ORC quando TIT de adiantamento quita. |
| GET público pós-aceite = DTO `modo=pagamento` | Cliente reabre o link e ainda vê PIX até a baixa. |
| UI: **Aguardando pagamento** → **Aprovado** após BX | `status` no banco permanece `APROVADO` (aceite); `status_exibicao` / `financeiro_status` guiam a UX. |
| Botão demo **Já paguei (simular)** | Só COB `mock`; dispara o **mesmo** webhook → BX real (não inventa status). |

## Fluxo

```
ENVIADO/VISUALIZADO
  └─ APROVAR → APROVADO
       ├─ limite > 0 → financeiro_status=LIBERADO
       └─ exige sinal → TIT RECEBER + COB PIX → AGUARDA_ADIANTAMENTO
            └─ BX (webhook ou manual) → LIBERADO
```

## Fora de escopo

- Conversão ORC→PED detalhada / OP chão / CQ (spine PED/OP = BL-044 / ADR_PRODUCAO_PED_OP_ESTOQUE; faturamento Focus ainda fora)
- Motor CRT de crédito (fila AGUARDA_CREDITO)
- CNAB, job de extrato, WhatsApp Business API
- Adapter Sicoob de produção (contrato preparado; plugar depois)

## Consequências

- Contas a receber na UI Financeiro (`/financeiro/contas-a-receber`).
- Credenciais Inter em `empresa_bank_credentials` (Crypt); nunca no Git.
- Regressão: `OrcamentoAprovacaoTest` (crédito > 0) + `AdiantamentoOrcamentoTest` + `MultiEmpresaAceiteTest`.
