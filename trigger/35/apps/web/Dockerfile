# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS development
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter @erp-rlp/web...
COPY apps/web apps/web
WORKDIR /app/apps/web
EXPOSE 5173
CMD ["pnpm", "dev"]

FROM base AS build
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter @erp-rlp/web...
COPY apps/web apps/web
WORKDIR /app/apps/web
RUN pnpm build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
