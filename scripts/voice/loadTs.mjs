// Loads the TypeScript modules of src/ and scripts/voice/ from plain Node, using Vite's own SSR loader
// (no extra dependency: Vite is already the project's toolchain). `configFile: false` keeps the PWA plugin out.
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))

export async function loadVoiceModules() {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  const load = (path) => server.ssrLoadModule(path)
  return {
    collect: await load('/scripts/voice/collect.ts'),
    budget: await load('/scripts/voice/budget.ts'),
    ssml: await load('/scripts/voice/ssml.ts'),
    close: () => server.close(),
  }
}
