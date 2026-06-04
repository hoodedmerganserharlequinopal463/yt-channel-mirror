import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  server: {
    // During `npm run dev:web`, proxy API/media to the running server.
    proxy: {
      "/api": "http://localhost:8080",
      "/media": "http://localhost:8080",
    },
  },
});
