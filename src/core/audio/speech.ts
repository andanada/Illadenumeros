/**
 * Catalan text-to-speech through the Web Speech API.
 * Pre-generated clips (Azure) can be plugged in later; the text is always shown on screen.
 */
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
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  pickVoice()
  window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export function hasCatalanVoice(): boolean {
  if (!voicesReady) pickVoice()
  return catalanVoice !== undefined
}

export function speak(text: string, options: { rate?: number } = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted()) return
  if (!voicesReady) pickVoice()
  // Without a Catalan voice we stay silent rather than reading Catalan with a foreign accent.
  if (!catalanVoice) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text.replace(/−/g, ' menys ').replace(/×/g, ' per '))
  utterance.voice = catalanVoice
  utterance.lang = catalanVoice.lang
  utterance.rate = options.rate ?? 0.95
  utterance.pitch = 1.1
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
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
