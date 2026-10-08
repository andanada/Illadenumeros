// Paper-grain tile for the town (src/world/art/Grain.tsx): `node scripts/generate-grain.mjs`.
// Output: public/world/grain.png, a small seamless greyscale+alpha noise tile (commit the result).
// Seamless by construction: every pixel is independent noise plus a few soft fibres that wrap around the edges.
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'world')
const outFile = join(outDir, 'grain.png')
const SIZE = 128
const LEVELS = 6 // few grey levels compress far better and look the same once blended
const MAX_BYTES = 20 * 1024

/** mulberry32, same family as src/world/art/random.ts: the tile is identical on every build. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = rng(20261008)
const grey = new Float32Array(SIZE * SIZE).map(() => rand() - 0.5)

// Paper fibres: short wrapped strokes, slightly darker, so it reads as paper and not as TV static.
for (let f = 0; f < 70; f += 1) {
  const x0 = rand() * SIZE
  const y0 = rand() * SIZE
  const angle = rand() * Math.PI
  const len = 4 + rand() * 10
  for (let s = 0; s < len; s += 0.5) {
    const x = Math.floor(x0 + Math.cos(angle) * s + SIZE) % SIZE
    const y = Math.floor(y0 + Math.sin(angle) * s + SIZE) % SIZE
    grey[y * SIZE + x] -= 0.35
  }
}

const pixels = Buffer.alloc(SIZE * SIZE * 2)
grey.forEach((v, i) => {
  const q = Math.round(Math.max(-0.5, Math.min(0.5, v)) * (LEVELS - 1)) / (LEVELS - 1)
  pixels[i * 2] = q < 0 ? 40 : 255 // dark speck or light speck
  pixels[i * 2 + 1] = Math.round(Math.abs(q) * 2 * 120) // alpha: strength of the speck
})

await mkdir(outDir, { recursive: true })
await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 2 } })
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
  .toFile(outFile)

const { size } = await stat(outFile)
if (size > MAX_BYTES) throw new Error(`grain.png is ${size} bytes, over the ${MAX_BYTES} budget`)
process.stdout.write(`grain.png ${SIZE}x${SIZE}, ${size} bytes\n`)
