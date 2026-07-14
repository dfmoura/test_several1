FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/ packages/
COPY services/nfse-web/ services/nfse-web/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM deps AS build
RUN pnpm --filter @nfse/web build

FROM deps AS deploy
RUN pnpm deploy --filter @nfse/web --prod /prod/web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/nfse-web/dist ./dist
COPY --from=build /app/services/nfse-web/server/dist ./server/dist
COPY --from=deploy /prod/web/node_modules ./node_modules
COPY --from=deploy /prod/web/package.json ./package.json
EXPOSE 3002
CMD ["node", "server/dist/index.js"]
