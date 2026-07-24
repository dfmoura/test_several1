# @reta/api

Fastify ERP API for Reta Etiquetas.

## Scripts

```bash
pnpm --filter @reta/domain build
pnpm --filter @reta/api dev      # API
pnpm --filter @reta/api worker:dev
pnpm --filter @reta/api build
```

## Env

See repo root `.env.example`. Key vars: `DATABASE_URL`, `REDIS_URL`, `APP_SECRET`, `BILLING_PROVIDER`, `NFE_PROVIDER`.

## Docker

```bash
docker build -f apps/api/Dockerfile .
# worker: CMD node dist/worker.js
```

## Seed admin

Use bcrypt hash for `admin123` in seed SQL (see project docs).
