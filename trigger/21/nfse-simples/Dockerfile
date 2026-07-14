FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /build/packages

COPY 20/nfse-nacional/packages/nfse-shared ./nfse-shared
COPY 20/nfse-nacional/packages/nfse-domain ./nfse-domain
COPY 20/nfse-nacional/packages/nfse-xml ./nfse-xml
COPY 20/nfse-nacional/packages/nfse-gov-client ./nfse-gov-client

RUN cd nfse-shared && npm install --omit=dev

RUN cd nfse-domain && \
  npm pkg set dependencies.@nfse/shared="file:../nfse-shared" && \
  npm install --omit=dev

RUN cd nfse-xml && \
  npm pkg set dependencies.@nfse/shared="file:../nfse-shared" \
               dependencies.@nfse/domain="file:../nfse-domain" && \
  npm install --omit=dev

RUN cd nfse-gov-client && \
  npm pkg set dependencies.@nfse/shared="file:../nfse-shared" \
               dependencies.@nfse/domain="file:../nfse-domain" \
               dependencies.@nfse/xml="file:../nfse-xml" && \
  npm install --omit=dev

WORKDIR /build/app
COPY 21/nfse-simples ./

RUN npm pkg set \
  dependencies.@nfse/shared="file:../packages/nfse-shared" \
  dependencies.@nfse/domain="file:../packages/nfse-domain" \
  dependencies.@nfse/xml="file:../packages/nfse-xml" \
  dependencies.@nfse/gov-client="file:../packages/nfse-gov-client"

RUN npm install --include=dev && npm run build

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /build/app/dist ./dist
COPY --from=builder /build/app/package.json ./
COPY --from=builder /build/packages ./packages

RUN npm pkg set \
  dependencies.@nfse/shared="file:./packages/nfse-shared" \
  dependencies.@nfse/domain="file:./packages/nfse-domain" \
  dependencies.@nfse/xml="file:./packages/nfse-xml" \
  dependencies.@nfse/gov-client="file:./packages/nfse-gov-client" && \
  npm install --omit=dev

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV NFSE_DATA_DIR=/app/data
ENV NFSE_PORT=18210

EXPOSE 18210

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:18210/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server/main.js"]
