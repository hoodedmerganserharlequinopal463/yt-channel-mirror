import { resolve } from "@std/path";
const dirname = import.meta.dirname!;

export type Config = {
  hostname: string;
  port: number;
  libraryDir: string;
};

export function loadConfig(): Config {
  const defaultLibraryDir = resolve(dirname, "../../library");
  const defaultPort = 8080;
  const defaultHost = "0.0.0.0";

  const port = Number(Deno.env.get("PORT") ?? defaultPort);
  const libraryDir = Deno.env.get("LIBRARY_DIR") ?? defaultLibraryDir;
  const hostname = Deno.env.get("HOST") ?? defaultHost;

  return { hostname, port, libraryDir };
}
