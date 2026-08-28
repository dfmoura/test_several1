# ADR — Mensalidade FLEXORC via Banco Inter (PIX BolePix)

**Status:** Aceito · **Data:** 2026-08-21  
**Norma:** `ADR_ATIVACAO_EMPRESA.md` · `ADR_CONSOLE_PLATAFORMA.md` · API [Cobrança BolePix](https://developers.inter.co/references/cobranca-bolepix)

## Contexto

A mensalidade da conta FLEXORC (conta → TRIGGER) já opera com ASAAS Checkout **cartão recorrente**. Parte do perfil de cliente prefere **PIX** (confirmação imediata, sem taxa de cartão). O Inter já existia só no **sinal do ORC** (`BANK_PROVIDER` / `InterBankProvider`) — camada distinta.

## Decisão

| Escolha | Motivo |
|---------|--------|
| Provedor paralelo `BILLING_PROVIDER=inter` | ASAAS permanece intacto; troca só o gateway ativo |
| PIX **por ciclo** (emitir BolePix, QR + copia-e-cola) | Sem assinatura automática no Inter; no próximo vencimento emite outro |
| Credenciais na instalação (`billing_integracao_inter`), console `/plataforma/integracoes/inter` | Recebedor é TRIGGER, não a EMP |
| Cert/key PEM **cifrados** (`BankCrypto` / `APP_KEY`) | Melhor que path em disco; alinhado ao padrão A1 |
| Webhook `/api/v1/webhooks/bancarios/inter` com ramo billing `FLEXORC-CONTA-*` | Mesmo inbox do sinal; fan-out por `seuNumero` / `codigoSolicitacao` |
| Janela de renovação = pendente / suspensa / cortesia encerrada / ≤ N dias (config alerta) | Espelha UX de cortesia; ciclo vencido → `SUSPENSA` local |

```
TRIGGER (console) → credenciais Inter
Conta FLEXORC → POST /ativacao/pagamento → BolePix → QR na fatura
Cliente paga PIX → webhook RECEBIDO → ATIVA + limpa PIX aberto
Próximo ciclo → novo PIX
```

## Fora de escopo

- Pix Automático Inter (recorrência nativa)
- Mostrar ASAAS e Inter ao mesmo tempo na mesma conta
- Migrar chaves ASAAS para UI (continuam em env)
- Credenciais Inter do **sinal ORC** (`empresa_bank_credentials`)

## Consequências

- Ops: cadastrar operador / clientId / secret / `.crt`+`.key` no console; `BILLING_PROVIDER=inter` no `.env`
- Webhook no Internet Banking Inter: **ensaio lab** → `https://flexorc.triggerti.com/api/v1/webhooks/bancarios/inter` (tunnel). **Homolog/prod** → `https://flexoerp001.triggerti.com/api/v1/webhooks/bancarios/inter` (`ORCAMENTO_PUBLIC_BASE_URL`). `APP_URL` local continua `localhost:8043` no lab.
- **Pull de reconciliação:** `GET /ativacao` consulta o Inter se houver PIX aberto (rate-limit ~20s). Cobre lab/túnel quando o webhook não chega.
- UI `/conta/mensalidade`: painel PIX + polling (não redirect Checkout)
- Emissão exige EMP da conta com **CNPJ válido** (pagador Inter); `seuNumero` curto `FC…` (limite do banco)
- PIX aberto: reuso enquanto válido; expira no **menor** entre `dataVencimento` e TTL operacional (`FLEXORC_INTER_PIX_TTL_HORAS`, default 3h) → cancelamento Inter + limpa QR + “Gerar novo PIX”
- Testes: `InterBillingMensalidadeTest` + regressão `AsaasCheckoutBillingTest`
