import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Catalog, VideoMeta, VideoSummary } from "@oym/shared";

/**
 * Loads catalog.json from the library and caches it, reloading automatically
 * when the file's mtime changes (so adding videos + recopying the library is
 * picked up without restarting the server).
 */
export class CatalogStore {
  private catalog: Catalog | null = null;
  private mtimeMs = 0;
  private byId = new Map<string, VideoMeta>();
  private readonly libraryDir: string;

  constructor(libraryDir: string) {
    this.libraryDir = libraryDir;
  }

  private get catalogPath(): string {
    return join(this.libraryDir, "catalog.json");
  }

  private async refreshIfStale(): Promise<void> {
    let mtimeMs: number;
    try {
      mtimeMs = (await stat(this.catalogPath)).mtimeMs;
    } catch {
      this.catalog = { version: 1, generatedAt: "", channel: null, videos: [] };
      this.byId.clear();
      return;
    }
    if (this.catalog && mtimeMs === this.mtimeMs) return;

    const raw = await readFile(this.catalogPath, "utf8");
    const parsed = JSON.parse(raw) as Catalog;
    this.catalog = parsed;
    this.mtimeMs = mtimeMs;
    this.byId = new Map(parsed.videos.map((v) => [v.id, v]));
  }

  async getCatalog(): Promise<Catalog> {
    await this.refreshIfStale();
    return this.catalog!;
  }

  async getSummaries(): Promise<VideoSummary[]> {
    const { videos } = await this.getCatalog();
    return videos.map(({ description: _description, ...rest }) => rest);
  }

  async getById(id: string): Promise<VideoMeta | undefined> {
    await this.refreshIfStale();
    return this.byId.get(id);
  }
}
