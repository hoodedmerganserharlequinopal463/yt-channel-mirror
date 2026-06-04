# Offline YouTube Channel Mirror

Download your YouTube channel on an internet-connected machine, copy the
`library/` folder to an offline box, and let your community browse and stream
videos from any browser.


## Prerequisites

- **Download machine**: [Deno 2+](https://deno.com), [`yt-dlp`](https://github.com/yt-dlp/yt-dlp#installation), and [`ffmpeg`](https://ffmpeg.org/download.html) on your PATH.
- **Offline server**: Docker + Docker Compose.

## Step 1 — Download your channel

```bash
./apps/downloader/src/cli.ts --channel "https://www.youtube.com/@YourChannel" --limit 20
```

Re-running only fetches new uploads (tracked via `library/archive.txt`).

Flags: `--out <dir>` (default `./library`), `--catalog-only` (rebuild index without downloading).

## Step 2 — Copy the library to the server

```bash
scp -r ./library user@server:/opt/oym/library
```

## Step 3 — Run the server

```bash
docker compose up -d --build
```

Browse and watch. The server reloads `catalog.json` automatically when the file changes.

