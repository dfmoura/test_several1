# Assistência à demanda (Trigger)

Serviço local de assistência à demanda: chat para o cliente formular a **descrição**, e desdobramento operacional de **proposta + plano de etapas**. O Laravel da área do cliente (`trigger/48`) fala com esta API; o browser não.

## Subir

```bash
cp .env.example .env
make up
```

Health: http://127.0.0.1:8051/health

A porta escuta em `0.0.0.0` no host para o container do `48` alcançar via `host.docker.internal`. Em produção use firewall/Lightsail, não deixe aberto na internet.

```bash
make test
make logs
make down
```

## Contrato (v1)

| Método | Caminho | Auth |
|--------|---------|------|
| GET | `/health` | não |
| POST | `/v1/sessions` | `X-API-Key` ou `Authorization: Bearer` |
| POST | `/v1/sessions/{id}/messages` | idem — body `{ "message": "..." }` |
| POST | `/v1/sessions/{id}/compose` | idem — devolve `{ "descricao": "..." }` sem encerrar a sessão |
| POST | `/v1/sessions/{id}/finalize` | alias de `/compose` (compat) |
| POST | `/v1/desdobrar` | rascunho fiel ao pedido: escopo + etapas mínimas (sem inventar; sem preço/prazo) |

Local: chave padrão `assistencia-local-dev` (troque antes de qualquer máquina compartilhada).

## Motor

- `LLM_MODE=mock` — conversa determinística, sem chave externa (padrão local).
- `LLM_MODE=openai` — chama API compatível (`OPENAI_BASE_URL` + `OPENAI_API_KEY`).

A operação da área do cliente configura provedor/modelo/token em `/operacao/assistencia`.
Isso grava em `/app/data/llm.json` (token cifrado) via:

| Método | Caminho |
|--------|---------|
| GET | `/v1/admin/llm` |
| PUT | `/v1/admin/llm` |
| POST | `/v1/admin/llm/test` |

O GET nunca devolve o token completo — só `api_key_hint`.

Não pede nem devolve acessos/senhas. Não inventa preço nem prazo contratual.

## Integração com a área do cliente

No `48/cliente/apps/api/.env`:

```env
ASSISTENCIA_HABILITADA=true
ASSISTENCIA_URL=http://host.docker.internal:8051
ASSISTENCIA_API_KEY=assistencia-local-dev
```

A app Docker do `48` usa `host.docker.internal` para alcançar esta porta no host.
