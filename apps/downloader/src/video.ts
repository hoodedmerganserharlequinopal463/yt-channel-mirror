import * as path from "@std/path";
import { isString } from "@fullstacksjs/toolbox";
import { parseYtDate } from "./utils.ts";

export const CATALOG_VERSION = 1 as const;

/** A single video entry as stored in catalog.json. */
export interface VideoMeta {
  /** YouTube video id, also the folder name inside the library. */
  id: string;
  title: string;
  description: string;
  /** Duration in whole seconds. */
  durationSec: number;
  /** Upload date as YYYY-MM-DD when known. */
  uploadDate: string | null;
  /** Relative path to the video file, e.g. "<id>/video.mp4". */
  file: string;
  /** Relative path to the thumbnail, e.g. "<id>/thumb.jpg", or null. */
  thumb: string | null;
  /** Size of the video file in bytes. */
  sizeBytes: number;
}

export interface Catalog {
  version: typeof CATALOG_VERSION;
  /** ISO timestamp of when the catalog was last generated. */
  generatedAt: string;
  /** Channel/source label for display. */
  channel: string | null;
  videos: VideoMeta[];
}

/** Slim shape returned by the list endpoint (omits description for payload size). */
export type VideoSummary = Omit<VideoMeta, "description">;

/** Build a VideoMeta from raw yt-dlp info and resolved file paths. */
export function createVideoMeta({
  dir,
  info,
  root,
  videoPath,
  thumbPath,
  sizeBytes,
}: {
  info: Record<string, unknown>;
  dir: string;
  root: string;
  videoPath: string;
  sizeBytes: number;
  thumbPath: string | undefined;
}): VideoMeta {
  const { id, description = "", upload_date } = info;
  if (!isString(id)) {
    throw new Error(`Invalid video id in info.json for ${dir}`);
  }
  if (!isString(description)) {
    throw new Error(`Invalid description in info.json for ${dir}`);
  }

  const rawDate = isString(upload_date) ? upload_date : null;
  const uploadDate = parseYtDate(rawDate);

  const thumb = thumbPath
    ? path.relative(root, path.join(dir, thumbPath))
    : null;
  const file = path.relative(root, videoPath);

  return {
    id,
    title: isString(info.title) ? info.title : id,
    description,
    durationSec: typeof info.duration === "number"
      ? Math.round(info.duration)
      : 0,
    uploadDate,
    file,
    thumb,
    sizeBytes,
  };
}
