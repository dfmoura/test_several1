# Docker — local primeiro, produção depois

Alinhado a [`ARQUITETURA-SISTEMA-GESTAO-RETA.md`](./ARQUITETURA-SISTEMA-GESTAO-RETA.md).

## Objetivo

Rodar o ERP completo na máquina (ou VM interna) com **os mesmos artefatos** que irão a produção: imagens, migrations, healthchecks e variáveis — trocando apenas secrets e hosts.

## Compose de referência (local)

Arquivo sugerido: `deploy/docker-compose.yml`

```yaml
services:
  proxy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on: [web, api]

  web:
    build: ../apps/web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost/api

  api:
    build: ../apps/api
    env_file: ../.env
    environment:
      DATABASE_URL: postgres://reta:reta@db:5432/reta
      REDIS_URL: redis://redis:6379/0
      S3_ENDPOINT: http://minio:9000
      BILLING_PROVIDER: fake   # local
      NFE_PROVIDER: fake       # local
    depends_on: [db, redis, minio]

  worker:
    build: ../apps/api
    command: ["node", "dist/worker.js"]
    env_file: ../.env
    environment:
      DATABASE_URL: postgres://reta:reta@db:5432/reta
      REDIS_URL: redis://redis:6379/0
    depends_on: [db, redis, api]

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: reta
      POSTGRES_PASSWORD: reta
      POSTGRES_DB: reta
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ../docs/schema-mvp.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    ports: ["5432:5432"]  # só local

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    volumes: [minio_data:/data]
    ports: ["9000:9000", "9001:9001"]

  mailpit:
    image: axllent/mailpit
    ports: ["8025:8025", "1025:1025"]

volumes:
  pgdata:
  minio_data:
  caddy_data:
```

## `.env.example` (nunca commitar `.env`)

```bash
APP_ENV=local
APP_SECRET=change-me

DATABASE_URL=postgres://reta:reta@db:5432/reta
REDIS_URL=redis://redis:6379/0

S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio12345
S3_BUCKET=reta

# Integrações — local
BILLING_PROVIDER=fake
NFE_PROVIDER=fake
CNPJ_PROVIDER=brasilapi
CEP_PROVIDER=viacep

# Produção (preencher só no secret store)
# INTER_CLIENT_ID=
# INTER_CLIENT_SECRET=
# INTER_CERT_PATH=/run/secrets/inter-cert.pem
# INTER_KEY_PATH=/run/secrets/inter-key.pem
# FOCUSNFE_TOKEN=
# FOCUSNFE_ENV=homologacao
```

## Overlay de produção

`deploy/docker-compose.prod.yml`:

```yaml
services:
  api:
    environment:
      APP_ENV: production
      BILLING_PROVIDER: inter
      NFE_PROVIDER: focusnfe
      DATABASE_URL: ${DATABASE_URL}
    secrets:
      - inter_cert
      - inter_key
    deploy:
      replicas: 2

  worker:
    environment:
      APP_ENV: production
      BILLING_PROVIDER: inter
      NFE_PROVIDER: focusnfe

  db:
    # Em produção preferir Postgres gerenciado; se self-host:
    ports: []
    volumes:
      - /var/lib/reta/pg:/var/lib/postgresql/data

secrets:
  inter_cert:
    file: ./secrets/inter-cert.pem
  inter_key:
    file: ./secrets/inter-key.pem
```

Subir:

```bash
# local
docker compose -f deploy/docker-compose.yml up -d --build

# produção (mesmo build)
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.prod.yml up -d
```

## Volumes e backup

| Dado | Local | Produção |
|------|-------|----------|
| Postgres | volume Docker | snapshot diário + WAL / managed backup |
| MinIO | volume | S3 versionado |
| Certificados Inter | bind mount dev | Docker secrets / Vault |

Teste mensal: restore do backup em compose limpo.

## Rede e webhooks

- Local: usar **Fake providers** ou túnel (`cloudflared`) só para homologar webhook Inter.
- Produção: `https://gestao.retaetiquetas.com.br/api/webhooks/inter` com validação de assinatura + `webhook_inbox` idempotente.

## Healthchecks

- `GET /health` — processo vivo  
- `GET /ready` — DB + Redis  

Compose deve `depends_on` com condition healthy quando possível.

## Migrations

Não editar `schema-mvp.sql` em produção após o bootstrap.

Fluxo:

1. Bootstrap inicial com `schema-mvp.sql` (dev)  
2. A partir daí: ferramenta de migration (Prisma Migrate / Alembic / Flyway)  
3. CI aplica migrations antes do deploy  

## Critérios “pronto para produção”

- [ ] Mesma imagem tagada (`reta-api:1.x.x`) testada em staging  
- [ ] Secrets fora do git  
- [ ] HTTPS + backup restaurável  
- [ ] Providers reais em homologação Inter + hub NF-e  
- [ ] NFS-e e importação **ainda desligados** no código (feature flags)
