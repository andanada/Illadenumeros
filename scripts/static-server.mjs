// Minimal static file server used by the PWA e2e tests (no deps, no compression, no caching).
// CLI: node scripts/static-server.mjs [--dir dist] [--port 4174] [--prefix /mates/] [--gzip]
// It mimics a plain nginx: files only under `prefix`, 404 elsewhere, no SPA fallback.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createGzip } from 'node:zlib'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
}

/** @param {{ dir: string, prefix?: string, gzip?: boolean }} options */
export function createStaticServer({ dir, prefix = '/', gzip = false }) {
  const root = resolve(dir)
  return createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost')
    const decoded = decodeURIComponent(pathname)
    if (!decoded.startsWith(prefix)) return end(res, 404)
    let file = resolve(join(root, normalize(decoded.slice(prefix.length))))
    if (file !== root && !file.startsWith(root + sep)) return end(res, 403)
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) return end(res, 404)
    const type = TYPES[extname(file)] ?? 'application/octet-stream'
    const compress = gzip && ['text/', 'application/manifest', 'application/json', 'image/svg'].some((t) => type.startsWith(t)) && /gzip/.test(req.headers['accept-encoding'] ?? '')
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...(compress ? { 'Content-Encoding': 'gzip' } : {}) })
    const stream = createReadStream(file)
    if (compress) stream.pipe(createGzip()).pipe(res)
    else stream.pipe(res)
  })
}

function end(res, status) {
  res.writeHead(status).end()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`)
    return i > 0 ? process.argv[i + 1] : fallback
  }
  const port = Number(arg('port', '4174'))
  createStaticServer({ dir: arg('dir', 'dist'), prefix: arg('prefix', '/'), gzip: process.argv.includes('--gzip') }).listen(port, '127.0.0.1', () => {
    console.info(`static server on http://127.0.0.1:${port}${arg('prefix', '/')}`)
  })
}
