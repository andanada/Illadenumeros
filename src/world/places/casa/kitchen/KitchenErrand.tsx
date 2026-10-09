import { useEffect, useState, type ReactNode } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { ErrandPerson } from '../../../errands/ErrandPerson'
import { ErrandRegion, ErrandTaskArea } from '../../../errands/ErrandStage'
import type { Errand } from '../../../errands/useErrand'
import { KitchenDoor } from './KitchenDoor'

export interface KitchenViewport {
  portrait: boolean
  /** Height in px of a stature-1 neighbour at the worktop. */
  neighbour: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Pure: the neighbour's size for a screen, so the whole errand fits above the fold. */
export function kitchenViewport(width: number, height: number): KitchenViewport {
  const portrait = height > width
  return portrait ? { portrait, neighbour: Math.round(clamp(height * 0.17, 110, 170)) } : { portrait, neighbour: Math.round(clamp(height * 0.3, 140, 260)) }
}

const read = (): KitchenViewport => (typeof window === 'undefined' ? kitchenViewport(1024, 768) : kitchenViewport(window.innerWidth, window.innerHeight))

export function useKitchenViewport(): KitchenViewport {
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const onResize = (): void => setVp(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}

const TOP = 'repeating-linear-gradient(90deg, transparent 0 58px, rgba(255,255,255,0.18) 58px 60px), linear-gradient(#FBF6EC, #EFE6D6)'

/** The kitchen island in the foreground: the bowl and the jar stand on it. */
function Worktop({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-col">
      <div className="relative z-10 rounded-t-[1.6rem] px-3 pb-3 pt-3" style={{ background: TOP, boxShadow: `inset 0 10px 0 ${P.neu.shade}` }}>
        {children}
      </div>
      <div aria-hidden="true" className="h-4" style={{ background: P.neu.shade }} />
      <div aria-hidden="true" className="h-8 sm:h-12" style={{ background: `repeating-linear-gradient(90deg, ${P.menta.base} 0 120px, ${P.menta.shade} 120px 124px)` }} />
    </div>
  )
}

/** Part of the cook hidden behind the island. */
const BEHIND = 0.24

/**
 * A neighbour comes into the kitchen to cook with her: they stand behind the island with their bubble,
 * the others wait at the door, and the recipe's bowl is on the worktop.
 */
export function KitchenErrand({ errand, pending, viewport }: { errand: Errand; pending: number; viewport: KitchenViewport }) {
  const { portrait, neighbour } = viewport
  const visible = Math.round(neighbour * 1.12 * (1 - BEHIND))
  return (
    <ErrandRegion errand={errand} placeName="la Casa" className={`absolute inset-x-0 bottom-0 z-[600] flex flex-col ${portrait ? 'top-[84px]' : 'top-[92px]'}`}>
      <div className={`relative flex min-h-0 flex-1 items-end ${portrait ? 'pl-24 pr-2' : 'pl-[min(18%,10rem)] pr-4'}`} style={{ zIndex: 610 }}>
        <KitchenDoor pending={pending} serving visit={errand.visit} className={`absolute bottom-0 left-1 ${portrait ? 'h-28' : 'h-[min(62%,15rem)]'}`} />
        <div className="relative z-10">
          <ErrandPerson errand={errand} size={neighbour} compact={portrait} visibleHeight={visible} />
        </div>
      </div>
      <div style={{ zIndex: 620 }}>
        <Worktop>
          <ErrandTaskArea errand={errand} />
        </Worktop>
      </div>
    </ErrandRegion>
  )
}
