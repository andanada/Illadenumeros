import { flush, installFakeAudioContext, installFakeSynthesis, installFakeVoiceServer, makeFakeContext } from './audioTestKit.testutil'
import type { FakeContext, FakeSynthesis } from './audioTestKit.testutil'
import { loadClipManifest, resetClipsForTests } from './clips'
import { hasCatalanVoice, initSpeech, isMuted, setMuted, speak, stopSpeaking } from './speech'

const PHRASE = 'Quant fa 3 per 4?'
let ctx: FakeContext
let synthesis: FakeSynthesis

beforeEach(() => {
  localStorage.clear()
  resetClipsForTests()
  ctx = makeFakeContext()
  installFakeAudioContext(ctx)
  synthesis = installFakeSynthesis()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('speak with clips', () => {
  it('plays the clip and leaves the device voice silent', async () => {
    installFakeVoiceServer([PHRASE])
    speak(PHRASE)
    await flush()
    expect(ctx.sources[0]?.start).toHaveBeenCalledOnce()
    expect(synthesis.speak).not.toHaveBeenCalled()
  })

  it('falls back to the device voice, with the symbols expanded, when the phrase has no clip', async () => {
    installFakeVoiceServer([PHRASE])
    await loadClipManifest()
    speak('Quant fa 5 − 3?')
    expect(synthesis.spoken()).toEqual(['Quant fa 5 menys 3?'])
    expect(ctx.sources).toHaveLength(0)
  })

  it('falls back after the lookup when the manifest was not loaded yet', async () => {
    installFakeVoiceServer([PHRASE])
    speak('Quant fa 6 per 7?')
    expect(synthesis.speak).not.toHaveBeenCalled()
    await flush()
    expect(synthesis.spoken()).toEqual(['Quant fa 6 per 7?'])
  })

  it('falls back when the manifest cannot be loaded, synchronously once it is known to be down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))
    speak(PHRASE)
    await flush()
    expect(synthesis.spoken()).toEqual([PHRASE])
    speak(PHRASE)
    expect(synthesis.spoken()).toHaveLength(2)
  })

  it('falls back when the clip itself fails to decode', async () => {
    installFakeVoiceServer([PHRASE])
    ctx.decodeAudioData.mockRejectedValueOnce(new Error('bad'))
    speak(PHRASE)
    await flush()
    expect(synthesis.spoken()).toEqual([PHRASE])
  })

  it('uses the requested rate only for the device voice', async () => {
    installFakeVoiceServer([])
    await loadClipManifest()
    speak('Hola', { rate: 0.8 })
    const utterance = synthesis.speak.mock.calls[0]?.[0] as { rate: number }
    expect(utterance.rate).toBe(0.8)
  })

  it('a new phrase replaces the previous one and never lets the old fallback talk', async () => {
    installFakeVoiceServer([PHRASE])
    speak('Quant fa 6 per 7?')
    speak(PHRASE)
    await flush()
    expect(synthesis.spoken()).toEqual([])
    expect(ctx.sources).toHaveLength(1)
  })

  it('stays silent without a Catalan voice', async () => {
    vi.resetModules()
    synthesis = installFakeSynthesis('es-ES')
    installFakeVoiceServer([])
    const fresh = await import('./speech')
    await (await import('./clips')).loadClipManifest()
    fresh.speak('Hola')
    expect(synthesis.speak).not.toHaveBeenCalled()
    expect(fresh.hasCatalanVoice()).toBe(false)
  })
})

describe('mute and stop', () => {
  it('speak does nothing while muted', async () => {
    installFakeVoiceServer([PHRASE])
    setMuted(true)
    expect(isMuted()).toBe(true)
    speak(PHRASE)
    await flush()
    expect(ctx.sources).toHaveLength(0)
    expect(synthesis.speak).not.toHaveBeenCalled()
  })

  it('muting stops a playing clip and cancels the device voice', async () => {
    installFakeVoiceServer([PHRASE])
    speak(PHRASE)
    await flush()
    setMuted(true)
    expect(ctx.sources[0]?.stop).toHaveBeenCalledOnce()
    expect(synthesis.cancel).toHaveBeenCalled()
    setMuted(false)
    expect(isMuted()).toBe(false)
  })

  it('stopSpeaking before the clip arrives prevents both the clip and the fallback', async () => {
    installFakeVoiceServer([PHRASE])
    speak(PHRASE)
    stopSpeaking()
    await flush()
    expect(ctx.sources).toHaveLength(0)
    expect(synthesis.speak).not.toHaveBeenCalled()
  })

  it('survives unavailable storage', () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(isMuted()).toBe(false)
    getSpy.mockRestore()
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => setMuted(true)).not.toThrow()
    setSpy.mockRestore()
  })
})

describe('initSpeech', () => {
  it('preloads the manifest and reports the Catalan voice', async () => {
    const server = installFakeVoiceServer([PHRASE])
    initSpeech()
    await flush()
    expect(server.requests.some((url) => url.endsWith('manifest.json'))).toBe(true)
    expect(hasCatalanVoice()).toBe(true)
  })
})
