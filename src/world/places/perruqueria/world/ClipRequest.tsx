import { useEffect, useMemo } from 'react'
import type { Errand } from '../../../errands/useErrand'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { HandsCard, SheetTask } from '../../shared/hands/HandsCard'
import type { Px } from '../../shared/hands/pileLayout'
import { usePreplaced, type Preplaced } from '../../shared/hands/usePreplaced'
import { useSpreadPile } from '../../shared/hands/useSpreadPile'
import { useZonesTask } from '../../shared/hands/useZonesTask'
import { ROOM } from '../salon/layout'
import { useCompactStage } from '../../shared/doing/useCompactStage'
import { clipPileArea } from './clipLayout'
import { clipCaption, CLIP, SIDES, WORN, zoneIdOf, type ClipPlay } from './clipTask'

export interface ClipRequestProps {
  errand: Errand
  /** undefined: the clips cannot play this item and the price tags do. */
  play: ClipPlay | undefined
  open: boolean
  /** Who asks (the actor that carries the bubble) and how to say her name. */
  carrier: string | undefined
  who: string
  stage: Px
  onClose: () => void
}

const ZONES = SIDES.map(zoneIdOf)
const NO_PRE: readonly Preplaced[] = []

/**
 * A customer's clips done on her head: the box lies at the left, she carries clips onto the two sides of the head
 * («ja porto 4 i en vull 8»: four are already there), then looks at the mirror with «Ja està!». Items the clips cannot
 * play use the price tags in the same card.
 */
export function ClipRequest({ errand, play, open, carrier, who, stage, onClose }: ClipRequestProps) {
  const cast = useCast()
  const compact = useCompactStage()
  const area = clipPileArea(compact)
  const source = useMemo(() => ({ def: CLIP, room: ROOM, at: { x: (area.x0 + area.x1) / 2, y: (area.y0 + area.y1) / 2 } }), [area])
  const { dropHeld } = useItems()
  // Whatever she carried is put down when the request opens: her hands are free for the box of clips.
  useEffect(() => {
    if (open && cast.state.selected === 'laia' && cast.state.actors['laia']?.carrying) dropHeld()
    // Only at the moment the request opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const ready = useItems((api) => ZONES.every((z) => api.zones[z] !== undefined)) && open && play !== undefined
  const spec = useMemo(() => ({ zones: ZONES, def: CLIP, source, expected: play?.expected ?? 0, supply: Math.min(40, (play?.expected ?? 0) + 2), active: ready, ...(carrier ? { giveTo: carrier } : {}) }), [play?.expected, ready, carrier, source])
  const run = useZonesTask(errand, spec)
  const worn = useMemo<readonly Preplaced[]>(() => (play ? [...Array.from({ length: play.worn.left }, () => ({ zone: zoneIdOf('esq'), def: WORN })), ...Array.from({ length: play.worn.right }, () => ({ zone: zoneIdOf('dre'), def: WORN }))] : NO_PRE), [play])
  usePreplaced(worn, ready, `${errand.item.id}|${worn.length}`)
  useSpreadPile({ def: CLIP, room: ROOM, area, stage, active: ready, refresh: `${errand.item.id}|${errand.tries}|${errand.phase}|${play?.expected ?? ''}` })
  if (!open) return null
  const leave = (): void => {
    if (errand.phase === 'thanks' || errand.phase === 'shown') errand.next()
    onClose()
  }
  return (
    <HandsCard
      errand={errand}
      place="la Perruqueria"
      who={who}
      caption={play ? clipCaption(play, run.count) : undefined}
      serve={play ? { label: 'Ja està!', ready: run.state === 'counting', onServe: () => void run.submit() } : undefined}
      onClose={() => (errand.phase === 'asking' ? onClose() : leave())}
      dockClass="top-[96px] landscape:top-auto landscape:bottom-3 landscape:left-auto landscape:right-3 landscape:translate-x-0 landscape:w-[min(26rem,40%)]"
    >
      {!play && <SheetTask errand={errand} />}
    </HandsCard>
  )
}
