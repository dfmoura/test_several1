FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY services/nfse-sync/ services/nfse-sync/
RUN pnpm install 2>/dev/null || true

FROM deps AS build
RUN pnpm --filter @nfse/sync... build 2>/dev/null || pnpm -r build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
CMD ["node", "services/nfse-sync/dist/main.js"]
