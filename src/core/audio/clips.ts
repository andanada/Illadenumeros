import { z } from 'zod'
import { getAudioContext } from './context'
import { clipKeyFor } from './normalize'

/**
 * Pre-generated voice clips (Azure Neural TTS, built offline by `scripts/voice`), played with Web Audio.
 * Why Web Audio and not <audio>: it reuses the context unlocked by the first tap (iPad), needs no
 * `media-src blob:` in the CSP and no HTTP Range support from the service worker cache.
 * The app never talks to Azure: it only fetches static files from `voice/`.
 */

const BASE = import.meta.env.BASE_URL
const MANIFEST_URL = `${BASE}voice/manifest.json`
const RETRY_AFTER_MS = 30_000
/** `resume()` never settles while the browser still wants a user gesture: do not wait for it forever. */
const RESUME_WAIT_MS = 250

const manifestSchema = z.object({
  version: z.literal(1),
  voice: z.string(),
  clips: z.array(z.string().regex(/^[0-9a-f]{12}$/)),
})

export type ClipResult = 'played' | 'cancelled' | 'unavailable'

type ManifestState =
  | { kind: 'idle' }
  | { kind: 'loading'; promise: Promise<ReadonlySet<string> | undefined> }
  | { kind: 'ready'; keys: ReadonlySet<string> }
  | { kind: 'failed'; at: number }

let manifest: ManifestState = { kind: 'idle' }
/** Bumped by every play/stop: an async step that finds a newer value was superseded. */
let generation = 0
let playing: AudioBufferSourceNode | undefined

async function fetchManifest(): Promise<ReadonlySet<string> | undefined> {
  try {
    const response = await fetch(MANIFEST_URL)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const parsed = manifestSchema.parse(await response.json())
    const keys = new Set(parsed.clips)
    manifest = { kind: 'ready', keys }
    return keys
  } catch {
    // Offline, missing or malformed manifest: the device voice takes over; retry later, not on every phrase.
    manifest = { kind: 'failed', at: Date.now() }
    return undefined
  }
}

/** Fetches the manifest once (lazily); a failure is retried after a pause. Never rejects. */
export function loadClipManifest(): Promise<ReadonlySet<string> | undefined> {
  if (manifest.kind === 'ready') return Promise.resolve(manifest.keys)
  if (manifest.kind === 'loading') return manifest.promise
  if (manifest.kind === 'failed' && Date.now() - manifest.at < RETRY_AFTER_MS) return Promise.resolve(undefined)
  const promise = fetchManifest()
  manifest = { kind: 'loading', promise }
  return promise
}

/** Synchronous answer once the manifest is known; `undefined` while it is not loaded (or unavailable). */
export function hasClipSync(text: string): boolean | undefined {
  if (manifest.kind === 'ready') return manifest.keys.has(clipKeyFor(text))
  // Known to be unavailable for now: lets the caller fall back at once, still inside the user gesture.
  if (manifest.kind === 'failed' && Date.now() - manifest.at < RETRY_AFTER_MS) return false
  return undefined
}

export function stopClip(): void {
  generation += 1
  const source = playing
  playing = undefined
  if (!source) return
  source.onended = null
  try {
    source.stop()
  } catch {
    // Already finished.
  }
  source.disconnect()
}

async function decodeClip(ctx: AudioContext, key: string): Promise<AudioBuffer | undefined> {
  const response = await fetch(`${BASE}voice/${key}.mp3`)
  if (!response.ok) return undefined
  return ctx.decodeAudioData(await response.arrayBuffer())
}

async function ensureRunning(ctx: AudioContext): Promise<boolean> {
  const state = (): string => ctx.state
  if (state() === 'running') return true
  let timer: ReturnType<typeof setTimeout> | undefined
  const gaveUp = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, RESUME_WAIT_MS)
  })
  await Promise.race([ctx.resume().catch(() => undefined), gaveUp])
  clearTimeout(timer)
  return state() === 'running'
}

/**
 * Plays the clip of `text` if there is one. Resolves `'unavailable'` (never rejects) when the caller should use the
 * device voice instead, and `'cancelled'` when a newer speak/stop superseded this call (no fallback then).
 */
export async function playClip(text: string): Promise<ClipResult> {
  stopClip()
  const mine = generation
  try {
    const keys = await loadClipManifest()
    if (mine !== generation) return 'cancelled'
    const key = clipKeyFor(text)
    const ctx = getAudioContext()
    if (!keys?.has(key) || !ctx) return 'unavailable'
    const [buffer, running] = await Promise.all([decodeClip(ctx, key), ensureRunning(ctx)])
    if (mine !== generation) return 'cancelled'
    // Not running = no user gesture yet: a source started now would play late, at some later tap.
    if (!buffer || !running) return 'unavailable'
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => {
      if (playing === source) playing = undefined
    }
    source.start()
    playing = source
    return 'played'
  } catch {
    return mine === generation ? 'unavailable' : 'cancelled'
  }
}

/** Test hook: forgets the manifest and any running clip. */
export function resetClipsForTests(): void {
  stopClip()
  manifest = { kind: 'idle' }
}
