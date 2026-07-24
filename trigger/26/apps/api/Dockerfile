# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
 && apk add --no-cache wget
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json ./
COPY packages/domain/package.json packages/domain/
COPY apps/api/package.json apps/api/
RUN pnpm install --no-frozen-lockfile
COPY packages/domain packages/domain
COPY apps/api apps/api
RUN pnpm --filter @reta/domain build && pnpm --filter @reta/api build

FROM node:22-alpine AS production
RUN apk add --no-cache wget
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/server.js"]
