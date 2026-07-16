import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/parse-sections': {
        target: process.env.VITE_AI_SERVICE_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    open: '/login',
  },
});
