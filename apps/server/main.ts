import { Application, Router, send } from "oak";
import { Handlebars } from "handlebars";
import { resolve } from "@std/path";
import { CatalogStore } from "./catalog.ts";
import { loadConfig } from "./config.ts";

const dirname = import.meta.dirname!;
const { hostname, port, libraryDir } = loadConfig();
const store = new CatalogStore(libraryDir);

function formatDuration(sec: number): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function formatDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const handle = new Handlebars({
  baseDir: resolve(dirname, "views"),
  extname: ".hbs",
  layoutsDir: "layouts/",
  partialsDir: "partials/",
  defaultLayout: "main",
  helpers: {
    formatDuration,
    formatDate,
    eq: (a: unknown, b: unknown) => a === b,
  },
  compilerOptions: undefined,
});

type SortKey = "newest" | "oldest" | "title";

const router = new Router();

router.get("/api/health", (ctx) => {
  ctx.response.body = { ok: true };
});

// Gallery: server-side rendered list with search + sort via query params.
router.get("/", async (ctx) => {
  const params = ctx.request.url.searchParams;
  const query = (params.get("q") ?? "").trim();
  const sort = (params.get("sort") ?? "newest") as SortKey;

  const catalog = await store.getCatalog();
  const q = query.toLowerCase();
  let videos = q
    ? catalog.videos.filter((v) => v.title.toLowerCase().includes(q))
    : [...catalog.videos];

  videos.sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    const da = a.uploadDate ?? "";
    const db = b.uploadDate ?? "";
    return sort === "newest" ? db.localeCompare(da) : da.localeCompare(db);
  });

  ctx.response.type = "text/html";
  ctx.response.body = await handle.renderView("gallery", {
    title: catalog.channel ?? "Video Library",
    channel: catalog.channel ?? "Video Library",
    count: catalog.videos.length,
    videos,
    query,
    sort,
  });
});

// Watch page: server-side rendered player + metadata.
router.get("/watch/:id", async (ctx) => {
  const video = await store.getById(ctx.params.id);
  if (!video) {
    ctx.response.status = 404;
    ctx.response.type = "text/html";
    ctx.response.body = await handle.renderView("notfound", {
      title: "Not found",
    });
    return;
  }
  ctx.response.type = "text/html";
  ctx.response.body = await handle.renderView("watch", {
    title: video.title,
    video,
  });
});

// Stream the video file with HTTP Range support (oak's send handles 206).
router.get("/media/:id/video", async (ctx) => {
  const video = await store.getById(ctx.params.id);
  if (!video) {
    ctx.response.status = 404;
    ctx.response.body = "not found";
    return;
  }
  await send(ctx, video.file, { root: libraryDir });
});

router.get("/media/:id/thumb", async (ctx) => {
  const video = await store.getById(ctx.params.id);
  if (!video || !video.thumb) {
    ctx.response.status = 404;
    ctx.response.body = "not found";
    return;
  }
  await send(ctx, video.thumb, { root: libraryDir });
});

router.get("/styles.css", async (ctx) => {
  await send(ctx, "styles.css", { root: resolve(dirname, "static") });
});

const app = new Application();

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(err);
    ctx.response.status = 500;
    ctx.response.body = "internal error";
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Library: ${libraryDir}`);
try {
  await Deno.stat(resolve(libraryDir, "catalog.json"));
} catch {
  console.warn("No catalog.json found in the library directory yet.");
}

console.log(`Listening on http://${hostname}:${port}`);
await app.listen({ port, hostname });
