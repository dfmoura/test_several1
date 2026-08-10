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
| **DTO só comercial no público** | Nunca custo, margem, comissão, imposto (estudo §3). |
| **Clipboard + texto padrão** | Envio WhatsApp/e-mail fica para integração oficial; hoje o comercial copia e cola. |
| **Sem PED automático** | Aceite grava status `APROVADO` + faixa; conversão PED é BL seguinte. |

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

**Autenticada** (`orcamento.escrever`):

- `POST /api/v1/orcamentos/{id}/enviar-aprovacao` → `{ url, token, mensagem, expira_em, reutilizado }`

**Pública** (throttle; sem Sanctum):

- `GET  /api/v1/publico/orcamentos/{token}` → proposta comercial (+ marca `VISUALIZADO`)
- `POST /api/v1/publico/orcamentos/{token}/decidir` → `{ acao: APROVAR|RECUSAR, … }`

## Consequências

- Nginx/Caddy: host `flexorc.*` serve o mesmo SPA; path `/p/*` e `/api/v1/publico/*`.
- Nova versão após `REPROVADO` invalida link antigo (já inativo) e exige novo envio.
- PED / crédito / WhatsApp Business ficam explicitamente para BLs futuros.
