# Reta Gestão — ERP operacional

Sistema de gestão da **Reta Etiquetas** (orçamento → pedido → OS → NF-e/cobrança → entrega → financeiro), alinhado à documentação em [`docs/`](./docs/).

## Subir ambiente local (Docker)

```bash
cp .env.example .env
docker compose -f deploy/docker-compose.yml up -d --build
```

| Serviço | URL |
|---------|-----|
| App (Caddy) | http://localhost |
| API health | http://localhost/health |
| Mailpit | http://localhost:8025 |
| Adminer (Postgres) | http://localhost:8081 |
| MinIO console | http://localhost:9001 |
| Postgres (host) | `localhost:5433` |

**Login:** `admin@reta.local` / `admin123`

Providers locais: `BILLING_PROVIDER=fake`, `NFE_PROVIDER=fake` (sem certificado Inter / hub NF-e).

## Desenvolvimento (hot reload)

```bash
pnpm install
pnpm --filter @reta/domain build
# Postgres/Redis do compose:
docker compose -f deploy/docker-compose.yml up -d db redis minio mailpit
pnpm dev:api
pnpm dev:web
pnpm --filter @reta/domain test
```

## Fluxo de teste sugerido

1. Login → Dashboard  
2. **Orçamentos → Novo** (defaults Banca do Dinei) → calcular → salvar  
3. Enviar → aprovar faixa (ex. 10.000) → criar pedido (gera OS)  
4. **Ordens** → liberar → iniciar → concluir  
5. **Faturamento** → NF-e fake + cobrança fake  
6. **Entregas** → expedir → confirmar  
7. **Financeiro** → baixa manual (ou `POST /api/webhooks/inter`)

## Estrutura

```
apps/api      API Fastify + worker (outbox)
apps/web      Next.js (UI operacional)
packages/domain   PricingEngine (caso dourado Banca do Dinei)
deploy/       Compose local + overlay produção
docs/         Arquitetura, schema, motor, fluxo
```

## Produção

Mesmas imagens; overlay e secrets:

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.prod.yml up -d
```

Fora de escopo neste MVP: NFS-e e importações.
