# Zap Outbound Gateway

Gateway outbound multi-tenant por celular (Sender). Sistema X autentica com a API key de um cadastro específico, enfileira a mensagem (`202 Accepted`) e o worker envia via Evolution API / WhatsApp vinculado àquele Sender.

**Não é o agente IA inbound (#25).** Aqui não há resposta automática com IA — só transporte confiável de saída.

## Portas (isoladas do #25)

| Serviço | Host |
|---------|------|
| API Gateway | http://localhost:8141 |
| OpenAPI docs | http://localhost:8141/docs |
| Evolution (QR/admin) | http://localhost:8142 |
| Admin UI | http://localhost:8143 (profile `ui`) |
| Postgres | localhost:5437 |
| Redis | localhost:6381 |
| RabbitMQ AMQP | localhost:5671 |
| RabbitMQ Management | http://localhost:15641 (zap / zap) |

## Subir

```bash
cp .env.example .env   # se ainda não tiver .env
docker compose up -d --build
docker compose --profile ui up -d
```

Verifique:

```bash
curl http://localhost:8141/health
curl http://localhost:8141/ready
```

## Jornada feliz (primeiro sender)

1. Abra http://localhost:8141/docs ou a Admin UI em http://localhost:8143
2. Crie um sender (admin token = `ADMIN_TOKEN` do `.env`):

```bash
curl -s -X POST http://localhost:8141/v1/admin/senders \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"comercial-filial-01","rate_limit_per_minute":20}'
```

Guarde o campo `api_key` (exibido **uma única vez**).

3. Inicie o pairing e escaneie o QR:

```bash
curl -s -X POST http://localhost:8141/v1/admin/senders/{SENDER_ID}/pair \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

No celular: WhatsApp → Aparelhos conectados → escanear. O webhook `CONNECTION_UPDATE` marca o sender como `active`.

4. Enfileire uma mensagem:

```bash
curl -X POST http://localhost:8141/v1/messages \
  -H "Authorization: Bearer zpg_live_SEU_TOKEN_DO_SENDER" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "pedido-1001",
    "to": "5534999999999",
    "type": "text",
    "body": "Seu pedido #1001 foi confirmado."
  }'
```

5. Consulte status:

```bash
curl http://localhost:8141/v1/messages/by-external/pedido-1001 \
  -H "Authorization: Bearer zpg_live_SEU_TOKEN_DO_SENDER"
```

## Rebind (trocar o celular sem quebrar o Sistema X)

```bash
# 1) opcional: pause
curl -X POST http://localhost:8141/v1/admin/senders/{ID}/pause \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2) rebind → novo QR
curl -X POST http://localhost:8141/v1/admin/senders/{ID}/rebind \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3) após conectar o novo aparelho:
curl -X POST http://localhost:8141/v1/admin/senders/{ID}/resume \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

O `sender_id` e a `api_key` (salvo rotação) permanecem os mesmos para o Sistema X.

## Arquitetura (resumo)

- **API** FastAPI: auth por sender key, outbox Postgres, publish RabbitMQ
- **Worker**: consome `q.sender.{id}`, rate limit Redis, `sendText` na Evolution instance do sender
- **Retry**: backoff 15s / 45s / 2m / 5m / 15m → DLQ após 5 tentativas
- **Idempotência**: `UNIQUE(sender_id, external_id)` → replay `200`

## Admin API (protegida por `ADMIN_TOKEN`)

| Método | Path |
|--------|------|
| POST | `/v1/admin/senders` |
| GET | `/v1/admin/senders` |
| GET | `/v1/admin/senders/{id}` |
| POST | `/v1/admin/senders/{id}/pair` |
| POST | `/v1/admin/senders/{id}/rebind` |
| POST | `/v1/admin/senders/{id}/pause` |
| POST | `/v1/admin/senders/{id}/resume` |
| POST | `/v1/admin/senders/{id}/rotate-key` |
| GET | `/v1/admin/queue/stats` |
| GET | `/v1/admin/messages?status=failed` |

## Testes

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

## Produção

- Não publique Postgres/Redis/RabbitMQ no host — só `8141` (API) e, se necessário, `8142` atrás de reverse proxy autenticado.
- Defina `ADMIN_TOKEN`, `EVOLUTION_KEY` e `WEBHOOK_SECRET` fortes.
- `APP_ENV=production` desliga `/docs`.

## Escopo v1 (fora)

Templates/mídia, webhook de callback para o Sistema X, métricas Prometheus — fase 2.
