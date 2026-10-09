import { useEffect } from 'react'
import { playTones } from '../../scene/tones'

/** Arcade sounds, synthesised on the app's Web Audio context (respect the mute switch). */
export const arcadeSfx = {
  /** A cabinet wakes up: a rising chiptune arpeggio. */
  start: () =>
    playTones([
      { freq: 523, duration: 0.1, type: 'square', volume: 0.05 },
      { freq: 659, at: 0.1, duration: 0.1, type: 'square', volume: 0.05 },
      { freq: 784, at: 0.2, duration: 0.18, type: 'square', volume: 0.05 },
    ]),
  /** A button or the joystick. */
  button: () => playTones([{ freq: 880, to: 1200, duration: 0.07, type: 'square', volume: 0.04 }]),
  /** The claw whirrs down and up. */
  whirr: () => playTones([{ freq: 180, to: 320, duration: 0.55, type: 'sawtooth', volume: 0.035 }]),
  /** A prize drops into the chute. */
  prize: () =>
    playTones([
      { freq: 784, duration: 0.1, type: 'triangle', volume: 0.09 },
      { freq: 988, at: 0.1, duration: 0.1, type: 'triangle', volume: 0.09 },
      { freq: 1319, at: 0.2, duration: 0.28, type: 'triangle', volume: 0.09 },
    ]),
  /** The toy slipped: a soft wobbly "ooh". */
  slip: () => playTones([{ freq: 520, to: 300, duration: 0.3, type: 'triangle', volume: 0.07 }]),
  /** Lights on/off. */
  lights: () => playTones([{ freq: 1500, duration: 0.05, type: 'square', volume: 0.03 }]),
  /** A ribbon / ticket. */
  ticket: () => playTones([{ freq: 1100, to: 1500, duration: 0.09, type: 'triangle', volume: 0.06 }]),
}

/** A cheerful pentatonic tune, one note per step (C major pentatonic, two octaves). */
const TUNE = [0, 2, 4, 2, 5, 4, 2, 0, 3, 4, 6, 4, 5, 3, 2, 1] as const
const SCALE = [262, 294, 330, 392, 440, 523, 587] as const
export const STEP_MS = 260

/** Frequency of the n-th step of the background tune (loops). Pure. */
export function noteAt(step: number): number {
  const degree = TUNE[((step % TUNE.length) + TUNE.length) % TUNE.length] ?? 0
  return SCALE[degree] ?? SCALE[0]
}

/** The arcade's background music: plays while `on`, stops by itself when it is switched off or she leaves. */
export function useArcadeMusic(on: boolean): void {
  useEffect(() => {
    if (!on) return
    let step = 0
    const id = setInterval(() => {
      playTones([{ freq: noteAt(step), duration: 0.2, type: 'triangle', volume: 0.04 }])
      step += 1
    }, STEP_MS)
    return () => clearInterval(id)
  }, [on])
}
