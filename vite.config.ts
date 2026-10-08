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
/** Family account API (server/). Same origin in production (nginx); in dev/preview Vite forwards it. */
const API_TARGET = process.env.MATES_API_URL ?? 'http://127.0.0.1:3100'
const apiProxy = { '/api': { target: API_TARGET, changeOrigin: false } }

/**
 * Vendor chunks (Vite 8 / Rolldown: `output.codeSplitting.groups`; `manualChunks` is deprecated there).
 * Each library gets a long-lived, separately hashed file, so an app-only release keeps them cached.
 */
const vendorGroup = (name: string, packages: readonly string[]) => ({
  name,
  test: new RegExp(`node_modules[\\/](${packages.join('|')})[\\/]`),
  priority: 10,
})
const codeSplitting = {
  groups: [
    vendorGroup('vendor-react', ['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom']),
    vendorGroup('vendor-motion', ['motion', 'motion-dom', 'motion-utils', 'framer-motion']),
    vendorGroup('vendor-zod', ['zod']),
    vendorGroup('vendor-dexie', ['dexie']),
  ],
}

export default defineConfig({
  base: './',
  build: { rolldownOptions: { output: { codeSplitting } } },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
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
        // The voice manifest is tiny and precached; the ~2,000 clips (25 MB) are NOT: see runtimeCaching.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}', 'voice/manifest.json'],
        // Every route is a hash route, so index.html is the only navigation target.
        navigateFallback: 'index.html',
        // The API is never served from the service worker: no navigation fallback, no runtime caching.
        navigateFallbackDenylist: [/^\/api\//],
        // Voice clips are named by content hash (immutable): cached as they are heard, so a clip played once works
        // offline afterwards. Plain fetch() from Web Audio, so no Range-request plugin is needed.
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => /\/voice\/[0-9a-f]{12}\.mp3$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mm-voice-clips',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 4000, purgeOnQuotaError: true },
            },
          },
        ],
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
    include: ['src/**/*.test.{ts,tsx}', 'scripts/voice/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/ambits/**', 'src/world/data/**', 'scripts/voice/*.ts'],
      exclude: ['**/*.test.*', '**/*.testutil.ts', 'src/**/index.ts', 'scripts/voice/phrases.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
