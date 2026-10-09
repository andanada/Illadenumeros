import { useEffect, useState } from 'react'

export interface BusViewport {
  portrait: boolean
  /** Height in px of the neighbour who asks (stature 1). */
  neighbour: number
  /** Height in px of a passenger waiting at the stop. */
  passenger: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Pure: sizes for a screen so the errand (neighbour, bus and its buttons) fits above the fold. */
export function busViewport(width: number, height: number): BusViewport {
  const portrait = height > width
  if (portrait)
    return { portrait, neighbour: Math.round(clamp(height * 0.16, 110, 160)), passenger: Math.round(clamp(width * 0.2, 64, 110)) }
  return { portrait, neighbour: Math.round(clamp(height * 0.3, 140, 260)), passenger: Math.round(clamp(height * 0.17, 90, 170)) }
}

const read = (): BusViewport =>
  typeof window === 'undefined' ? busViewport(1024, 768) : busViewport(window.innerWidth, window.innerHeight)

/** The bus layout follows the screen (rotation included). */
export function useBusViewport(): BusViewport {
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const onResize = (): void => setVp(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}
