import { useMemo } from 'react'
import type { Errand } from '../../errands/useErrand'
import { worldSfx } from '../../scene/worldSfx'
import { DoingCard } from '../shared/doing/DoingCard'
import { useShareTask } from '../shared/doing/useShareTask'
import { useZoneSweep } from '../shared/doing/useZoneSweep'
import { useZoneTransform } from '../shared/doing/useZoneTransform'
import { PIZZA_RULES } from './pizza/pizzaRules'
import { useCutTask } from './pizza/useCutTask'
import { useSlicer } from './pizza/useSlicer'
import { PILE_AT, ROOM } from './shop/rooms'
import { PLATE, plateId } from './shop/zones'
import type { PizzeriaPlay } from './tasks/pizzeriaTasks'

export interface PizzeriaFooterProps {
  errand: Errand
  play: PizzeriaPlay
  open: boolean
  carrier: string | undefined
  onClose: () => void
  onExit: () => void
}

const SOURCE = { def: 'tros', room: ROOM.dining, at: PILE_AT } as const
const PLATES = Array.from({ length: 10 }, (_, n) => plateId(n))

/**
 * The foot of the screen: «Surt al carrer» and, while a request is on, the card. It also runs the oven and the
 * slicer, the hands-on task (plates to deal onto, or a pizza to cut) and the sweep that tidies the plates afterwards.
 */
export function PizzeriaFooter({ errand, play, open, carrier, onClose, onExit }: PizzeriaFooterProps) {
  useZoneTransform(PIZZA_RULES)
  useSlicer()
  const mode = play?.mode
  const share = open && mode?.kind === 'share' ? mode : undefined
  const cut = open && mode?.kind === 'cut' ? mode : undefined
  const zones = useMemo(() => PLATES.slice(0, share?.task.groups ?? 2), [share])
  const shareSpec = useMemo(
    () => ({ task: share?.task ?? { total: 1, groups: 2, ask: 'quotient' as const }, zones, source: SOURCE, active: share !== undefined, ...(carrier ? { giveTo: carrier } : {}) }),
    [share, zones, carrier],
  )
  const dealt = useShareTask(errand, shareSpec)
  const cutting = useCutTask(errand, { active: cut !== undefined, parts: cut?.parts ?? 2, selected: cut?.selected ?? 1, ...(carrier ? { giveTo: carrier } : {}) })
  useZoneSweep(useMemo(() => [PLATE, ...PLATES], []), open)

  const world = share
    ? { caption: dealt.caption, ready: dealt.ready, label: 'Comprova', onCheck: () => void dealt.submit() }
    : cut
      ? { caption: cutting.caption, ready: cutting.ready, label: 'Comprova', onCheck: () => void cutting.submit() }
      : undefined

  return (
    <div className="flex w-full flex-wrap items-end gap-2 px-2 pb-2">
      <button
        type="button"
        onClick={() => {
          worldSfx.doorClose()
          onExit()
        }}
        className="flex min-h-16 shrink-0 items-center gap-2 rounded-full bg-white px-5 portrait:fixed portrait:bottom-3 portrait:left-3 portrait:z-[4100] text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]"
      >
        <span aria-hidden="true">🚪</span>Surt al carrer
      </button>
      {open && (
        <div className="min-w-0 flex-1 basis-[22rem]">
          <DoingCard errand={errand} placeName="la Pizzeria" onClose={onClose} {...(world ? { world } : {})} />
        </div>
      )}
    </div>
  )
}
