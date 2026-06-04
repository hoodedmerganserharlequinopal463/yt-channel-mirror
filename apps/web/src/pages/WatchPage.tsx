import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { VideoMeta } from "@oym/shared";
import { api, formatDate } from "../api.ts";

export function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<VideoMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setVideo(null);
    setError(null);
    api.video(id).then(setVideo).catch((e) => setError(String(e)));
  }, [id]);

  return (
    <div className="page watch">
      <Link to="/" className="back">← Back to library</Link>

      {error && <div className="banner error">Failed to load: {error}</div>}
      {!video && !error && <div className="banner">Loading…</div>}

      {video && (
        <article className="player-wrap">
          <video
            className="player"
            src={api.videoSrc(video.id)}
            poster={video.thumb ? api.thumbSrc(video.id) : undefined}
            controls
            autoPlay
            playsInline
          />
          <h1 className="title">{video.title}</h1>
          <p className="meta">{formatDate(video.uploadDate)}</p>
          {video.description && (
            <pre className="description">{video.description}</pre>
          )}
        </article>
      )}
    </div>
  );
}
