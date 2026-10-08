import { beforeEach, describe, expect, it, vi } from 'vitest'

const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
const oscillators: { type: string; start: ReturnType<typeof vi.fn> }[] = []
const fakeContext = {
  currentTime: 0,
  destination: {},
  createOscillator: () => {
    const osc = { type: '', frequency: param(), connect: (g: unknown) => g, start: vi.fn(), stop: vi.fn() }
    oscillators.push(osc)
    return osc
  },
  createGain: () => ({ gain: param(), connect: (d: unknown) => d }),
}

vi.mock('../../core/audio/context', () => ({ getAudioContext: () => fakeContext, unlockAudio: () => undefined }))

const { worldSfx } = await import('./worldSfx')
const { setMuted } = await import('../../core/audio/speech')

describe('worldSfx', () => {
  beforeEach(() => {
    oscillators.length = 0
    setMuted(false)
  })

  it('every town sound plays synthesised tones', () => {
    for (const [name, play] of Object.entries(worldSfx)) {
      if (name === 'happy' || name === 'almost') continue
      oscillators.length = 0
      play()
      expect(oscillators.length, name).toBeGreaterThan(0)
      expect(oscillators.every((o) => o.start.mock.calls.length === 1)).toBe(true)
    }
  })

  it('stays silent when muted', () => {
    setMuted(true)
    worldSfx.beep()
    worldSfx.purr()
    expect(oscillators).toHaveLength(0)
    setMuted(false)
  })
})
