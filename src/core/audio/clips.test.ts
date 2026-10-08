import { flush, installFakeAudioContext, installFakeVoiceServer, makeFakeContext } from './audioTestKit.testutil'
import type { FakeContext } from './audioTestKit.testutil'
import { hasClipSync, loadClipManifest, playClip, resetClipsForTests, stopClip } from './clips'

const PHRASE = 'Quant fa 3 per 4?'
const OTHER = 'Quant fa 2 per 2?'
let ctx: FakeContext

beforeEach(() => {
  resetClipsForTests()
  ctx = makeFakeContext()
  installFakeAudioContext(ctx)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('manifest', () => {
  it('is fetched lazily, once, and answers lookups synchronously afterwards', async () => {
    const server = installFakeVoiceServer([PHRASE])
    expect(hasClipSync(PHRASE)).toBeUndefined()
    await Promise.all([loadClipManifest(), loadClipManifest()])
    await loadClipManifest()
    expect(server.requests.filter((url) => url.endsWith('manifest.json'))).toHaveLength(1)
    expect(hasClipSync(PHRASE)).toBe(true)
    expect(hasClipSync('Una altra frase?')).toBe(false)
  })

  it('looks the text up after normalisation', async () => {
    installFakeVoiceServer([PHRASE])
    await loadClipManifest()
    expect(hasClipSync('Quant fa 3 × 4?')).toBe(true)
    expect(hasClipSync('Quant fa 3 per 4?')).toBe(true)
  })

  it.each([
    ['wrong version', { version: 2, voice: 'x', clips: [] }],
    ['bad key', { version: 1, voice: 'x', clips: ['nope'] }],
    ['not an object', 'hola'],
  ])('rejects a malformed manifest (%s) without throwing', async (_, manifest) => {
    installFakeVoiceServer([PHRASE], manifest)
    await expect(loadClipManifest()).resolves.toBeUndefined()
    expect(hasClipSync(PHRASE)).toBe(false)
  })

  it('treats a missing manifest as unavailable and retries only after a pause', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const fetchMock = vi.fn(async () => new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    await loadClipManifest()
    await loadClipManifest()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.setSystemTime(Date.now() + 31_000)
    installFakeVoiceServer([PHRASE])
    await expect(loadClipManifest()).resolves.toBeDefined()
    expect(hasClipSync(PHRASE)).toBe(true)
  })

  it('survives a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))
    await expect(loadClipManifest()).resolves.toBeUndefined()
  })
})

describe('playClip', () => {
  it('plays a known clip through Web Audio', async () => {
    installFakeVoiceServer([PHRASE])
    await expect(playClip(PHRASE)).resolves.toBe('played')
    expect(ctx.sources).toHaveLength(1)
    expect(ctx.sources[0]?.start).toHaveBeenCalledOnce()
    expect(ctx.sources[0]?.connect).toHaveBeenCalledWith(ctx.destination)
  })

  it('reports unavailable when the phrase has no clip', async () => {
    installFakeVoiceServer([PHRASE])
    await expect(playClip('Una frase sense clip?')).resolves.toBe('unavailable')
    expect(ctx.sources).toHaveLength(0)
  })

  it('reports unavailable when the clip file is missing or cannot be decoded', async () => {
    const server = installFakeVoiceServer([PHRASE])
    server.clips.clear()
    await expect(playClip(PHRASE)).resolves.toBe('unavailable')
    installFakeVoiceServer([PHRASE])
    ctx.decodeAudioData.mockRejectedValueOnce(new Error('bad data'))
    await expect(playClip(PHRASE)).resolves.toBe('unavailable')
  })

  it('reports unavailable when the audio context cannot start (no user gesture yet)', async () => {
    installFakeVoiceServer([PHRASE])
    ctx.state = 'suspended'
    await expect(playClip(PHRASE)).resolves.toBe('unavailable')
    expect(ctx.resume).toHaveBeenCalled()
    expect(ctx.sources).toHaveLength(0)
  })

  it('does not wait forever for a resume() that never settles', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    installFakeVoiceServer([PHRASE])
    ctx.state = 'suspended'
    ctx.resume.mockReturnValue(new Promise(() => undefined))
    const result = playClip(PHRASE)
    await vi.advanceTimersByTimeAsync(300)
    await expect(result).resolves.toBe('unavailable')
  })

  it('starts the clip when the context resumes in time', async () => {
    installFakeVoiceServer([PHRASE])
    ctx.state = 'suspended'
    ctx.resume.mockImplementation(async () => {
      ctx.state = 'running'
    })
    await expect(playClip(PHRASE)).resolves.toBe('played')
  })

  it('a newer call supersedes the one still loading', async () => {
    installFakeVoiceServer([PHRASE, OTHER])
    const first = playClip(PHRASE)
    const second = playClip(OTHER)
    await expect(first).resolves.toBe('cancelled')
    await expect(second).resolves.toBe('played')
    expect(ctx.sources).toHaveLength(1)
  })

  it('stopClip cancels a pending call and stops a playing one', async () => {
    installFakeVoiceServer([PHRASE])
    const pending = playClip(PHRASE)
    stopClip()
    await expect(pending).resolves.toBe('cancelled')
    expect(ctx.sources).toHaveLength(0)

    await expect(playClip(PHRASE)).resolves.toBe('played')
    stopClip()
    expect(ctx.sources[0]?.stop).toHaveBeenCalledOnce()
    expect(ctx.sources[0]?.disconnect).toHaveBeenCalled()
    stopClip()
    expect(ctx.sources[0]?.stop).toHaveBeenCalledOnce()
  })

  it('starting a new clip stops the previous one', async () => {
    installFakeVoiceServer([PHRASE, OTHER])
    await playClip(PHRASE)
    await playClip(OTHER)
    expect(ctx.sources[0]?.stop).toHaveBeenCalledOnce()
    expect(ctx.sources[1]?.start).toHaveBeenCalledOnce()
  })

  it('tolerates a source that is already finished when stopped', async () => {
    installFakeVoiceServer([PHRASE])
    await playClip(PHRASE)
    ctx.sources[0]?.stop.mockImplementationOnce(() => {
      throw new Error('InvalidStateError')
    })
    expect(() => stopClip()).not.toThrow()
  })

  it('forgets a clip that ended by itself', async () => {
    installFakeVoiceServer([PHRASE])
    await playClip(PHRASE)
    ctx.sources[0]?.onended?.()
    stopClip()
    expect(ctx.sources[0]?.stop).not.toHaveBeenCalled()
    await flush()
  })
})
