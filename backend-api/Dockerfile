FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# curl for healthcheck in production compose files; keep OpenSSL patched for Trivy.
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache python3 py3-pip curl openssl && \
    pip3 install --no-cache-dir reportlab --break-system-packages 2>/dev/null || \
    apk add --no-cache py3-reportlab && \
    ln -sf /usr/bin/python3 /usr/local/bin/python && \
    addgroup -S dripless && adduser -S dripless -G dripless && \
    mkdir -p /app/data && chown -R dripless:dripless /app && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /var/cache/apk/*
COPY --from=build --chown=dripless:dripless /app/node_modules ./node_modules
COPY --from=build --chown=dripless:dripless /app/dist ./dist
COPY --from=build --chown=dripless:dripless /app/prisma ./prisma
COPY --from=build --chown=dripless:dripless /app/src/invoices/generate_invoice.py ./src/invoices/generate_invoice.py
COPY --chown=dripless:dripless package.json ./

USER dripless

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/health || exit 1

# Default: API process. Override CMD to "node dist/worker.js" for the worker role.
# Migrations should be run as a separate init container or job before API/worker start.
CMD ["node", "dist/index.js"]
