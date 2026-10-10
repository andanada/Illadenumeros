import { useMemo } from 'react'
import { worldSfx } from '../../scene/worldSfx'
import type { Errand } from '../../errands/useErrand'
import { useRequestTask } from '../../sandbox/useRequestTask'
import { DoingCard } from '../shared/doing/DoingCard'
import { useShareTask } from '../shared/doing/useShareTask'
import { useZoneSweep } from '../shared/doing/useZoneSweep'
import { useZoneTransform } from '../shared/doing/useZoneTransform'
import { BAKE_RULES } from './bake/products'
import { PILE_AT, ROOM } from './shop/rooms'
import { TRAY, trayId } from './shop/zones'
import type { FlecaPlay } from './tasks/flecaTasks'

export interface FlecaFooterProps {
  errand: Errand
  play: FlecaPlay
  open: boolean
  carrier: string | undefined
  onClose: () => void
  onExit: () => void
}

const NO_ZONES: readonly string[] = []

/**
 * The foot of the screen: «Surt al carrer» and, while a request is on, the card. It also runs the hands-on task
 * (rows on the tray, or sharing onto trays), the oven and the sweep that tidies the frames when a request ends.
 */
export function FlecaFooter({ errand, play, open, carrier, onClose, onExit }: FlecaFooterProps) {
  useZoneTransform(BAKE_RULES)
  const mode = play?.mode
  const array = open && mode?.kind === 'array' ? mode : undefined
  const share = open && mode?.kind === 'share' ? mode : undefined
  const product = play?.product.id ?? 'magdalena'
  const source = useMemo(() => ({ def: product, room: ROOM.shop, at: PILE_AT }), [product])
  const arraySpec = useMemo(
    () => ({ zone: TRAY, def: product, source, active: array !== undefined, ...(array ? { expected: array.rows * array.cols, supply: Math.min(40, array.rows * array.cols + 2) } : {}), ...(carrier ? { giveTo: carrier } : {}) }),
    [product, source, array, carrier],
  )
  const rows = useRequestTask(errand, arraySpec)
  const zones = useMemo(() => (share ? Array.from({ length: share.task.groups }, (_, n) => trayId(n)) : NO_ZONES), [share])
  const shareSpec = useMemo(() => ({ task: share?.task ?? { total: 1, groups: 2, ask: 'quotient' as const }, zones: zones.length > 0 ? zones : [trayId(0), trayId(1)], source, active: share !== undefined, ...(carrier ? { giveTo: carrier } : {}) }), [share, zones, source, carrier])
  const dealt = useShareTask(errand, shareSpec)
  useZoneSweep(useMemo(() => [TRAY, ...Array.from({ length: 10 }, (_, n) => trayId(n))], []), open)

  const world = array
    ? { caption: rows.state === 'empty' ? 'Agafa de la pila i posa-ho a la safata.' : 'Quan estigui a punt, prem Comprova.', ready: rows.state === 'counting', label: 'Comprova', onCheck: () => void rows.submit() }
    : share
      ? { caption: dealt.caption, ready: dealt.ready, label: 'Comprova', onCheck: () => void dealt.submit() }
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
          <DoingCard errand={errand} placeName="la Fleca" onClose={onClose} {...(world ? { world } : {})} />
        </div>
      )}
    </div>
  )
}

