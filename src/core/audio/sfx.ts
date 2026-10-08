import { getAudioContext } from './context'
import { isMuted } from './speech'

/** Sound effects synthesised with the Web Audio API: no audio files, works offline. */
export { unlockAudio } from './context'

interface Note {
  freq: number
  at: number
  duration: number
  type?: OscillatorType
  volume?: number
}

function play(notes: Note[]): void {
  const ctx = getAudioContext()
  if (!ctx || isMuted()) return
  const start = ctx.currentTime + 0.01
  for (const note of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = note.type ?? 'triangle'
    osc.frequency.setValueAtTime(note.freq, start + note.at)
    const volume = note.volume ?? 0.18
    gain.gain.setValueAtTime(0.0001, start + note.at)
    gain.gain.exponentialRampToValueAtTime(volume, start + note.at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start + note.at)
    osc.stop(start + note.at + note.duration + 0.05)
  }
}

export const sfx = {
  correct: () => play([{ freq: 659, at: 0, duration: 0.15 }, { freq: 880, at: 0.1, duration: 0.25 }]),
  /** Gentle "almost": never a harsh buzzer. */
  almost: () => play([{ freq: 392, at: 0, duration: 0.18, type: 'sine', volume: 0.12 }, { freq: 349, at: 0.15, duration: 0.25, type: 'sine', volume: 0.1 }]),
  pop: () => play([{ freq: 520, at: 0, duration: 0.08, type: 'sine' }, { freq: 780, at: 0.03, duration: 0.07, type: 'sine', volume: 0.1 }]),
  tap: () => play([{ freq: 440, at: 0, duration: 0.06, type: 'sine', volume: 0.08 }]),
  star: () => play([523, 659, 784, 1047].map((freq, i) => ({ freq, at: i * 0.07, duration: 0.2 }))),
  fanfare: () =>
    play([
      ...[523, 659, 784].map((freq, i) => ({ freq, at: i * 0.12, duration: 0.18 })),
      { freq: 1047, at: 0.4, duration: 0.6, volume: 0.2 },
      { freq: 784, at: 0.4, duration: 0.6, volume: 0.1 },
    ]),
}
