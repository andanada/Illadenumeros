import { useEffect, useState } from 'react'

/** Narrower than this a pile and its target zone cannot sit side by side with 64 px touch targets: they go one above the other. */
export const COMPACT_BELOW_PX = 900

/** True on a narrow screen (a phone, or a tall tablet): the stage is as wide as the window in every place. */
export function useCompactStage(): boolean {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < COMPACT_BELOW_PX)
  useEffect(() => {
    const onResize = (): void => setCompact(window.innerWidth < COMPACT_BELOW_PX)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return compact
}
