# ---- Build stage: install everything, build shared + web, typecheck server ----
FROM node:24-alpine AS build
WORKDIR /app

# Copy manifests first for better layer caching.
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/downloader/package.json apps/downloader/

RUN npm install

# Copy sources, build shared (emits JS) + web (static bundle), typecheck server.
COPY . .
RUN npm run build --workspace @oym/shared \
 && npm run build --workspace @oym/web \
 && npm run build --workspace @oym/server

# ---- Runtime stage: run the server directly from TypeScript source ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    LIBRARY_DIR=/library \
    WEB_DIR=/app/apps/web/dist \
    PORT=8080 \
    HOST=0.0.0.0

# node_modules (incl. the @oym/shared workspace symlink) and manifests.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Compiled shared types (imported as a package by the server).
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Server runs straight from source via Node's type stripping.
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/src ./apps/server/src

# Built web client (static files served by the server).
COPY --from=build /app/apps/web/dist ./apps/web/dist

EXPOSE 8080
WORKDIR /app/apps/server
CMD ["node", "--experimental-strip-types", "src/index.ts"]
