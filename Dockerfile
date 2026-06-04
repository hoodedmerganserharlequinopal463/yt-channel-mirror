FROM denoland/deno:alpine
WORKDIR /app

# Copy manifests and lockfile first — deps are cached in this layer.
COPY deno.json deno.lock ./
COPY apps/server/deno.json ./apps/server/
RUN deno install --frozen

# Copy server source.
COPY apps/server/ ./apps/server/

ENV LIBRARY_DIR=/library \
    PORT=8080 \
    HOST=0.0.0.0

EXPOSE 8080
WORKDIR /app/apps/server
CMD ["deno", "task", "start"]
