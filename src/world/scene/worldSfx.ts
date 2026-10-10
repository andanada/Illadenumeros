import { getAudioContext } from '../../core/audio/context'
import { sfx } from '../../core/audio/sfx'
import { isMuted } from '../../core/audio/speech'

/**
 * Town sounds, built on the app's single Web Audio context and its mute switch (no audio files).
 * Each tone can glide (`to`), which gives the squishy, toy-like feel of the town.
 */
interface Tone {
  freq: number
  to?: number
  at?: number
  duration: number
  type?: OscillatorType
  volume?: number
}

function tones(list: readonly Tone[]): void {
  const ctx = getAudioContext()
  if (!ctx || isMuted()) return
  const start = ctx.currentTime + 0.01
  for (const tone of list) {
    const at = start + (tone.at ?? 0)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = tone.type ?? 'sine'
    osc.frequency.setValueAtTime(tone.freq, at)
    if (tone.to !== undefined) osc.frequency.exponentialRampToValueAtTime(tone.to, at + tone.duration)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(tone.volume ?? 0.14, at + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + tone.duration + 0.05)
  }
}

export const worldSfx = {
  /** Every prop tap: a short rubbery squish. */
  squish: () => tones([{ freq: 300, to: 520, duration: 0.12, volume: 0.12 }]),
  /** Lifting something. */
  lift: () => tones([{ freq: 380, to: 760, duration: 0.14, type: 'triangle', volume: 0.1 }]),
  /** Landing in a place. */
  plop: () => tones([{ freq: 620, to: 260, duration: 0.16, volume: 0.14 }]),
  /** Not accepted there: a soft "boing" back home, never a buzzer. */
  boing: () => tones([{ freq: 220, to: 330, duration: 0.1 }, { freq: 330, to: 200, at: 0.09, duration: 0.18, volume: 0.1 }]),
  /** The till. */
  beep: () => tones([{ freq: 1320, duration: 0.09, type: 'square', volume: 0.05 }, { freq: 1760, at: 0.1, duration: 0.12, type: 'square', volume: 0.05 }]),
  /** The till drawer. */
  kaching: () => tones([{ freq: 1568, duration: 0.08, type: 'triangle' }, { freq: 2093, at: 0.06, duration: 0.3, type: 'triangle', volume: 0.12 }]),
  coin: () => tones([{ freq: 1976, duration: 0.07, type: 'triangle', volume: 0.1 }, { freq: 2637, at: 0.05, duration: 0.18, type: 'triangle', volume: 0.08 }]),
  doorOpen: () => tones([{ freq: 180, to: 120, duration: 0.25, type: 'triangle', volume: 0.1 }]),
  doorClose: () => tones([{ freq: 140, to: 90, duration: 0.12, type: 'triangle', volume: 0.14 }]),
  meow: () => tones([{ freq: 700, to: 1100, duration: 0.18, type: 'triangle', volume: 0.08 }, { freq: 1100, to: 650, at: 0.17, duration: 0.3, type: 'triangle', volume: 0.07 }]),
  purr: () => tones(Array.from({ length: 6 }, (_, i) => ({ freq: 55, to: 70, at: i * 0.09, duration: 0.08, type: 'sawtooth' as const, volume: 0.04 }))),
  whoosh: () => tones([{ freq: 200, to: 900, duration: 0.25, type: 'sine', volume: 0.06 }]),
  /** A soft footstep while walking. */
  step: () => tones([{ freq: 210, to: 150, duration: 0.05, type: 'triangle', volume: 0.035 }]),
  doorbell: () => tones([{ freq: 988, duration: 0.35, type: 'sine' }, { freq: 784, at: 0.3, duration: 0.5, type: 'sine' }]),
  /** Errand solved: the app's own happy sounds, so the town feels like the same app. */
  happy: () => sfx.star(),
  /** Wrong try: the app's gentle "almost". */
  almost: () => sfx.almost(),
}

export type WorldSound = keyof typeof worldSfx
