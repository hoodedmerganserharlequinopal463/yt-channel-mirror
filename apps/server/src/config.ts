import { resolve } from "node:path";

export interface ServerConfig {
  libraryDir: string;
  webDir: string;
  port: number;
  host: string;
}

export function loadConfig(): ServerConfig {
  return {
    libraryDir: resolve(process.env.LIBRARY_DIR ?? "./library"),
    // Where the built web client lives (copied next to the server in Docker).
    webDir: resolve(process.env.WEB_DIR ?? "../web/dist"),
    port: Number(process.env.PORT ?? 8080),
    // 0.0.0.0 so it is reachable from other machines on the WAN.
    host: process.env.HOST ?? "0.0.0.0",
  };
}
