import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// En dev, on route vers les services directement (pas encore d'api-gateway).
// /api/questions/*    -> question-service   (port 3002)
// /api/assessments/*  -> assessment-service (port 3003)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api/questions": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
      "/api/assessments": {
        target: "http://localhost:3003",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
