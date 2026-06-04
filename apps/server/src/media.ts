import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function contentType(file: string): string {
  return MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
}

/** Resolve a catalog-relative path safely inside the library directory. */
function safeResolve(libraryDir: string, relPath: string): string | null {
  const full = normalize(join(libraryDir, relPath));
  if (!full.startsWith(normalize(libraryDir))) return null; // traversal guard
  return full;
}

/**
 * Serve a file with HTTP Range support so the browser can seek/scrub video.
 * Returns 206 Partial Content for range requests, 200 otherwise.
 */
export async function serveFile(
  req: FastifyRequest,
  reply: FastifyReply,
  libraryDir: string,
  relPath: string,
): Promise<void> {
  const full = safeResolve(libraryDir, relPath);
  if (!full) {
    reply.code(400).send({ error: "bad path" });
    return;
  }

  let size: number;
  try {
    size = (await stat(full)).size;
  } catch {
    reply.code(404).send({ error: "not found" });
    return;
  }

  const type = contentType(full);
  const range = req.headers.range;

  reply.header("Accept-Ranges", "bytes");
  reply.header("Cache-Control", "public, max-age=86400");

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const startStr = match[1];
      const endStr = match[2];
      let start = startStr ? parseInt(startStr, 10) : 0;
      let end = endStr ? parseInt(endStr, 10) : size - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
        reply.code(416).header("Content-Range", `bytes */${size}`).send();
        return;
      }

      reply
        .code(206)
        .header("Content-Range", `bytes ${start}-${end}/${size}`)
        .header("Content-Length", end - start + 1)
        .type(type);
      reply.send(createReadStream(full, { start, end }));
      return;
    }
  }

  reply.code(200).header("Content-Length", size).type(type);
  reply.send(createReadStream(full));
}
