import { useEffect, useState } from 'react'

/** Portrait phones stack the room; landscape tablets and desktops show it as one row. Pure. */
export const isPortrait = (width: number, height: number): boolean => height > width

const read = (): boolean => (typeof window === 'undefined' ? false : isPortrait(window.innerWidth, window.innerHeight))

/** Follows the screen (rotation included). */
export function useArcadePortrait(): boolean {
  const [portrait, setPortrait] = useState(read)
  useEffect(() => {
    const onResize = (): void => setPortrait(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return portrait
}
