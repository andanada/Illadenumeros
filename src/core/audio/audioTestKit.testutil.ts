import { clipKeyFor } from './normalize'

/** Minimal fakes for Web Audio, fetch and speechSynthesis, shared by the clips/speech tests. */
export interface FakeSource {
  buffer: unknown
  onended: (() => void) | null
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

export interface FakeContext {
  state: 'running' | 'suspended'
  destination: object
  resume: ReturnType<typeof vi.fn>
  decodeAudioData: ReturnType<typeof vi.fn>
  createBufferSource: ReturnType<typeof vi.fn>
  sources: FakeSource[]
}

let shared: FakeContext | undefined

/**
 * The module-level AudioContext singleton keeps the first instance it is given, so every test gets that same
 * object, reset to a pristine state.
 */
export function makeFakeContext(): FakeContext {
  const sources: FakeSource[] = []
  const fresh: FakeContext = {
    state: 'running',
    destination: shared?.destination ?? {},
    resume: vi.fn(async () => undefined),
    decodeAudioData: vi.fn(async () => ({ duration: 1 })),
    createBufferSource: vi.fn(() => {
      const source: FakeSource = { buffer: null, onended: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }
      sources.push(source)
      return source
    }),
    sources,
  }
  shared = shared ? Object.assign(shared, fresh) : fresh
  return shared
}

/** `AudioContext` always constructs the same fake, so the module-level singleton stays controllable. */
export function installFakeAudioContext(ctx: FakeContext): void {
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        return ctx
      }
    },
  )
}

export interface FakeServer {
  manifest: unknown
  clips: Set<string>
  requests: string[]
}

/** Serves `voice/manifest.json` and `voice/<key>.mp3` for the given phrases. */
export function installFakeVoiceServer(phrases: readonly string[], manifestOverride?: unknown): FakeServer {
  const keys = phrases.map(clipKeyFor).sort()
  const server: FakeServer = {
    manifest: manifestOverride ?? { version: 1, voice: 'test', clips: keys },
    clips: new Set(keys),
    requests: [],
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      server.requests.push(url)
      if (url.endsWith('manifest.json')) return new Response(JSON.stringify(server.manifest), { status: 200 })
      const key = /voice\/([0-9a-f]{12})\.mp3$/.exec(url)?.[1]
      if (key && server.clips.has(key)) return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
      return new Response('', { status: 404 })
    }),
  )
  return server
}

export interface FakeSynthesis {
  speak: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  spoken: () => string[]
}

export function installFakeSynthesis(lang = 'ca-ES'): FakeSynthesis {
  const speak = vi.fn()
  const cancel = vi.fn()
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      voice: unknown
      lang = ''
      rate = 1
      pitch = 1
      text: string
      constructor(text: string) {
        this.text = text
      }
    },
  )
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [{ lang, name: 'Fake' }],
    speak,
    cancel,
    addEventListener: vi.fn(),
  })
  return { speak, cancel, spoken: () => speak.mock.calls.map((call) => (call[0] as { text: string }).text) }
}

/** Lets pending promise continuations (manifest, fetch, decode) run. */
export const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}
