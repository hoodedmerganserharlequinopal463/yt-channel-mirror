import { join } from "@std/path";
import { isString } from "@fullstacksjs/toolbox";

/** Collect the names of all direct children of `dir` into a flat array. */
export async function readDirFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const f of Deno.readDir(dir)) {
    files.push(f.name);
  }
  return files;
}

/** Read and JSON-parse the first `*.info.json` found in `files`, or return `{}`. */
export async function readInfoJson(
  dir: string,
  files: string[],
): Promise<Record<string, unknown>> {
  const infoFile = files.find((f) => f.endsWith(".info.json"));
  if (!infoFile) return {};
  try {
    return JSON.parse(await Deno.readTextFile(join(dir, infoFile)));
  } catch {
    return {};
  }
}

/** Convert a yt-dlp `YYYYMMDD` date string to `YYYY-MM-DD`, or `null` if invalid. */
export function parseYtDate(raw: unknown): string | null {
  if (!isString(raw) || !/^\d{8}$/.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function findFileByExt(
  files: string[],
  exts: string[],
): string | undefined {
  return files.find((f) => exts.some((e) => f.toLowerCase().endsWith(e)));
}
