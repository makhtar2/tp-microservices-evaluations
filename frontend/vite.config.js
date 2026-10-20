import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Toutes les requêtes /api/* passent par l'api-gateway (authentification
// JWT, routage vers les microservices). API_URL vaut l'adresse de la
// gateway : http://localhost:3000 en local, http://api-gateway:3000 dans
// docker compose. Le même proxy sert en dev (vite) et en preview (Docker).
const proxy = {
  "/api": {
    target: process.env.API_URL || "http://localhost:3000",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy },
  preview: { port: 5173, proxy },
});
