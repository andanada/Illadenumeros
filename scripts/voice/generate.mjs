// Generates the pre-recorded Catalan voice clips with Azure Neural TTS (ca-ES-JoanaNeural).
//
//   node scripts/voice/generate.mjs --dry-run     counts only: no key read, no request made
//   node scripts/voice/generate.mjs               generate whatever is missing (idempotent)
//   options: --seeds N  --limit N  --force  --prune  --interval-ms N
//
// The Azure key lives only in .env.speech (gitignored). It is read here, sent in one request header and never
// printed, logged or written anywhere. The browser app never calls Azure: it only fetches the generated files.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadVoiceModules } from './loadTs.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const OUT_DIR = join(ROOT, 'public', 'voice')
const INDEX_FILE = join(ROOT, 'scripts', 'voice', 'index.json')
const USAGE_FILE = join(ROOT, 'scripts', 'voice', 'usage.json')
const ENV_FILE = join(ROOT, '.env.speech')
const MAX_ATTEMPTS = 6
const MIN_INTERVAL_MS = 1500
const RATE_LIMITED_INTERVAL_MS = 3200

const out = (text) => process.stdout.write(`${text}\n`)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback)
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`)
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2)

function parseArgs(argv) {
  const value = (name, fallback) => {
    const at = argv.indexOf(name)
    return at >= 0 ? Number(argv[at + 1]) : fallback
  }
  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    prune: argv.includes('--prune'),
    seeds: value('--seeds', undefined),
    limit: value('--limit', Infinity),
    intervalMs: value('--interval-ms', MIN_INTERVAL_MS),
  }
}

/** Reads KEY=VALUE pairs from .env.speech. Returns the values; nothing here is ever printed. */
function readCredentials() {
  if (!existsSync(ENV_FILE)) throw new Error('Falta .env.speech a l’arrel (AZURE_SPEECH_KEY i AZURE_SPEECH_REGION).')
  const env = Object.fromEntries(
    readFileSync(ENV_FILE, 'utf8')
      .split(/\r?\n/)
      .map((line) => /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
  )
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) throw new Error('.env.speech ha de definir AZURE_SPEECH_KEY i AZURE_SPEECH_REGION.')
  return { key: env.AZURE_SPEECH_KEY, region: env.AZURE_SPEECH_REGION }
}

const looksLikeMp3 = (bytes) => bytes.length > 256 && ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))

class Pacer {
  constructor(intervalMs) {
    this.intervalMs = intervalMs
    this.next = 0
  }
  async wait() {
    const delay = this.next - Date.now()
    if (delay > 0) await sleep(delay)
    this.next = Date.now() + this.intervalMs
  }
  slowDown() {
    this.intervalMs = Math.max(this.intervalMs * 2, RATE_LIMITED_INTERVAL_MS)
  }
}

class FatalError extends Error {}

/** One synthesis with retries (429/5xx/network) and exponential backoff. */
async function synthesize({ key, region }, ssml, format, pacer) {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  let lastProblem = 'desconegut'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await pacer.wait()
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': format,
          'User-Agent': 'MatesMagiques-voice-generator',
        },
        body: ssml,
      })
      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer())
        if (looksLikeMp3(bytes)) return bytes
        lastProblem = 'resposta que no és MP3'
      } else if (response.status === 401 || response.status === 403) {
        throw new FatalError(`Azure ha rebutjat les credencials (HTTP ${response.status}). Revisa .env.speech.`)
      } else if (response.status === 400) {
        throw new Error('HTTP 400 (SSML rebutjat)')
      } else {
        lastProblem = `HTTP ${response.status}`
        if (response.status === 429) pacer.slowDown()
        const retryAfter = Number(response.headers.get('retry-after'))
        if (retryAfter > 0) await sleep(Math.min(retryAfter, 120) * 1000)
      }
    } catch (error) {
      if (error instanceof FatalError || /^HTTP 400/.test(error.message)) throw error
      lastProblem = error.message
    }
    await sleep(Math.min(2000 * 2 ** (attempt - 1), 60_000) + Math.random() * 500)
  }
  throw new Error(`Sense resposta després de ${MAX_ATTEMPTS} intents (${lastProblem})`)
}

function printPlan({ selection, coverage, todo, ledger, limits, budget }) {
  out(`Seeds de mostreig: ${selection.seeds}`)
  out(`Univers de textos trobats: ${selection.universe.clips} diferents, ${selection.universe.chars} caràcters`)
  out(`Seleccionats: ${selection.clips} clips, ${selection.chars} caràcters (${((selection.chars / limits.maxChars) * 100).toFixed(1)} % de ${limits.maxChars})`)
  out(`Pes estimat: ${mb(selection.bytes)} MB de ${mb(limits.maxBytes)} MB`)
  out(`Cobertura (prompts nous amb clip): ${(coverage.overall * 100).toFixed(1)} % ponderada`)
  for (const s of coverage.perSkill) out(`  ${s.skillId.padEnd(4)} ${(s.hitRate * 100).toFixed(0).padStart(3)} %`)
  out(`Per generar ara: ${todo.length} clips, ${budget.totalsOf(todo).chars} caràcters`)
  out(`Caràcters ja facturats (usage.json): ${ledger.charsBilled}`)
}

function listClipFiles() {
  return existsSync(OUT_DIR) ? readdirSync(OUT_DIR).filter((f) => /^[0-9a-f]{12}\.mp3$/.test(f)) : []
}

function writeManifest(selection, voice, haveFile) {
  const clips = selection.selected.map((c) => c.key).filter(haveFile).sort()
  const manifest = { version: 1, voice, clips }
  writeJson(join(OUT_DIR, 'manifest.json'), manifest)
  const hash = createHash('sha1').update(JSON.stringify(manifest)).digest('hex').slice(0, 8)
  return { count: clips.length, hash }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const mods = await loadVoiceModules()
  try {
    const { collect, budget, ssml } = mods
    const selection = collect.collectTexts(args.seeds ? { seeds: args.seeds } : {})
    const limits = budget.LIMITS
    budget.assertWithinBudget(selection.selected, limits) // aborts (BudgetError) before any request
    const present = new Set(listClipFiles().map((f) => f.slice(0, 12)))
    const ranked = collect.byValue(selection.selected)
    const todo = (args.force ? ranked : ranked.filter((c) => !present.has(c.key))).slice(0, args.limit)
    let ledger = readJson(USAGE_FILE, { charsBilled: 0 })
    const coverage = collect.measureCoverage(selection)
    printPlan({ selection, coverage, todo, ledger, limits, budget })

    const todoChars = budget.totalsOf(todo).chars
    if (ledger.charsBilled + todoChars > limits.maxChars) {
      throw new Error(`Aturat: ${ledger.charsBilled} facturats + ${todoChars} per generar superen el pressupost de ${limits.maxChars} caràcters.`)
    }
    if (args.dryRun) return out('Dry run: no s’ha fet cap petició.')

    mkdirSync(OUT_DIR, { recursive: true })
    let index = readJson(INDEX_FILE, { voice: ssml.VOICE, format: ssml.OUTPUT_FORMAT, clips: {} })
    const credentials = readCredentials()
    const pacer = new Pacer(args.intervalMs)
    const sizes = new Map(listClipFiles().map((f) => [f.slice(0, 12), statSync(join(OUT_DIR, f)).size]))
    const selectedKeys = new Set(selection.selected.map((c) => c.key))
    let bytesOnDisk = [...sizes].filter(([k]) => selectedKeys.has(k)).reduce((sum, [, size]) => sum + size, 0)
    const failures = []
    let done = 0
    const save = () => {
      writeJson(INDEX_FILE, { ...index, clips: Object.fromEntries(Object.entries(index.clips).sort(([a], [b]) => (a < b ? -1 : 1))) })
      writeJson(USAGE_FILE, { charsBilled: ledger.charsBilled, updated: new Date().toISOString() })
      writeManifest(selection, ssml.VOICE, (key) => sizes.has(key))
    }
    process.on('SIGINT', () => {
      save()
      process.exit(130)
    })

    for (const clip of todo) {
      if (bytesOnDisk + budget.estimateBytes(clip.text) > limits.maxBytes - budget.RESERVED_BYTES) {
        out('Pes màxim assolit: s’atura la generació (els clips restants són de menys valor).')
        break
      }
      try {
        const bytes = await synthesize(credentials, ssml.buildSsml(clip.text), ssml.OUTPUT_FORMAT, pacer)
        const file = join(OUT_DIR, `${clip.key}.mp3`)
        writeFileSync(`${file}.tmp`, bytes)
        renameSync(`${file}.tmp`, file)
        ledger = { charsBilled: ledger.charsBilled + clip.text.length }
        index = { ...index, clips: { ...index.clips, [clip.key]: clip.text } }
        bytesOnDisk += bytes.length - (sizes.get(clip.key) ?? 0)
        sizes.set(clip.key, bytes.length)
        done += 1
        if (done % 25 === 0) {
          save()
          out(`  ${done}/${todo.length} clips, ${mb(bytesOnDisk)} MB, ${ledger.charsBilled} caràcters facturats`)
        }
      } catch (error) {
        if (error instanceof FatalError) throw error
        failures.push(`${clip.key} «${clip.text}»: ${error.message}`)
      }
    }

    if (args.prune) {
      const orphans = listClipFiles().filter((f) => !selectedKeys.has(f.slice(0, 12)))
      for (const f of orphans) {
        unlinkSync(join(OUT_DIR, f))
        sizes.delete(f.slice(0, 12))
      }
      index = { ...index, clips: Object.fromEntries(Object.entries(index.clips).filter(([key]) => sizes.has(key))) }
      out(`Esborrats ${orphans.length} clips orfes.`)
    }
    save()
    const manifest = writeManifest(selection, ssml.VOICE, (key) => sizes.has(key))
    out(`Fet: ${done} clips nous. Manifest: ${manifest.count} clips. Pes dels clips: ${mb(bytesOnDisk)} MB. Caràcters facturats en total: ${ledger.charsBilled}.`)
    if (failures.length > 0) {
      out(`${failures.length} clips han fallat (es reintentaran a la propera execució):`)
      for (const f of failures.slice(0, 20)) out(`  ${f}`)
      process.exitCode = 1
    }
  } finally {
    await mods.close()
  }
}

main().catch((error) => {
  out(`ERROR: ${error.message}`)
  process.exit(1)
})
