// Generates the pre-recorded Catalan voice clips with Azure Neural TTS (ca-ES-JoanaNeural).
//
//   node scripts/voice/generate.mjs --dry-run     counts only: no key read, no request made
//   node scripts/voice/generate.mjs               generate whatever is missing (idempotent)
//   node scripts/voice/generate.mjs --verify      check every clip on disk (valid MP3, in the manifest); no key, no request
//   options: --seeds N  --limit N  --only base|town  --force  --prune  --interval-ms N
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
/** The estimate is a model, not a measurement: the real bytes may overshoot it a little before the run stops. */
const RUNTIME_TOLERANCE = { base: 1.15, town: 1.05 }
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
    verify: argv.includes('--verify'),
    only: argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : undefined,
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
async function synthesize({ key, region }, ssml, format, pacer, inspectMp3) {
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
        const info = inspectMp3(bytes)
        if (info.valid) return bytes
        lastProblem = `MP3 no vàlid (${info.reason})`
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

function printPlan({ plan, coverage, todo, ledger, limits, budget }) {
  const { base, town } = plan
  out(`Seeds de mostreig: ${base.seeds}`)
  out(`Preguntes: univers ${base.universe.clips} textos, seleccionats ${base.clips} clips, ${base.chars} caràcters, ${mb(base.bytes)} MB estimats (de ${mb(limits.base.maxBytes)} MB)`)
  out(`Cobertura de preguntes (prompts nous amb clip, comptant els clips ja existents): ${(coverage.questions.overall * 100).toFixed(1)} % ponderada`)
  out(`Poble: univers ${town.universe.clips} textos nous, seleccionats ${town.clips} clips, ${town.chars} caràcters, ${mb(town.bytes)} MB estimats (de ${mb(limits.town.maxBytes)} MB)`)
  const groups = new Map()
  for (const c of town.selected) for (const tag of new Set(c.sources.map((x) => x.split(':')[0]))) groups.set(tag, (groups.get(tag) ?? 0) + 1)
  out(`  clips del poble per tipus: ${[...groups].map(([k, v]) => `${k} ${v}`).join(', ')}`)
  out('  lloc          peticions distintes  amb clip   peticions amb clip  pistes amb clip  clips nous')
  for (const p of coverage.places) {
    out(`  ${p.placeId.padEnd(12)} ${String(p.universe).padStart(10)} ${String(p.covered).padStart(14)} ${`${(p.requestHitRate * 100).toFixed(1)} %`.padStart(14)} ${`${(p.hintHitRate * 100).toFixed(1)} %`.padStart(16)} ${String(p.clips).padStart(10)}`)
  }
  const total = plan.totals
  out(`Total: ${total.clips} clips, ${total.chars} caràcters (${((total.chars / limits.base.maxChars) * 100).toFixed(1)} % de ${limits.base.maxChars})`)
  out(`Per generar ara: ${todo.length} clips, ${budget.totalsOf(todo).chars} caràcters, ~${mb(budget.totalsOf(todo).bytes)} MB`)
  out(`Caràcters ja facturats (usage.json): ${ledger.charsBilled}`)
}

function listClipFiles() {
  return existsSync(OUT_DIR) ? readdirSync(OUT_DIR).filter((f) => /^[0-9a-f]{12}\.mp3$/.test(f)) : []
}

/** Every clip on disk is playable (the file name is the key of its text), selected now or not; `--prune` removes the strays. */
function writeManifest(keys, voice) {
  const clips = [...keys].sort()
  const manifest = { version: 1, voice, clips }
  writeJson(join(OUT_DIR, 'manifest.json'), manifest)
  const hash = createHash('sha1').update(JSON.stringify(manifest)).digest('hex').slice(0, 8)
  return { count: clips.length, hash }
}

/** Checks every clip on disk: valid MP3, listed in the manifest, and nothing listed that is missing. No network. */
function verifyClips(mp3, index) {
  const files = listClipFiles()
  const manifest = readJson(join(OUT_DIR, 'manifest.json'), { clips: [] })
  const listed = new Set(manifest.clips)
  const problems = []
  const byRate = new Map()
  let bytes = 0
  let seconds = 0
  for (const file of files) {
    const data = readFileSync(join(OUT_DIR, file))
    const info = mp3.inspectMp3(data)
    bytes += data.length
    if (!info.valid) problems.push(`${file}: ${info.reason}`)
    else {
      seconds += info.durationSec
      const label = `${info.sampleRate} Hz / ${info.bitrateKbps} kbit/s`
      byRate.set(label, (byRate.get(label) ?? 0) + 1)
      if (info.durationSec < 0.3 || info.durationSec > 40) problems.push(`${file}: durada estranya (${info.durationSec.toFixed(1)} s)`)
    }
    if (!listed.has(file.slice(0, 12))) problems.push(`${file}: no és al manifest`)
  }
  const onDisk = new Set(files.map((f) => f.slice(0, 12)))
  for (const key of listed) if (!onDisk.has(key)) problems.push(`${key}: al manifest però sense fitxer`)
  for (const key of listed) if (index.clips[key] === undefined) problems.push(`${key}: al manifest però no a index.json`)
  out(`Verificació: ${files.length} fitxers, ${mb(bytes)} MB, ${(seconds / 60).toFixed(1)} min d’àudio, manifest ${listed.size} clips`)
  for (const [label, count] of byRate) out(`  ${label}: ${count} clips`)
  if (problems.length > 0) {
    out(`${problems.length} problemes:`)
    for (const p of problems.slice(0, 30)) out(`  ${p}`)
    process.exitCode = 1
  } else out('Tot correcte: cap clip corrupte, manifest i fitxers coincideixen.')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const mods = await loadVoiceModules()
  try {
    const { collect, plan: planModule, budget, ssml, mp3 } = mods
    let index = readJson(INDEX_FILE, { voice: ssml.VOICE, format: ssml.OUTPUT_FORMAT, clips: {} })
    if (args.verify) return verifyClips(mp3, index)
    const plan = planModule.collectAll(args.seeds ? { seeds: args.seeds } : {})
    const limits = { base: budget.LIMITS, town: budget.TOWN_LIMITS, maxChars: budget.LIMITS.maxChars }
    budget.assertPlanWithinBudget(plan.selected) // aborts (BudgetError) before any request
    const present = new Set(listClipFiles().map((f) => f.slice(0, 12)))
    const ranked = collect.byValue(plan.selected).filter((c) => !args.only || (c.group ?? 'base') === args.only)
    const todo = (args.force ? ranked : ranked.filter((c) => !present.has(c.key))).slice(0, args.limit)
    let ledger = readJson(USAGE_FILE, { charsBilled: 0 })
    const coverage = planModule.measurePlan(plan, Object.entries(index.clips).filter(([key]) => present.has(key)).map(([, text]) => text))
    printPlan({ plan, coverage, todo, ledger, limits, budget })

    const todoChars = budget.totalsOf(todo).chars
    if (ledger.charsBilled + todoChars > limits.maxChars) {
      throw new Error(`Aturat: ${ledger.charsBilled} facturats + ${todoChars} per generar superen el pressupost de ${limits.maxChars} caràcters.`)
    }
    if (args.dryRun) return out('Dry run: no s’ha fet cap petició.')

    mkdirSync(OUT_DIR, { recursive: true })
    const credentials = readCredentials()
    const pacer = new Pacer(args.intervalMs)
    const sizes = new Map(listClipFiles().map((f) => [f.slice(0, 12), statSync(join(OUT_DIR, f)).size]))
    const groupOf = new Map(plan.selected.map((c) => [c.key, c.group ?? 'base']))
    const selectedKeys = new Set(groupOf.keys())
    const bytesOnDisk = { base: 0, town: 0 }
    for (const [key, size] of sizes) if (selectedKeys.has(key)) bytesOnDisk[groupOf.get(key)] += size
    const cap = (group) => (limits[group].maxBytes - (limits[group].reserved ?? budget.RESERVED_BYTES)) * RUNTIME_TOLERANCE[group]
    const failures = []
    let done = 0
    let skippedForWeight = 0
    const save = () => {
      writeJson(INDEX_FILE, { ...index, clips: Object.fromEntries(Object.entries(index.clips).sort(([a], [b]) => (a < b ? -1 : 1))) })
      writeJson(USAGE_FILE, { charsBilled: ledger.charsBilled, updated: new Date().toISOString() })
      writeManifest(sizes.keys(), ssml.VOICE)
    }
    process.on('SIGINT', () => {
      save()
      process.exit(130)
    })

    for (const clip of todo) {
      const group = clip.group ?? 'base'
      if (bytesOnDisk[group] + budget.estimateBytes(clip.text, group) > cap(group)) {
        skippedForWeight += 1
        continue
      }
      try {
        const format = group === 'town' ? ssml.TOWN_OUTPUT_FORMAT : ssml.OUTPUT_FORMAT
        const bytes = await synthesize(credentials, ssml.buildSsml(clip.text), format, pacer, mp3.inspectMp3)
        const file = join(OUT_DIR, `${clip.key}.mp3`)
        writeFileSync(`${file}.tmp`, bytes)
        renameSync(`${file}.tmp`, file)
        ledger = { charsBilled: ledger.charsBilled + clip.text.length }
        const formats = { ...(index.formats ?? {}) }
        if (group === 'town') formats[clip.key] = format
        else delete formats[clip.key]
        index = { ...index, formats, clips: { ...index.clips, [clip.key]: clip.text } }
        bytesOnDisk[group] += bytes.length - (sizes.get(clip.key) ?? 0)
        sizes.set(clip.key, bytes.length)
        done += 1
        if (done % 25 === 0) {
          save()
          out(`  ${done}/${todo.length} clips, poble ${mb(bytesOnDisk.town)} MB, ${ledger.charsBilled} caràcters facturats`)
        }
      } catch (error) {
        if (error instanceof FatalError) {
          save()
          throw error
        }
        failures.push(`${clip.key} «${clip.text}»: ${error.message}`)
      }
    }
    if (skippedForWeight > 0) out(`Pes màxim assolit: ${skippedForWeight} clips de menys valor no s’han generat.`)

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
    const manifest = writeManifest(sizes.keys(), ssml.VOICE)
    out(`Fet: ${done} clips nous. Manifest: ${manifest.count} clips. Pes: preguntes ${mb(bytesOnDisk.base)} MB, poble ${mb(bytesOnDisk.town)} MB. Caràcters facturats en total: ${ledger.charsBilled}.`)
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
