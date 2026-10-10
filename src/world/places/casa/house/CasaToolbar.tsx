import { useState } from 'react'
import { ActorSwitcher } from '../../../sandbox/ActorSwitcher'
import type { FloorId } from './zones'

const round = 'flex min-h-16 min-w-16 cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-4 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)] outline-none active:translate-y-0.5 focus-visible:outline-4 focus-visible:outline-[var(--world-focus,#4da6ec)]'
const white = 'bg-white'
const CYCLE: readonly FloorId[] = ['baixa', 'pis', 'golfes']
const FLOOR_NAME: Readonly<Record<FloorId, string>> = { baixa: 'la planta baixa', pis: 'el primer pis', golfes: 'les golfes' }

export interface CasaToolbarProps {
  decorating: boolean
  onDecorate: () => void
  onShop: () => void
  night: boolean
  onNight: () => void
  /** The chosen character is sitting on a bed: she can go to sleep. */
  canSleep: boolean
  onSleep: () => void
  /** Tall phone: a button that brings the next floor into view. */
  floors: ((floor: FloorId) => void) | undefined
  onExit: () => void
  portrait: boolean
}

/** One round button that walks the view up the house, floor by floor, and back down. */
function FloorCycle({ go }: { go: (floor: FloorId) => void }) {
  const [at, setAt] = useState(0)
  const next = (at + 1) % CYCLE.length
  const target = CYCLE[next] ?? 'baixa'
  return (
    <button
      type="button"
      onClick={() => {
        setAt(next)
        go(target)
      }}
      aria-label={`Mira ${FLOOR_NAME[target]}`}
      className={`${round} ${white} px-3!`}
    >
      <span aria-hidden="true">🏠</span>
      <span aria-hidden="true">{next + 1}</span>
    </button>
  )
}

/** The bottom bar over the grass: who moves, decorate, day / night, the floors on a phone and the way out. */
export function CasaToolbar({ decorating, onDecorate, onShop, night, onNight, canSleep, onSleep, floors, onExit, portrait }: CasaToolbarProps) {
  const sleep = canSleep && (
    <button type="button" onClick={onSleep} className={`${round} bg-[var(--world-lila,#9a7be6)] text-white`}>
      <span aria-hidden="true">🌙</span>A dormir
    </button>
  )
  const nightButton = (
    <button type="button" onClick={onNight} aria-pressed={night} aria-label={night ? 'Fes de dia' : 'Fes de nit'} className={`${round} ${white}`}>
      <span aria-hidden="true">{night ? '☀️' : '🌙'}</span>
    </button>
  )
  const decorate = (
    <button type="button" onClick={onDecorate} aria-pressed={decorating} aria-label={decorating ? 'Fet' : 'Decora'} className={`${round} ${decorating ? 'bg-[var(--world-menta,#36c5a2)] text-white' : white}`}>
      <span aria-hidden="true">🛋️</span>
      {(!portrait || decorating) && <span aria-hidden="true">{decorating ? 'Fet' : 'Decora'}</span>}
    </button>
  )
  const shop = decorating && (
    <button type="button" onClick={onShop} aria-label="Mobles" className={`${round} bg-[var(--world-mango,#ffb834)]`}>
      <span aria-hidden="true">🛍️</span>
      {!portrait && 'Mobles'}
    </button>
  )

  if (portrait) {
    // Phones: the sound and parents' buttons of the HUD live in the bottom-right corner, so the second row stops before them.
    return (
      <div role="toolbar" aria-label="Casa" className="pointer-events-none absolute inset-x-0 bottom-0 z-[700] h-[148px] [&>*]:pointer-events-auto">
        <div className="absolute inset-x-0 bottom-[76px] h-16">
          <ActorSwitcher />
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5" style={{ right: 156 }}>
          {floors && <FloorCycle go={floors} />}
          {sleep}
          {!decorating && nightButton}
          {shop}
          {decorate}
        </div>
      </div>
    )
  }
  return (
    <div role="toolbar" aria-label="Casa" className="pointer-events-none absolute inset-x-0 bottom-0 z-[700] flex h-[76px] items-center justify-between gap-2 px-3 [&>*]:pointer-events-auto">
      <div className="relative h-16 min-w-0 flex-1">
        <ActorSwitcher />
      </div>
      <div className="flex items-center gap-2 pr-1">
        {sleep}
        {nightButton}
        {shop}
        {decorate}
        <button type="button" onClick={onExit} aria-label="Surt al carrer" className={`${round} ${white}`}>
          <span aria-hidden="true">🚪</span>
        </button>
      </div>
    </div>
  )
}
