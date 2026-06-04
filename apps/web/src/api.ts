import type { VideoMeta, VideoSummary } from "@oym/shared";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export interface ChannelInfo {
  channel: string | null;
  count: number;
  generatedAt: string;
}

export const api = {
  channel: () => getJSON<ChannelInfo>("/api/channel"),
  videos: () => getJSON<VideoSummary[]>("/api/videos"),
  video: (id: string) => getJSON<VideoMeta>(`/api/videos/${encodeURIComponent(id)}`),
  videoSrc: (id: string) => `/media/${encodeURIComponent(id)}/video`,
  thumbSrc: (id: string) => `/media/${encodeURIComponent(id)}/thumb`,
};

export function formatDuration(sec: number): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
