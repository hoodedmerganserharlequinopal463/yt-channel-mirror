import { join } from "@std/path";
import { Catalog, VideoMeta } from "./video.ts";

/**
 * Loads catalog.json from the library and caches it, reloading automatically
 * when the file's mtime changes (so adding videos + recopying the library is
 * picked up without restarting the server).
 */
export class CatalogStore {
  #catalog: Catalog | null = null;
  #mtimeMs = 0;
  #byId = new Map<string, VideoMeta>();
  readonly #libraryDir: string;

  constructor(libraryDir: string) {
    this.#libraryDir = libraryDir;
  }

  get #catalogPath(): string {
    return join(this.#libraryDir, "catalog.json");
  }

  async #refreshIfStale(): Promise<void> {
    let mtimeMs: number;
    try {
      mtimeMs = (await Deno.stat(this.#catalogPath)).mtime?.getTime() ?? 0;
    } catch {
      this.#catalog = {
        version: 1,
        generatedAt: "",
        channel: null,
        videos: [],
      };
      this.#byId.clear();
      return;
    }
    if (this.#catalog && mtimeMs === this.#mtimeMs) return;

    const raw = await Deno.readTextFile(this.#catalogPath);
    const parsed = JSON.parse(raw) as Catalog;
    this.#catalog = parsed;
    this.#mtimeMs = mtimeMs;
    this.#byId = new Map(parsed.videos.map((v) => [v.id, v]));
  }

  async getCatalog(): Promise<Catalog> {
    await this.#refreshIfStale();
    return this.#catalog!;
  }

  async getById(id: string): Promise<VideoMeta | undefined> {
    await this.#refreshIfStale();
    return this.#byId.get(id);
  }
}
