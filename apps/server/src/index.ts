import { existsSync } from "node:fs";
import { join } from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { loadConfig } from "./config.ts";
import { CatalogStore } from "./catalog.ts";
import { serveFile } from "./media.ts";

const config = loadConfig();
const store = new CatalogStore(config.libraryDir);

const app = Fastify({ logger: true });

app.get("/api/health", async () => ({ ok: true }));

app.get("/api/channel", async () => {
  const c = await store.getCatalog();
  return { channel: c.channel, count: c.videos.length, generatedAt: c.generatedAt };
});

app.get("/api/videos", async () => {
  return store.getSummaries();
});

app.get<{ Params: { id: string } }>("/api/videos/:id", async (req, reply) => {
  const video = await store.getById(req.params.id);
  if (!video) return reply.code(404).send({ error: "not found" });
  return video;
});

app.get<{ Params: { id: string } }>("/media/:id/video", async (req, reply) => {
  const video = await store.getById(req.params.id);
  if (!video) return reply.code(404).send({ error: "not found" });
  return serveFile(req, reply, config.libraryDir, video.file);
});

app.get<{ Params: { id: string } }>("/media/:id/thumb", async (req, reply) => {
  const video = await store.getById(req.params.id);
  if (!video || !video.thumb) return reply.code(404).send({ error: "not found" });
  return serveFile(req, reply, config.libraryDir, video.thumb);
});

// Serve the built web client (SPA) if present.
if (existsSync(config.webDir)) {
  await app.register(fastifyStatic, {
    root: config.webDir,
    wildcard: false,
  });

  // SPA fallback: any non-API/non-media GET returns index.html.
  app.setNotFoundHandler((req, reply) => {
    if (
      req.method === "GET" &&
      !req.url.startsWith("/api/") &&
      !req.url.startsWith("/media/")
    ) {
      return reply.sendFile("index.html");
    }
    reply.code(404).send({ error: "not found" });
  });
} else {
  app.log.warn(`Web client not found at ${config.webDir}; serving API only.`);
}

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Library: ${config.libraryDir}`);
  if (!existsSync(join(config.libraryDir, "catalog.json"))) {
    app.log.warn("No catalog.json found in the library directory yet.");
  }
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
