import { useEffect, useRef, useState } from 'react'
import { watchSize } from '../../../scene/street/useStreetPan'
import type { StageBox } from './arrayLayout'

/** The size in px of an element (the stage's wrapper), so frames can be laid out to fit it. */
export function useBox(): readonly [React.RefObject<HTMLDivElement | null>, StageBox] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState<StageBox>({ w: 900, h: 520 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = (): void => setBox((b) => (b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth || 900, h: el.clientHeight || 520 }))
    measure()
    return watchSize(el, measure)
  }, [])
  return [ref, box]
}
