# Offline YouTube Channel Mirror

Download your YouTube channel on a machine with internet, copy the resulting
`library/` folder to an offline box on your LAN/WAN, and let your community
browse and stream the videos from any web browser. No internet required on the
viewing side.

## How it works

```
[ Laptop w/ internet ]                         [ Offline server (Docker) ]
  yt-dlp + downloader CLI                          Fastify web app
        |                                                 ^
        v                                                 |
   library/ folder  ---- USB drive / scp over WAN ---->  library/
   (videos + thumbnails + catalog.json)            community browses at
                                                    http://<server-ip>:8080
```

Three parts, one repo (npm workspaces):

- `apps/downloader` - CLI you run on the internet-connected machine.
- `apps/server` - Fastify server (runs in Docker on the offline box). Serves the
  API, streams video with HTTP Range support, and hosts the web client.
- `apps/web` - React client your community sees in the browser: a searchable
  gallery and a video player.
- `packages/shared` - shared TypeScript types describing the library format.

## Prerequisites

- On the **download** machine: [Node.js 20+](https://nodejs.org),
  [`yt-dlp`](https://github.com/yt-dlp/yt-dlp#installation), and
  [`ffmpeg`](https://ffmpeg.org/download.html) on your PATH.
- On the **offline server**: Docker + Docker Compose.

Install JS dependencies once at the repo root:

```bash
npm install
```

## Step 1 - Download your channel (machine with internet)

```bash
# Pull every video from your channel into ./library
npm run download -- --channel "https://www.youtube.com/@YourChannel" --label "Your Channel"

# Or just the 20 most recent
npm run download -- --channel "https://www.youtube.com/@YourChannel" --limit 20
```

This produces a self-contained `library/` folder:

```
library/
  catalog.json            # index of all videos (titles, dates, durations…)
  archive.txt             # remembers what was already downloaded
  <videoId>/
    video.mp4             # browser-native H.264/AAC
    thumb.jpg
    video.info.json
```

Re-running the same command later only downloads **new** uploads (tracked via
`archive.txt`) and refreshes `catalog.json`.

Useful flags:

- `--out <dir>` - change the library location (default `./library`).
- `--catalog-only` - rebuild `catalog.json` from existing files without downloading.

## Step 2 - Move the library to the offline server

Copy the whole `library/` folder next to the project's `docker-compose.yml` on
the server. Anything works since it is just files:

```bash
# Example over the WAN
scp -r ./library user@server:/opt/oym/library
# Or copy via a USB drive
```

## Step 3 - Run the server (offline box)

From the project directory on the server (with `library/` present):

```bash
docker compose up -d --build
```

Then anyone on the network opens:

```
http://<server-ip>:8080
```

They can search, sort, pick a video, and watch it (with full seeking/scrubbing).

To update the catalog later, copy a newer `library/` over the old one - the
server reloads `catalog.json` automatically when it changes.

## Local development

```bash
npm install
npm run build --workspace @oym/shared   # build shared types once

# terminal 1: API + media server (serves ./library)
LIBRARY_DIR=./library npm run dev:server

# terminal 2: web client with hot reload (proxies /api + /media to :8080)
npm run dev:web
```

Open the Vite dev URL it prints (defaults to http://localhost:5173).

## Notes

- Videos are downloaded as MP4 (H.264/AAC) so they play natively in browsers
  with **no transcoding** on the low-power server.
- The server binds to `0.0.0.0` so it is reachable from other machines on the WAN.
- `library/` is gitignored; it can be very large.
