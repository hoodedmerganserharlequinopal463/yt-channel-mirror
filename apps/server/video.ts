/**
 * Shared contract between the downloader (which produces a library) and the
 * server (which serves it). The library is a folder on disk:
 *
 *   library/
 *     catalog.json            <- Catalog (the index of everything)
 *     <videoId>/
 *       video.mp4
 *       thumb.jpg
 *       info.json             <- raw yt-dlp metadata (not served directly)
 */

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

/** The whole library index, written to catalog.json. */
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
