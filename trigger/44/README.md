# ZapVia — API de envio WhatsApp Business

Produto SaaS self-service: o cliente **cria conta**, **paga a mensalidade**, **cadastra o WhatsApp Business** e passa a enviar pelo contrato HTTP. O remetente já está no cadastro; a requisição traz só **destino** e **texto**.

**Não reutiliza** o agente IA (#25) nem o gateway Baileys (#41). Portas, volumes e bancos são isolados.

## Decisão de arquitetura (o melhor caminho)

| Alternativa | Por que não |
|-------------|-------------|
| Baileys / QR / “aparelhos conectados” (#41) | A sessão **cai**. O requisito é autenticação que **não seja derrubada**. |
| WhatsApp pessoal | Fora de política. Só **WhatsApp Business**. |
| **Cloud API oficial (Meta)** | Token permanente, canal Business, contrato estável. **Este é o caminho.** |

Localmente o provedor padrão é `sandbox`: o fluxo completo (conta → mensalidade → número → API) funciona **sem app da Meta**. Em produção, `WHATSAPP_PROVIDER=cloud` e o cliente informa Phone Number ID + token permanente.

## Portas (não colidem com #25 / #41 / #43)

| Serviço | Host |
|---------|------|
| Portal + API | http://localhost:8144 |
| OpenAPI | http://localhost:8144/docs |
| Postgres | localhost:5444 |
| Redis | localhost:6384 |
| RabbitMQ AMQP | localhost:5674 |
| RabbitMQ Management | http://localhost:15644 (zapvia / zapvia) |

## Subir

```bash
cp -n .env.example .env
docker compose up -d --build
```

Verifique:

```bash
curl http://localhost:8144/health
curl http://localhost:8144/ready
```

Abra o site: http://localhost:8144

## Jornada feliz

1. **Criar conta** no portal (nome, e-mail, senha).
2. **Pagar a mensalidade** (sandbox local ativa na hora; plano ZapVia Pro).
3. **Cadastrar o WhatsApp Business** (E.164) e confirmar que é Business.
4. **Guardar a API key** (`zpv_live_…`) — aparece **uma vez**.
5. O painel mostra exatamente como enviar. Exemplo:

```bash
curl -X POST http://localhost:8144/v1/messages \
  -H "Authorization: Bearer COLE_A_API_KEY_COMPLETA" \
  -H "Content-Type: application/json" \
  -d '{"external_id":"pedido-1001","to":"5534999999999","type":"text","body":"Seu pedido #1001 foi confirmado."}'
```

6. Consultar status:

```bash
curl http://localhost:8144/v1/messages/by-external/pedido-1001 \
  -H "Authorization: Bearer COLE_A_API_KEY_COMPLETA"
```

`202 Accepted` = enfileirada. O worker envia pelo número **já autenticado** daquela key. Trocar o token Cloud API no painel **não muda** a key do integrador.

No painel, aba **Envios** também permite disparar para o destino (mesmo fluxo da API). O worker (`docker compose`) consome a fila e entrega via sandbox (local) ou Cloud API (produção).

## Webhook Meta (entrega no destino)

Em produção, configure na Meta o callback:

- URL: `https://SEU_DOMINIO/v1/webhooks/whatsapp`
- Verify token: valor de `WEBHOOK_SECRET` no `.env`
- Campo: `messages` (status de entrega)

A Meta notifica `delivered`, `read` e `failed` após o envio; o sistema registra eventos de entrega ligados ao `provider_message_id`.

## Produção (Cloud API)

No `.env`:

```env
APP_ENV=production
WHATSAPP_PROVIDER=cloud
JWT_SECRET=<64+ chars>
APP_ENCRYPTION_KEY=<segredo forte>
```

No cadastro do número: Phone Number ID, WABA ID e **token permanente** (System User da Meta). O token fica criptografado em repouso. Health check periódico marca `credentials_invalid` se a Meta rejeitar — a sessão **não “cai”**; o cliente só atualiza o token.

Não publique Postgres/Redis/RabbitMQ no host. Só `8144` atrás de TLS.

## Testes

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
```

## Escopo v1 (fora de propósito)

Templates HSM / mídia, Embedded Signup da Meta, gateway de pagamento Asaas/Stripe ao vivo, multi-remetente por conta. A fiação de billing já é um adapter (`sandbox`) para plugar o provedor real sem redesenhar o produto.
