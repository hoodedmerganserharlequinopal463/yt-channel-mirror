import * as path from "@std/path";
import { findFileByExt, readDirFiles, readInfoJson } from "./utils.ts";
import {
  type Catalog,
  CATALOG_VERSION,
  createVideoMeta,
  type VideoMeta,
} from "./video.ts";

export const VIDEO_EXTS = [".mp4", ".m4v", ".webm", ".mkv"];
export const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

/** Spawn a command, streaming its stdio to the parent. Resolves on exit code 0. */
export async function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string } = {},
): Promise<void> {
  const command = new Deno.Command(cmd, {
    args,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    cwd: opts.cwd,
  });
  const child = command.spawn();
  const { code } = await child.status;
  if (code !== 0) throw new Error(`${cmd} exited with code ${code}`);
}

export async function checkBinary(cmd: string): Promise<boolean> {
  try {
    const command = new Deno.Command("test", {
      args: [cmd],
      stdout: "null",
      stderr: "null",
    });
    const { code } = await command.output();
    return code === 0;
  } catch {
    return false;
  }
}

export interface DownloadOptions {
  channelUrl: string;
  libraryDir: string;
  /** Limit to the N most recent videos (yt-dlp --playlist-end). */
  limit?: number;
}

/**
 * Download a channel's videos into the library as browser-native MP4 (H.264/AAC),
 * skipping anything already recorded in the download archive.
 */
export async function downloadChannel(opts: DownloadOptions): Promise<void> {
  const archive = path.join(opts.libraryDir, "archive.txt");

  const args = [
    // Browser-native first; fall back to any mp4, then anything, remuxing to mp4.
    "-f",
    "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
    "--merge-output-format",
    "mp4",
    "--remux-video",
    "mp4",
    // One folder per video id, predictable file stems.
    "-P",
    opts.libraryDir,
    "-o",
    "%(id)s/video.%(ext)s",
    // Metadata + thumbnail alongside the video.
    "--write-info-json",
    "--write-thumbnail",
    "--convert-thumbnails",
    "jpg",
    // Idempotent re-runs.
    "--download-archive",
    archive,
    "--ignore-errors",
    "--no-overwrites",
  ];

  if (opts.limit && opts.limit > 0) {
    args.push("--playlist-end", String(opts.limit));
  }

  args.push(opts.channelUrl);

  await run("yt-dlp", args);
}

/** Scan the library folder and (re)build catalog.json from each video's info.json. */
export async function buildCatalog(
  libraryDir: string,
  channelLabel: string | null,
): Promise<Catalog> {
  const videos: VideoMeta[] = [];
  const allDirs = (await Array.fromAsync(Deno.readDir(libraryDir))).filter(
    (e) => e.isDirectory,
  );

  for (const entry of allDirs) {
    const dir = path.join(libraryDir, entry.name);
    const files = await readDirFiles(dir);

    const videoFile = findFileByExt(files, VIDEO_EXTS);
    if (!videoFile) continue; // incomplete download, skip

    const thumbPath = findFileByExt(files, IMAGE_EXTS);
    const info = await readInfoJson(dir, files);

    const videoPath = path.join(dir, videoFile);
    const sizeBytes = (await Deno.stat(videoPath)).size;

    const video = createVideoMeta({
      info,
      dir,
      root: libraryDir,
      videoPath,
      thumbPath,
      sizeBytes,
    });

    videos.push(video);
  }

  // Newest first when dates are known.
  videos.sort((a, b) => (b.uploadDate ?? "").localeCompare(a.uploadDate ?? ""));

  const catalog: Catalog = {
    version: CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    channel: channelLabel,
    videos,
  };

  await Deno.writeTextFile(
    path.join(libraryDir, "catalog.json"),
    JSON.stringify(catalog, null, 2),
  );

  return catalog;
}

export function ensureLibrary(libraryDir: string): void {
  try {
    Deno.statSync(libraryDir);
  } catch {
    throw new Error(`Library directory does not exist: ${libraryDir}`);
  }
}
