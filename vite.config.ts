import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Rutas relativas: la app funciona servida desde cualquier subdirectorio (el router usa hash).
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 'prompt': la nueva versión se activa cuando el usuario acepta (no a mitad de una sesión de juego).
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Taking D&D Notes',
        short_name: 'D&D Notes',
        description: 'Manager de personajes, notas de campaña y encuentros para D&D 5e (2014).',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#121212',
        background_color: '#121212',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Se precachea todo, incluidos los chunks del SRD y del editor: la app completa funciona offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    // Los chunks más grandes son datos JSON del SRD (se cargan bajo demanda y quedan en caché).
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
