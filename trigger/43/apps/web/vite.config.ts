import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Stack local (make up): nginx :8043 — Sanctum já libera :5173
        target: 'http://127.0.0.1:8043',
        changeOrigin: true,
      },
    },
  },
});
