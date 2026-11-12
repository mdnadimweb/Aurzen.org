ARG NODE_IMAGE=node:26.13.0-bookworm-slim@sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
RUN npm run build -w @aurzen/shared && npm run build -w @aurzen/api

FROM ${NODE_IMAGE} AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace=@aurzen/api --workspace=@aurzen/shared --include-workspace-root=false

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production PORT=4000 HOST=0.0.0.0 DATABASE_PATH=/data/aurzen.sqlite COOKIE_SECURE=true SEED_DEMO=false
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app ./
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --chown=node:node scripts/backup.cjs scripts/migrate-postgres.cjs ./scripts/
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 4000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:4000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","apps/api/dist/server.js"]
