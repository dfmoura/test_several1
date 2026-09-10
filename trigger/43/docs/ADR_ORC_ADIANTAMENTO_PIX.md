# ADR — Adiantamento PIX no aceite do orçamento (COB / BankProvider)

**Status:** Aceito (emenda 2026-09-10 — política histórico)  
**Data:** 2026-08-11  
**Norma:** `../32/APROVACAO_ORCAMENTO_CLIENTE.txt` §5.1 · `../32/INTEGRACAO_BANCARIA_MULTI_PROVIDER.txt` · UC-COM-009 / UC-FIN-001..003  
**Ref. banco:** [Inter Cobrança BolePix](https://developers.inter.co/references/cobranca-bolepix)

## Contexto

O link de aprovação (ADR_ORC_LINK_APROVACAO) registra o aceite comercial. Cenário A do estudo: **primeira compra** → emitir cobrança PIX na mesma tela do aceite e manter o sistema **aguardando adiantamento** até a BX. Cliente que **já fez serviço** e está **sem pendência** segue para PED e cobra no boleto/DDL negociado.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Aceite ≠ liberação financeira** | Estudo: APROVOU → COBROU → RECEBEU → PRODUZIU. Pagamento **não** substitui o clique APROVAR. |
| ORC `status=APROVADO` no clique | Aceite comercial é fato irrevogável; rótulo operacional “aguardando adiantamento” via `financeiro_status`. |
| `financeiro_status` = `AGUARDA_ADIANTAMENTO` \| `LIBERADO` | Sem inventar status comercial intermediário; PED consome `LIBERADO`. |
| **Política automática por histórico** | Novo (sem PED não-cancelado) ou TIT RECEBER vencido → sinal; recorrente limpo → sem sinal. |
| Percentual `orc.adiantamento_percentual` (default **50**) | Calibrável por EMP. |
| Override `orc.adiantamento_obrigatorio=SIM` | Força sinal em todo aceite da EMP (onboarding seed default **NAO**). |
| `limite_credito` SoD, não gate único | Continua cadastro FINANCEIRO; não decide sozinho com/sem sinal. |
| TIT `RECEBER` + COB + BankProvider | Spine M06; CAP (TIT PAGAR) intacto. Sinal no aceite = **PIX**. |
| `MockBankProvider` default | CI/local sem mTLS; `BANK_PROVIDER=inter` para sandbox. |
| Webhook `/api/v1/webhooks/bancarios/{provider}` + `webhook_inbox` | BX idempotente; libera ORC quando TIT de adiantamento quita. |
| GET público pós-aceite = DTO `modo=pagamento` | Cliente reabre o link e ainda vê PIX até a baixa. |
| UI: **Aguardando pagamento** → **Aprovado** após BX | `status` no banco permanece `APROVADO` (aceite); `status_exibicao` / `financeiro_status` guiam a UX. |
| Botão demo **Já paguei (simular)** | Só COB `mock`; dispara o **mesmo** webhook → BX real (não inventa status). |

### Perfis (`AdiantamentoService::classificarParceiro`)

| Perfil | Critério | Aceite |
|--------|----------|--------|
| `NOVO` | Nenhum PED não-cancelado do PAR na EMP | Exige sinal 50% (PIX) |
| `RECORRENTE_PENDENTE` | TIT RECEBER `ABERTO`/`PARCIAL`, `vencimento < hoje`, `saldo > 0` | Exige sinal |
| `RECORRENTE_LIMPO` | Já teve PED e sem TIT vencido | `LIBERADO` + PED; cobrança no FAT conforme condição (boleto) |
| Override EMP | `orc.adiantamento_obrigatorio` | Sempre exige |

DTO no PAR: `politica_comercial` `{ perfil, exige_sinal, motivo, titulos_vencidos }`.

## Fluxo

```
ENVIADO/VISUALIZADO
  └─ APROVAR → APROVADO
       ├─ recorrente limpo (e EMP não obriga) → financeiro_status=LIBERADO → PED
       └─ exige sinal → TIT RECEBER + COB PIX → AGUARDA_ADIANTAMENTO
            └─ BX (webhook ou manual) → LIBERADO → PED
```

## Fora de escopo

- Conversão ORC→PED detalhada / OP chão / CQ (spine PED/OP = BL-044 / ADR_PRODUCAO_PED_OP_ESTOQUE)
- Motor CRT de crédito (fila AGUARDA_CREDITO)
- Auto-elevação de `limite_credito`
- Sinal em boleto no aceite (continua PIX)
- CNAB, job de extrato, WhatsApp Business API
- Adapter Sicoob de produção (contrato preparado; plugar depois)

## Consequências

- Contas a receber na UI Financeiro (`/financeiro/contas-a-receber`).
- Credenciais Inter em `empresa_bank_credentials` (Crypt); nunca no Git.
- EMP já seedada com `adiantamento_obrigatorio=SIM` precisa ajustar o param para usar a política automática.
- Regressão: `OrcamentoAprovacaoTest` + `AdiantamentoOrcamentoTest` + `MultiEmpresaAceiteTest`.
