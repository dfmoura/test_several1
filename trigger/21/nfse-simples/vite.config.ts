import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/** Usado apenas no build dentro do Docker. */
export default defineConfig({
  plugins: [react()],
  root: 'src/web',
  resolve: {
    alias: { '@': resolve(__dirname, 'src/web') },
  },
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
  },
});
