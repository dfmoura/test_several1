# ADR — WhatsApp transacional da proposta (ViaZap)

**Status:** Aceito · **Data:** 2026-08-23  
**Norma:** `ADR_ORC_LINK_APROVACAO.md` · `ADR_ORC_EMAIL_PROPOSTA.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md`  
**Escopo:** ao enviar/reenviar o link de aprovação, o sistema pode disparar WhatsApp via ViaZap ao destinatário do cadastro.  
**Fora:** WhatsApp por EMP; régua de andamentos; PED/NF.

## Contexto

O envio da proposta já gera link + texto para clipboard + deep link (`wa.me` / `mailto`) e e-mail automático fail-soft (`ADR_ORC_EMAIL_PROPOSTA`). A instalação dispõe de um gateway ViaZap (local + tunnel `https://viazap.triggerti.com`) para envio programático.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Motor na instalação** (`VIAZAP_*`) | Token e URL ficam com ops; EMP não configura gateway. |
| **Destino = WhatsApp do contato/parceiro** | Mesma regra do link: só cadastro oficial (`parceiro_contatos` / legado). |
| **Disparo no `enviarParaAprovacao`** | Após gravar o link; envia se houver WhatsApp válido — mesmo quando o canal preferido é e-mail. |
| **`body` = `mensagemPadrao()`** | Uma fonte de texto (Zap, clipboard, wa.me). |
| **`external_id` = `{codigo}:{YmdHis}:{hex}`** | ViaZap é idempotente por remetente: o mesmo id devolve **200** e **não** reenvia. Cada Enviar/reenviar usa id novo; se vier 200 (replay), o motor tenta 1× com outro id. |
| **`VIAZAP_BASE_URL` absoluta `https://…`** | Container AWS não usa `localhost:8144`; canônico = tunnel `https://viazap.triggerti.com` → notebook `:8144`. |
| **Fail-soft** | Falha do ViaZap **não** desfaz status/link/clipboard. Resposta expõe `zap_enviado`. |
| **Sem config = silencioso** | Sem `VIAZAP_BASE_URL` + `VIAZAP_TOKEN`, retorna `zap_motivo: desligado` (não alarmar dev). |
| **Clipboard + wa.me permanecem** | Canal manual como fallback. |

## Fluxo

```
enviar aprovação
  → gera/reusa link (como hoje)
  → mensagemPadrao()
  → se ViaZap configurado e contato tem WhatsApp → POST /v1/messages
  → retorna { url, mensagem, canal_url, zap_enviado, zap_destino, email_*, … }
```

## Configuração

| Camada | O quê |
|--------|--------|
| Instalação | `VIAZAP_BASE_URL`, `VIAZAP_TOKEN`, `VIAZAP_TIMEOUT_SEC` · flag `ORCAMENTO_WHATSAPP_AUTO` (padrão true) |
| Parceiro | `parceiro_contatos.whatsapp` ou `parceiros.whatsapp` (legado) |

**Produção/dev com Docker:** usar `https://viazap.triggerti.com` (não `localhost:8144` — o container não alcança o host).  
**AWS:** `VIAZAP_*` no `.env.aws` (gitignored). Sem token → `zap_motivo: desligado`. Health: `envio_proposta.viazap_configurado`.

**AWS → ViaZap:** a Lightsail chama `https://viazap.triggerti.com` (Cloudflare Tunnel → `localhost:8144` no notebook). O QR/sessão WhatsApp e o processo ViaZap precisam estar **no ar no host do tunnel**; senão a API pode aceitar (202) e a entrega falha, ou o POST nem chega.

## Consequências

- ViaZap indisponível: comercial usa clipboard/wa.me; link e e-mail seguem.
- Sem WhatsApp no contato: não dispara; e-mail/clipboard seguem.
- Reenviar proposta gera novo `external_id` (`{codigo}:{YmdHis}:{hex}`); se o ViaZap devolver 200 (replay), o motor retenta 1×. Só HTTP **202** conta como `zap_enviado`.
- Andamentos (visualizou / aprovou) ficam para BL futuro.
- WhatsApp por EMP continua **proibido** sem ADR novo.
