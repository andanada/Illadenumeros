import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flush, installFakeAudioContext, installFakeSynthesis, installFakeVoiceServer, makeFakeContext } from '../../core/audio/audioTestKit.testutil'
import type { FakeContext, FakeSynthesis } from '../../core/audio/audioTestKit.testutil'
import { resetClipsForTests } from '../../core/audio/clips'
import { clipKeyFor, normalizeSpeech } from '../../core/audio/normalize'
import { activateTestPlayer } from '../../test/playerDb'
import { BOTIGA_ADAPTERS } from '../places/botiga/errands/botigaAdapters'
import { THANKS } from '../townVoice'
import { useErrand } from './useErrand'

vi.setConfig({ testTimeout: 30_000 })

// The jingles need a full Web Audio graph; only the voice is under test here.
vi.mock('../scene/worldSfx', () => ({ worldSfx: { happy: vi.fn(), almost: vi.fn() } }))

let ctx: FakeContext
let synthesis: FakeSynthesis

beforeEach(() => {
  activateTestPlayer()
  resetClipsForTests()
  ctx = makeFakeContext()
  installFakeAudioContext(ctx)
  synthesis = installFakeSynthesis()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const renderErrand = () =>
  renderHook(() => useErrand({ gameId: 'poble-botiga', skillIds: ['A4'], adapters: BOTIGA_ADAPTERS, forced: { skillId: 'A4', factKey: 'add:3+4' } }))

describe('what a neighbour says goes through speak() with the shared key', () => {
  it('reads the request as a clip when its normalised sentence has one, and never with the device voice', async () => {
    // The manifest answer is held back until the sentence is known, then lists the key exactly as the collector computes it.
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const keys: string[] = []
    const clipUrls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('manifest.json')) {
          await gate
          return new Response(JSON.stringify({ version: 1, voice: 'test', clips: keys }), { status: 200 })
        }
        clipUrls.push(url)
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
      }),
    )
    const { result } = renderErrand()
    const speech = result.current.request.speech
    expect(normalizeSpeech(speech)).toMatch(/^Vull [34] més [34] /)
    expect(speech).not.toContain('+')
    keys.push(clipKeyFor(speech))
    release()
    await act(flush)
    expect(clipUrls).toHaveLength(1)
    expect(clipUrls[0]).toMatch(new RegExp(`${clipKeyFor(speech)}\.mp3$`))
    expect(ctx.sources[0]?.start).toHaveBeenCalledOnce()
    expect(synthesis.speak).not.toHaveBeenCalled()
  })

  it('falls back to the device voice, in Catalan and with the symbols read as words, when the sentence has no clip', async () => {
    installFakeVoiceServer([])
    const { result } = renderErrand()
    await act(flush)
    expect(synthesis.spoken()).toEqual([normalizeSpeech(result.current.request.speech)])
    expect(synthesis.spoken()[0]).not.toMatch(/[+=×−]/)
    expect(ctx.sources).toHaveLength(0)
  })

  it('thanks the child with one of the town’s thank-you lines, by turns, and reads it with the device voice if it has no clip', async () => {
    installFakeVoiceServer([])
    const { result } = renderErrand()
    await act(flush)
    await act(async () => {
      await result.current.submit({ value: result.current.item.answer })
    })
    await act(flush)
    expect(result.current.phase).toBe('thanks')
    expect(THANKS.map(normalizeSpeech)).toContain(synthesis.spoken().at(-1))
  })

  it('plays the thank-you as a clip when the manifest has it', async () => {
    installFakeVoiceServer([...THANKS])
    const { result } = renderErrand()
    await act(flush)
    await act(async () => {
      await result.current.submit({ value: result.current.item.answer })
    })
    await act(flush)
    expect(ctx.sources.length).toBeGreaterThan(0)
    expect(synthesis.spoken().filter((text) => THANKS.map(normalizeSpeech).includes(text))).toEqual([])
  })
})
