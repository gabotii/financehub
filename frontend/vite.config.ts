import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The dev server proxies /api to Django, so the browser talks to one origin
// (no CORS, no hard-coded backend URL). Inside docker compose the target is the
// "backend" service; running on the host it is localhost.
const target = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Keep the browser's Host header (localhost) so Django's ALLOWED_HOSTS accepts it.
    proxy: { "/api": { target, changeOrigin: false } },
    // Bind mounts from Windows don't deliver file events into Linux containers.
    watch: process.env.CHOKIDAR_USEPOLLING ? { usePolling: true, interval: 300 } : undefined,
  },
});
