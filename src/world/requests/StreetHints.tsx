import { createContext, useContext } from 'react'
import type { SceneId } from '../model/types'
import { RequestBubble } from './RequestBubble'
import type { RequestKind } from './types'

export interface StreetHint {
  readonly count: number
  readonly kind: RequestKind
}

export interface StreetHintsValue {
  readonly hints: Readonly<Partial<Record<SceneId, StreetHint>>>
  /** She tapped the bubble itself: go in and let the character come. */
  readonly onTap: (place: SceneId, from: DOMRect) => void
}

const HintsContext = createContext<StreetHintsValue>({ hints: {}, onTap: () => undefined })
export const StreetHintsProvider = HintsContext.Provider

export function Hint({ place }: { place: SceneId }) {
  const { hints, onTap } = useContext(HintsContext)
  const hint = hints[place]
  if (!hint) return null
  return (
    <span className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[85%]" data-testid={`street-hint-${place}`} data-waiting={hint.count}>
      <span className="pointer-events-auto">
        <RequestBubble kind={hint.kind} count={hint.count} decorative onActivate={(el) => onTap(place, el.getBoundingClientRect())} />
      </span>
    </span>
  )
}
