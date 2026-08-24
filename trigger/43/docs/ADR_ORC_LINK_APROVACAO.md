# ADR — Link público de aprovação do orçamento (ORC)

**Status:** Aceito · **Data:** 2026-08-09  
**Norma:** `../32/APROVACAO_ORCAMENTO_CLIENTE.txt` · `../32/GERACAO_ORCAMENTO.txt` §6/§9 · protótipo `../33`  
**Escopo:** envio → link → aceite/recusa. **Fora:** WhatsApp API, PED, crédito, aceite manual gerente.

## Contexto

O 39 já persiste ORC em `RASCUNHO`/`CALCULADO` (editáveis). Falta o gatilho formal de aceite do cliente via link único — sem isso não há caminho seguro para PED.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Mesmo monólito** + rota SPA `/p/:token` | Um deploy; subdomínio `flexorc.triggerti.com` aponta para o mesmo app (CNAME/host). Sem microserviço. |
| **Base URL configurável** `ORCAMENTO_PUBLIC_BASE_URL` | Local = `APP_URL`; prod = `https://flexorc.triggerti.com`. Link absoluto no Ctrl+C. |
| **Tabela `orcamento_links_aprovacao`** (1:1) | Token longo, validade, visualizações, `ativo`/`usado_em` — sem expor `id` sequencial. |
| **Destinatário = contato oficial autorizado** | Estudo §1.4 / §3.4: sem senha no link; identificação = canal + token. Proibido número/e-mail avulso no envio. Flag `parceiro_contatos.autorizado_aprovar`. |
| **DTO só comercial no público** | Nunca custo, margem, comissão, imposto (estudo §3). Página declara **quem** deve decidir. |
| **Clipboard + texto padrão + deep link do canal** | “Olá, [contato]! …” + botão Abrir WhatsApp/e-mail. E-mail automático: `ADR_ORC_EMAIL_PROPOSTA.md`. WhatsApp ViaZap: `ADR_ORC_WHATSAPP_VIAZAP.md` (fail-soft; clipboard intacto). |
| **Prévia interna ≠ link do cliente** | “Abrir proposta” no ERP abre `/orcamentos/{id}/proposta` (autenticado, `modo: preview`, sem decidir). Aprovar/recusar só em `/p/{token}`. |
| **Sem senha no link** | Estudo §3.4: atrito mataria adesão mobile; segurança = token longo + destinatário oficial + uso único. |
| **Sem host estático (R2/Pages) da proposta** | Fonte da verdade = ERP; aprovar/recusar atualiza o banco na hora. R2 só para anexos privados (futuro). |
| **Sem PED automático** | Aceite grava status `APROVADO` + faixa; conversão PED é BL seguinte. |

## Quem pode aprovar (clareza operacional)

1. Comercial escolhe o **contato autorizado** do parceiro (WhatsApp ou e-mail).
2. Mensagem Ctrl+C é endereçada a essa pessoa.
3. Página pública: “enviada para aprovação de **X** — somente esta pessoa deve decidir”.
4. Aceite exige confirmação em 2 passos (nome + resumo da faixa).
5. Sem senha (adesão mobile); segurança = token + destinatário do cadastro + link único que some após decidir.

## Máquina de estados (operacional)

```
RASCUNHO / CALCULADO  →  "Em preparação"     editável · excluível
        │
        ▼  enviar para aprovação (gera/reusa link)
ENVIADO / VISUALIZADO →  "Enviado p/ aprovação"  imutável
        │
        ├─ APROVAR  → APROVADO   (link inativo; pronto para PED futuro)
        └─ RECUSAR  → REPROVADO  (link inativo; editável → recalcula → reenvia)
```

| Status | Editar | Excluir | Link público |
|--------|--------|---------|--------------|
| RASCUNHO, CALCULADO | sim | sim | — |
| ENVIADO, VISUALIZADO | não | não | ativo até decidir/expirar |
| APROVADO | não | não | indisponível |
| REPROVADO | sim (vira CALCULADO) | sim | indisponível até novo envio |
| CANCELADO, VENCIDO | não | — | — |

Após aprovar **ou** rejeitar, GET do token responde **indisponível** (não mostra a proposta).

## API

**Autenticada** (`orcamento.escrever` / `orcamento.ler`):

- `GET  /api/v1/orcamentos/{id}/destinatarios-aprovacao` → contatos elegíveis
- `POST /api/v1/orcamentos/{id}/enviar-aprovacao` → `{ parceiro_contato_id }` → `{ url, token, mensagem, canal_url, destinatario, … }`
- `GET  /api/v1/orcamentos/{id}/proposta-comercial` → mesma visão comercial, `modo: preview` / `somente_leitura` (não consome token, sem decidir)

**Pública** (throttle; sem Sanctum):

- `GET  /api/v1/publico/orcamentos/{token}` → proposta + `destinatario.instrucao`
- `POST /api/v1/publico/orcamentos/{token}/decidir` → `{ acao: APROVAR|RECUSAR, … }`

## Consequências

- Nginx/Caddy: host `flexorc.*` serve o mesmo SPA; path `/p/*` e `/api/v1/publico/*`.
- DNS: CNAME `flexorc.triggerti.com` → mesmo alvo do ERP (Lightsail/ALB). Em prod: `ORCAMENTO_PUBLIC_BASE_URL=https://flexorc.triggerti.com`.
- Nova versão após `REPROVADO` invalida link antigo (já inativo) e exige novo envio.
- PED / crédito / WhatsApp Business / object storage (R2) ficam explicitamente para BLs futuros.
- E-mail transacional ao enviar o link: `docs/ADR_ORC_EMAIL_PROPOSTA.md` (motor `MAIL_*` + Reply-To `empresas.email`).
- WhatsApp transacional (ViaZap): `docs/ADR_ORC_WHATSAPP_VIAZAP.md` (motor `VIAZAP_*`; fail-soft).
- Pós-aceite com adiantamento PIX: ver `docs/ADR_ORC_ADIANTAMENTO_PIX.md` (`financeiro_status`, COB, BankProvider). O status comercial permanece `APROVADO`; a BX libera prontidão financeira, não “reaprova” o ORC.
- Vocabulário: a página pública **não** é “webhook”; webhooks no ERP = Focus/banco/Meta.
