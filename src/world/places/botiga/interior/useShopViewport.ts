import { useEffect, useState } from 'react'

export interface ShopViewport {
  portrait: boolean
  /** Height in px of a stature-1 neighbour at the counter. */
  neighbour: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Pure: neighbour size for a screen, so the errand always fits above the fold. */
export function shopViewport(width: number, height: number): ShopViewport {
  const portrait = height > width
  return portrait ? { portrait, neighbour: Math.round(clamp(height * 0.2, 120, 190)) } : { portrait, neighbour: Math.round(clamp(height * 0.36, 150, 300)) }
}

const read = (): ShopViewport => (typeof window === 'undefined' ? shopViewport(1024, 768) : shopViewport(window.innerWidth, window.innerHeight))

/** The shop's layout follows the screen (rotation included). */
export function useShopViewport(): ShopViewport {
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const onResize = (): void => setVp(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}
