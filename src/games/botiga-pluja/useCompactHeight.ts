import { useSyncExternalStore } from 'react'

const QUERY = '(max-height: 900px)'

const media = (): MediaQueryList | undefined => (typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : undefined)

function subscribe(onChange: () => void): () => void {
  const list = media()
  list?.addEventListener('change', onChange)
  return () => list?.removeEventListener('change', onChange)
}

/** True on short screens (e.g. a tablet at 820 px tall): the shop tightens its vertical spacing and piece sizes. */
export function useCompactHeight(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => media()?.matches ?? false,
    () => false,
  )
}
