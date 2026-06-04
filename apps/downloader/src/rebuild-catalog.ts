#!/usr/bin/env node
import { resolve } from "node:path";
import { buildCatalog, ensureLibrary } from "./lib.ts";

const out = process.argv[2] ?? "./library";
const libraryDir = resolve(out);

ensureLibrary(libraryDir);
const catalog = await buildCatalog(libraryDir, null);
console.log(`Rebuilt catalog.json with ${catalog.videos.length} video(s).`);
