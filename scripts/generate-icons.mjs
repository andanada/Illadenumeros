// Regenerates every app icon from a single drawing: `npm run icons`.
// Output: public/icon.svg + public/icons/*.png (commit the result).
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const iconsDir = join(publicDir, 'icons')

/** Kawaii bunny + star sticker, drawn in a 512x512 box and scaled around its centre. */
const character = (scale) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -262)" filter="url(#sticker)">
    <g stroke="#fff" stroke-width="18" stroke-linejoin="round" stroke-linecap="round">
      <path d="M176 232 C140 120 150 70 186 70 C222 70 226 150 224 224 Z" fill="#fff"/>
      <path d="M336 232 C372 120 362 70 326 70 C290 70 286 150 288 224 Z" fill="#fff"/>
    </g>
    <path d="M184 190 C170 130 172 100 186 100 C200 100 202 150 202 196 Z" fill="#f9a8d4"/>
    <path d="M328 190 C342 130 340 100 326 100 C312 100 310 150 310 196 Z" fill="#f9a8d4"/>
    <ellipse cx="256" cy="320" rx="150" ry="132" fill="#fff" stroke="#fff" stroke-width="18"/>
    <ellipse cx="256" cy="320" rx="150" ry="132" fill="#fff" stroke="#6d28d9" stroke-opacity=".25" stroke-width="4"/>
    <path d="M200 304 q14 -20 28 0 M284 304 q14 -20 28 0" stroke="#3b0764" stroke-width="13" fill="none" stroke-linecap="round"/>
    <ellipse cx="170" cy="344" rx="22" ry="13" fill="#fda4af" opacity=".85"/>
    <ellipse cx="342" cy="344" rx="22" ry="13" fill="#fda4af" opacity=".85"/>
    <path d="M232 338 q24 28 48 0" stroke="#3b0764" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path transform="translate(-22 22)" d="M410 70 l12 26 l28 4 l-20 20 l5 28 l-25 -13 l-25 13 l5 -28 l-20 -20 l28 -4 z" fill="#ffd23f" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>
  </g>`

/** Notebook-grid lilac background. `radius` 0 = full bleed (maskable / iOS). */
const background = (radius) => `
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${radius}" fill="url(#grid)"/>`

const svg = ({ radius, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a78bfa"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2"/>
    </pattern>
    <filter id="sticker" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#2a1b3d" flood-opacity=".35"/>
    </filter>
  </defs>${background(radius)}${character(scale)}
</svg>
`

/** Rounded "any" icon, full-bleed iOS icon, and maskable (content inside the central 80% safe zone). */
const variants = {
  rounded: svg({ radius: 112, scale: 0.9 }),
  bleed: svg({ radius: 0, scale: 0.9 }),
  maskable: svg({ radius: 0, scale: 0.78 }),
}

const targets = [
  ['icons/icon-192.png', 'rounded', 192],
  ['icons/icon-512.png', 'rounded', 512],
  ['icons/icon-maskable-512.png', 'maskable', 512],
  ['icons/apple-touch-icon-180.png', 'bleed', 180],
  ['icons/favicon-32.png', 'rounded', 32],
]

await mkdir(iconsDir, { recursive: true })
await writeFile(join(publicDir, 'icon.svg'), variants.rounded)
for (const [file, variant, size] of targets) {
  await sharp(Buffer.from(variants[variant]), { density: (72 * size * 2) / 512 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, file))
  console.info(`public/${file} (${size}x${size}, ${variant})`)
}
