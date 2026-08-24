# ZapVia — hub privado de envio WhatsApp Business

**Caminho padrão:** instância **privada** sua — um site só do operador. Você entra, cadastra **N números** (cada um = remetente + API key + fila) e pluga a key nos **seus** sistemas. O ZapVia não é o produto dos seus clientes finais; é a infraestrutura de envio.

Cadastro: `bootstrap` (só a 1ª conta; depois fecha). Billing sandbox ativa sozinho. Alternativa SaaS (`DEPLOYMENT_MODE=saas`) existe, mas não é o modo recomendado deste projeto.

O remetente já está no cadastro; a requisição HTTP traz só **destino** e **texto**.

Portas, volumes e bancos são isolados de #25 / #41 / #43.

## Decisão de arquitetura (o melhor caminho)

| Caminho | Quando usar |
|---------|-------------|
| **QR (Baileys via Evolution)** | No painel do operador: escaneie o QR no WhatsApp Business → Aparelhos conectados. Sessão na Evolution; o ZapVia guarda só status + instância. |
| **Cloud API (Meta)** | Produção com token permanente — sem depender de sessão de aparelho. |
| **Sandbox** | Local/testes sem Meta e sem Evolution. |

O portal prioriza o QR. Cloud API / sandbox ficam como caminho avançado. Os três coexistem sem se sobrescreverem.

Em desenvolvimento as portas do host escutam só em `127.0.0.1` (localhost). Em produção privada, a internet vê apenas 80/443 no Caddy.

## Portas (não colidem com #25 / #41 / #43)

| Serviço | Host |
|---------|------|
| Portal + API | http://localhost:8144 (só loopback) |
| OpenAPI | http://localhost:8144/docs |
| Evolution (QR) | http://localhost:8145 |
| Postgres | localhost:5444 |
| Redis | localhost:6384 |
| RabbitMQ AMQP | localhost:5674 |
| RabbitMQ Management | http://localhost:15644 (zapvia / zapvia) |

## Subir

```bash
cp -n .env.example .env
./scripts/ready-to-test.sh
```

(ou `docker compose up -d --build` manualmente)

Se o Postgres já existia sem o banco `evolution` (upgrade), o script cria; se preferir na mão:

```bash
docker compose exec postgres psql -U zapvia -c "CREATE DATABASE evolution"
```

Verifique:

```bash
curl http://localhost:8144/health
curl http://localhost:8144/ready
```

Abra o site: http://localhost:8144

## Pipeline de envio (caminho único)

Qualquer origem — painel, `POST /v1/messages` ou o sistema do cliente — entra no mesmo pipeline. O remetente **não vai na requisição**: a API key (ou a sessão do painel) aponta para o WhatsApp Business já cadastrado.

```
receber (destino + texto)
    → amarrar ao remetente Zap da conta
    → persistir (Postgres) e só então publicar
    → fila isolada q.sender.{id}
    → worker envia por Baileys / Cloud API / sandbox daquele número
```

`202 Accepted` = na fila daquele remetente. Replay do mesmo `external_id` devolve `200` sem duplicar.

## Jornada feliz

1. **Criar conta** no portal (nome, e-mail, senha).
2. **Pagar a mensalidade** (sandbox local ativa na hora; plano ZapVia Pro).
3. **Conectar o WhatsApp Business** na aba do painel:
   - **QR (recomendado):** confirme Business → Gere o QR → no celular, WhatsApp Business → Aparelhos conectados → escaneie. O painel detecta a conexão e libera a API.
   - **Avançado:** Cloud API (Phone Number ID + token) ou sandbox com E.164.
4. **Guardar a API key** (`zpv_live_…`) — aparece **uma vez** (na criação do remetente). Não é senha, não é token da Meta e não é o prefixo truncado do painel. Se não copiou: aba **Como enviar** → gerar nova key (o WhatsApp permanece conectado).
5. O painel **Como enviar** monta o curl. Com a key em mão:

```bash
export ZAPVIA_API_KEY='zpv_live_cole_a_key_completa'
curl -X POST http://localhost:8144/v1/messages \
  -H "Authorization: Bearer $ZAPVIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"external_id":"pedido-1001","to":"5534999999999","type":"text","body":"Seu pedido #1001 foi confirmado."}'
```

6. Consultar status:

```bash
curl http://localhost:8144/v1/messages/by-external/pedido-1001 \
  -H "Authorization: Bearer $ZAPVIA_API_KEY"
```

`202 Accepted` = enfileirada. O worker envia pelo número **já autenticado** daquela key.

No painel, aba **Envios** também permite disparar para o destino (mesmo fluxo da API).

### Endpoints de pareamento QR

| Método | Path | Uso |
|--------|------|-----|
| POST | `/v1/senders/pair` | Gera/renova QR |
| GET | `/v1/senders/pair/status` | Poll após o scan |
| POST | `/v1/senders/rebind` | Novo QR se a sessão caiu |
| POST | `/v1/webhooks/evolution` | Webhook Evolution `CONNECTION_UPDATE` |

## Webhook Meta (entrega no destino — Cloud API)

Em produção Cloud, configure na Meta o callback:

- URL: `https://SEU_DOMINIO/v1/webhooks/whatsapp`
- Verify token: valor de `WEBHOOK_SECRET` no `.env`
- Campo: `messages` (status de entrega)

## Produção — instância privada (AWS Lightsail)

Ferramenta sua: **uma conta operacional**, sem cobrança real, N números (remetentes) no painel, cada um com API key para os seus sistemas. O pipeline de envio não muda. Billing sandbox continua por baixo (licença interna de 10 anos).

**Melhor caminho na AWS:** uma VM Lightsail (ou EC2) + Docker Compose + Caddy. Não use Lambda/ECS/RDS neste desenho — o produto é um appliance privado always-on; serverless só aumentaria custo e complexidade sem ganho.

### Capacidade (não estoura a conta; evita OOM)

| Plano | Quando |
|-------|--------|
| **4 GB RAM / 2 vCPU / ≥40 GB SSD** | Mínimo — 1 número QR |
| **8 GB RAM / 2 vCPU / ≥80 GB SSD** | **Recomendado** — vários remetentes + margem |
| Snapshot Lightsail diário | Disco + volumes Docker |

O custo AWS é **fixo da VM** (não por mensagem). O overlay `docker-compose.prod.yml` aplica `mem_limit` e o Compose gira logs (`10m × 3`). Mensagens terminais com mais de `MESSAGE_RETENTION_DAYS` (90) são purgadas pelo worker.

### Subir

Na máquina (Ubuntu):

```bash
sudo ./scripts/prepare-host.sh
# DNS A do domínio → IP estático.
# Firewall Lightsail: 22 só no SEU IP, 80 e 443 abertos. Resto fechado.
./scripts/new-prod-env.sh zap.seudominio.com voce@seudominio.com
./scripts/preflight-production.sh   # opcional; up-production já chama
./scripts/up-production.sh
```

Depois: abrir `https://zap.seudominio.com` → criar **a sua** conta **na hora** → conectar o WhatsApp Business → guardar a API key. O cadastro público fecha sozinho (`REGISTRATION_MODE=bootstrap`).

Backup diário (cron):

```bash
./scripts/backup-postgres.sh
```

Não use `docker compose up` puro em produção — isso não sobe o Caddy (TLS). O overlay é `docker-compose.prod.yml`.

Portas de Postgres, Redis, RabbitMQ e Evolution escutam só em `127.0.0.1`. Na internet: 80/443 via Caddy. O webhook Evolution (`/v1/webhooks/evolution`) fica **só na rede Docker** — o Caddy responde 404 na internet pública.

## Produção (Cloud API)

Se o número for Cloud API da Meta (sem QR / sem Evolution) no mesmo host privado:

```env
WHATSAPP_PROVIDER=cloud
EVOLUTION_ENABLED=false
```

No cadastro do número: Phone Number ID, WABA ID e **token permanente** (System User da Meta). O token fica criptografado em repouso.

QR e Cloud API continuam podendo coexistir; o portal prioriza o QR.

## Testes

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
```

## Multi-remetente (hub privado)

Uma conta operacional pode cadastrar **N números WhatsApp**. Cada número é um **remetente** com:

- API key própria (`zpv_live_…`)
- fila isolada `q.sender.{id}`
- rótulo interno opcional (`label`) para mapear no seu sistema (loja, cliente, unidade)

Fluxo recomendado para os **seus** sistemas (o ZapVia permanece privado):

1. No painel, cadastre o número do remetente (QR ou Cloud) e copie a API key.
2. No sistema consumidor, guarde a key no setup da entidade que envia.
3. O consumidor chama `POST /v1/messages` com destino + texto; o Bearer aponta o remetente.

```
sistema seu  →  API key do remetente X  →  ZapVia privado  →  fila q.sender.X  →  WhatsApp de X
```

Endpoints úteis:

| Método | Path | Uso |
|--------|------|-----|
| GET | `/v1/senders` | Lista remetentes da conta |
| POST | `/v1/senders/pair` | QR; `as_new=true` cria outro número |
| POST | `/v1/senders/connect` | Cloud/sandbox; idem com `as_new` |
| POST | `/v1/senders/rebind?sender_id=` | Novo QR de um remetente |
| POST | `/v1/senders/rotate-key?sender_id=` | Nova key (WhatsApp permanece) |

## Escopo v1 (fora de propósito)

Templates HSM / mídia, Embedded Signup da Meta, gateway de pagamento Asaas/Stripe ao vivo. A fiação de billing já é um adapter (`sandbox`) para plugar o provedor real sem redesenhar o produto.
