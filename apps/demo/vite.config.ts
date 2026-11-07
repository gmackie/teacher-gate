// Vite config for the demo. The dev server proxies the Teacher Gate API to the service on port 8787,
// so the browser talks to one origin and the service needs no CORS settings.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const target = process.env.TEACHER_GATE_URL ?? "http://localhost:8787";

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    port: 5173,
    proxy: { "/v1": target, "/healthz": target },
  },
  preview: {
    proxy: { "/v1": target, "/healthz": target },
  },
});
