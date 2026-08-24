# ADR — E-mail transacional da proposta (ORC)

**Status:** Aceito · **Data:** 2026-08-21  
**Norma:** `ADR_ORC_LINK_APROVACAO.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md`  
**Escopo:** ao enviar/reenviar o link de aprovação, o sistema pode disparar e-mail ao destinatário do cadastro.  
**Fora:** SMTP self-service por EMP; WhatsApp Business API; régua de andamentos (visualizado/aprovado); ped/NF.

## Contexto

O envio da proposta já gera link + texto para clipboard + deep link (`wa.me` / `mailto`). O comercial pedia: e-mail padrão da gráfica + destino no cadastro do cliente, sem configurar servidor SMTP.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Motor na instalação** (`MAIL_*`) | Deliverability e ops ficam com a instalação; o usuário não cadastra host/porta/senha. |
| **Reply-To = `empresas.email`** | Campo já existe na aba Contato da EMP; é o “e-mail comercial padrão”. |
| **From = `MAIL_FROM_*`** | Remetente autenticado da instalação (SPF/DKIM do provedor). EMP não força From próprio. |
| **Destino = e-mail do contato/parceiro** | Mesma regra do link: só cadastro oficial (`parceiro_contatos` / legado). Sem endereço avulso. |
| **Disparo no `enviarParaAprovacao`** | Se o destinatário tiver e-mail válido, envia após gravar o link — mesmo quando o canal preferido é WhatsApp. |
| **Fail-soft** | Falha de mailer **não** desfaz o envio comercial (status/link/clipboard intactos). Resposta expõe `email_enviado`. |
| **Clipboard + canais manuais permanecem** | ADR do link não muda; e-mail é canal complementar. WhatsApp ViaZap: `ADR_ORC_WHATSAPP_VIAZAP.md`. |

## Fluxo

```
enviar aprovação
  → gera/reusa link (como hoje)
  → se contato tem e-mail válido → Mail::to(destino) + Reply-To(EMP.email)
  → retorna { url, mensagem, canal_url, email_enviado, email_destino, … }
```

## Configuração

| Camada | O quê |
|--------|--------|
| Instalação | `MAIL_MAILER`, `MAIL_HOST`, …, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` · flag `ORCAMENTO_EMAIL_AUTO` (padrão true) |
| EMP | `empresas.email` (Reply-To / identidade comercial) |
| Parceiro | `parceiro_contatos.email` ou `parceiros.email` (legado) |

## Consequências

- Produção precisa de mailer real (SMTP/Resend/SES) na instalação; local/CI podem usar `log`/`array`.
- Sem e-mail no contato: não envia; WhatsApp/clipboard seguem.
- Sem `empresas.email`: envia mesmo assim, sem Reply-To.
- Andamentos (visualizou / aprovou / recusou) ficam para BL futuro — não nesta fatia.
- SMTP por EMP continua **proibido** sem ADR novo.
