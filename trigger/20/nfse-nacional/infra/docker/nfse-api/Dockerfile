FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/ packages/
COPY services/nfse-api/ services/nfse-api/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM deps AS build
RUN pnpm --filter @nfse/api... build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/services/nfse-api ./services/nfse-api
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./
EXPOSE 3000
CMD ["node", "services/nfse-api/dist/main.js"]
