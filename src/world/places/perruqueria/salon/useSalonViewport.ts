import { useEffect, useState } from 'react'

export interface SalonViewport {
  portrait: boolean
  /** Height in px of a stature-1 customer. */
  customer: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Pure: the customer's size for a screen, so the errand always fits above the fold. */
export function salonViewport(width: number, height: number): SalonViewport {
  const portrait = height > width
  return portrait ? { portrait, customer: Math.round(clamp(height * 0.17, 110, 170)) } : { portrait, customer: Math.round(clamp(height * 0.32, 150, 270)) }
}

const read = (): SalonViewport => (typeof window === 'undefined' ? salonViewport(1024, 768) : salonViewport(window.innerWidth, window.innerHeight))

export function useSalonViewport(): SalonViewport {
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const onResize = (): void => setVp(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}
