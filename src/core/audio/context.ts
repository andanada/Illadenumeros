/** The single Web Audio context shared by sound effects and voice clips. */
let context: AudioContext | undefined

export function getAudioContext(): AudioContext | undefined {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return undefined
  context ??= new AudioContext()
  return context
}

/** iPad/Safari only allow audio after a user gesture: call this on the first tap. */
export function unlockAudio(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
}
