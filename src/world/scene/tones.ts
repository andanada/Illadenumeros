import { getAudioContext } from '../../core/audio/context'
import { isMuted } from '../../core/audio/speech'

/** One synthesised note: it can glide (`to`) and start `at` seconds after the call. */
export interface Tone {
  freq: number
  to?: number
  at?: number
  duration: number
  type?: OscillatorType
  volume?: number
}

/** Plays notes on the app's single Web Audio context, respecting its mute switch. Places build their sounds on this. */
export function playTones(list: readonly Tone[], defaultVolume = 0.1): void {
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
    gain.gain.exponentialRampToValueAtTime(tone.volume ?? defaultVolume, at + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + tone.duration + 0.05)
  }
}
