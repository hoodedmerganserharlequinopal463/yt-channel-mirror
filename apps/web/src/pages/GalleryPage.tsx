import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { VideoSummary } from "@oym/shared";
import { api, formatDate, formatDuration, type ChannelInfo } from "../api.ts";

type SortKey = "newest" | "oldest" | "title";

export function GalleryPage() {
  const [videos, setVideos] = useState<VideoSummary[] | null>(null);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    Promise.all([api.videos(), api.channel()])
      .then(([v, c]) => {
        setVideos(v);
        setChannel(c);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const filtered = useMemo(() => {
    if (!videos) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? videos.filter((v) => v.title.toLowerCase().includes(q))
      : videos.slice();
    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const da = a.uploadDate ?? "";
      const db = b.uploadDate ?? "";
      return sort === "newest" ? db.localeCompare(da) : da.localeCompare(db);
    });
    return list;
  }, [videos, query, sort]);

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">▶</span>
          <div>
            <h1>{channel?.channel ?? "Video Library"}</h1>
            {channel && (
              <p className="sub">{channel.count} videos available offline</p>
            )}
          </div>
        </div>
        <div className="controls">
          <input
            className="search"
            type="search"
            placeholder="Search videos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </header>

      {error && <div className="banner error">Failed to load: {error}</div>}
      {!videos && !error && <div className="banner">Loading…</div>}
      {videos && filtered.length === 0 && (
        <div className="banner">No videos match your search.</div>
      )}

      <div className="grid">
        {filtered.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: VideoSummary }) {
  return (
    <Link to={`/watch/${encodeURIComponent(video.id)}`} className="card">
      <div className="thumb-wrap">
        {video.thumb ? (
          <img loading="lazy" src={api.thumbSrc(video.id)} alt="" />
        ) : (
          <div className="thumb-placeholder">▶</div>
        )}
        {video.durationSec > 0 && (
          <span className="duration">{formatDuration(video.durationSec)}</span>
        )}
      </div>
      <div className="card-body">
        <h3 title={video.title}>{video.title}</h3>
        <p className="meta">{formatDate(video.uploadDate)}</p>
      </div>
    </Link>
  );
}
