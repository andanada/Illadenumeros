import { hasClipSync, loadClipManifest, playClip, stopClip } from './clips'
import { normalizeSpeech } from './normalize'

/**
 * Catalan speech. First choice: a pre-generated Azure clip (`clips.ts`, plays offline once heard);
 * fallback: the device's Catalan voice through the Web Speech API. The text is always shown on screen.
 */
const DEVICE_RATE = 0.95
let catalanVoice: SpeechSynthesisVoice | undefined
let voicesReady = false

function pickVoice(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return
  voicesReady = true
  catalanVoice =
    voices.find((v) => v.lang.toLowerCase() === 'ca-es') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('ca'))
}

export function initSpeech(): void {
  void loadClipManifest()
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  pickVoice()
  window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export function hasCatalanVoice(): boolean {
  if (!voicesReady) pickVoice()
  return catalanVoice !== undefined
}

function speakWithDevice(text: string, rate: number): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted()) return
  if (!voicesReady) pickVoice()
  // Without a Catalan voice we stay silent rather than reading Catalan with a foreign accent.
  if (!catalanVoice) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(normalizeSpeech(text))
  utterance.voice = catalanVoice
  utterance.lang = catalanVoice.lang
  utterance.rate = rate
  utterance.pitch = 1.1
  window.speechSynthesis.speak(utterance)
}

/**
 * Reads `text` aloud, cancelling whatever was being said. Clips are recorded at one fixed pace, so `rate` only
 * applies to the device-voice fallback.
 */
export function speak(text: string, options: { rate?: number } = {}): void {
  if (typeof window === 'undefined' || isMuted()) return
  stopSpeaking()
  const rate = options.rate ?? DEVICE_RATE
  // Manifest already known and no clip for this text: speak synchronously, still inside the user gesture.
  if (hasClipSync(text) === false) return speakWithDevice(text, rate)
  void playClip(text).then((result) => {
    if (result === 'unavailable') speakWithDevice(text, rate)
  })
}

export function stopSpeaking(): void {
  stopClip()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

const MUTE_KEY = 'mm-muted'

export function isMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // Storage can be unavailable (private mode); muting just won't persist.
  }
  if (muted) stopSpeaking()
}
