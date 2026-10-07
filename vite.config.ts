/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * `base: './'` keeps every URL relative, so the same build works from the root of a domain
 * and from any sub-path (e.g. /mates/). HashRouter never touches the path, and the manifest,
 * service worker and precache entries are all resolved relative to where they are served.
 */
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icons/apple-touch-icon-180.png', 'icons/favicon-32.png'],
      manifest: {
        id: './',
        name: 'Mates Màgiques',
        short_name: 'Mates Màgiques',
        description: 'Aprèn a sumar, restar, multiplicar i dividir jugant',
        lang: 'ca',
        dir: 'ltr',
        start_url: './',
        scope: './',
        theme_color: '#7c3aed',
        background_color: '#fdf4ff',
        display: 'standalone',
        orientation: 'any',
        categories: ['education', 'kids'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        // Every route is a hash route, so index.html is the only navigation target.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Safe with registerType 'prompt': a new worker still waits for the user's "Actualitzar";
        // claiming only lets the very first install control the page without a reload.
        clientsClaim: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/ambits/**'],
      exclude: ['**/*.test.*', 'src/**/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
