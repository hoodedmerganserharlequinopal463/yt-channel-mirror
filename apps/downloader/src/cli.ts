#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildCatalog,
  checkBinary,
  downloadChannel,
} from "./lib.ts";

interface Args {
  channel?: string;
  out: string;
  limit?: number;
  label?: string;
  catalogOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { out: "./library", catalogOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--channel":
      case "-c":
        args.channel = argv[++i];
        break;
      case "--out":
      case "-o":
        args.out = argv[++i];
        break;
      case "--limit":
      case "-n":
        args.limit = Number(argv[++i]);
        break;
      case "--label":
        args.label = argv[++i];
        break;
      case "--catalog-only":
        args.catalogOnly = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (a.startsWith("-")) {
          console.error(`Unknown option: ${a}`);
          process.exit(1);
        }
        // bare argument is treated as the channel URL
        args.channel = a;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
oym-download - download a YouTube channel into a self-hostable library

Usage:
  oym-download --channel <url> [--out ./library] [--limit N] [--label "My Channel"]
  oym-download --catalog-only --out ./library

Options:
  -c, --channel <url>   Channel / playlist / video URL to download
  -o, --out <dir>       Library output directory (default: ./library)
  -n, --limit <N>       Only fetch the N most recent videos
      --label <text>    Friendly channel name shown in the web UI
      --catalog-only    Skip downloading; just rebuild catalog.json from existing files
  -h, --help            Show this help

Requirements: yt-dlp and ffmpeg must be installed and on your PATH.
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const libraryDir = resolve(args.out);
  await mkdir(libraryDir, { recursive: true });

  if (!args.catalogOnly) {
    if (!args.channel) {
      console.error("Error: --channel <url> is required (or use --catalog-only).");
      printHelp();
      process.exit(1);
    }

    const [hasYtDlp, hasFfmpeg] = await Promise.all([
      checkBinary("yt-dlp"),
      checkBinary("ffmpeg"),
    ]);
    if (!hasYtDlp) {
      console.error("Error: yt-dlp not found on PATH. Install it: https://github.com/yt-dlp/yt-dlp#installation");
      process.exit(1);
    }
    if (!hasFfmpeg) {
      console.error("Error: ffmpeg not found on PATH. Install it: https://ffmpeg.org/download.html");
      process.exit(1);
    }

    console.log(`Downloading "${args.channel}" into ${libraryDir} ...`);
    await downloadChannel({
      channelUrl: args.channel,
      libraryDir,
      limit: args.limit,
    });
  }

  console.log("Building catalog.json ...");
  const catalog = await buildCatalog(libraryDir, args.label ?? args.channel ?? null);
  console.log(`Done. ${catalog.videos.length} video(s) in the library.`);
  console.log(`Copy the folder "${libraryDir}" to your server, then run docker compose up -d.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
