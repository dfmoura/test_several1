# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json ./
COPY packages/pricing-engine/package.json packages/pricing-engine/
COPY apps/web/package.json apps/web/
RUN npm install --ignore-scripts

FROM base AS app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3847
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=postgresql://orcamento:orcamento@localhost:5432/orcamento

WORKDIR /app/apps/web
RUN npx prisma generate
RUN npm run build

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3847
WORKDIR /app/apps/web
ENTRYPOINT ["/entrypoint.sh"]
