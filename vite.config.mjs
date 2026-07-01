import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Le renderer (React) est bundlé par Vite dans build/renderer.
// viteSingleFile inline tout le JS/CSS dans index.html : indispensable pour un
// chargement fiable en file:// depuis l'asar Electron (pas de fetch de modules externes).
// Le main process et le preload restent en CommonJS, chargés directement par Electron.
export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../../build/renderer',
    emptyOutDir: true,
    target: 'esnext',
  },
});
