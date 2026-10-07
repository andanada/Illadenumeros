/**
 * "The child's progress just changed" (answer saved, mission done, sticker, profile edit).
 * The progress store emits it; the sync scheduler listens (debounced). No imports: no cycles.
 */
type Listener = () => void

let listeners: readonly Listener[] = []

export function onProgressChanged(listener: Listener): () => void {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function emitProgressChanged(): void {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      // A listener must never break the game.
    }
  }
}
