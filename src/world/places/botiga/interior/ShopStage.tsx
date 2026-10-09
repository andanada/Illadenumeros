import type { ReactNode } from 'react'
import { ErrandPerson } from '../../../errands/ErrandPerson'
import { ErrandRegion, ErrandTaskArea } from '../../../errands/ErrandStage'
import type { Errand } from '../../../errands/useErrand'
import type { ShopState } from '../freePlay'
import { CounterBell, CounterTop, ShopCat, Till } from '../ShopCounter'
import { DoorQueue } from './DoorQueue'
import { StreetWindow } from './RoomBackdrop'
import type { ShopViewport } from './useShopViewport'

export interface ShopStageProps {
  errand: Errand
  active: boolean
  pending: number
  shop: ShopState
  onShop: (next: ShopState) => void
  /** Let the next neighbour in (bell, button). */
  onCall: () => void
  viewport: ShopViewport
  className?: string
}

/** Part of the neighbour hidden behind the counter (legs), as a fraction of their height. */
const BEHIND_COUNTER = 0.24

function Waiting({ onCall }: { onCall: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.8rem] bg-white/80 px-5 py-4 text-center shadow-[var(--world-shadow-soft)]">
      <p className="text-xl font-bold text-[var(--world-ink,#2b2440)]">No hi ha ningú al taulell.</p>
      <button
        type="button"
        onClick={onCall}
        className="min-h-16 rounded-full bg-[var(--world-coral,#ff6b5b)] px-6 text-2xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5"
      >
        <span aria-hidden="true">🔔 </span>Fes passar un veí
      </button>
    </div>
  )
}

/**
 * The back of the shop seen from the customer side: the wall with the window and the door (where the queue
 * waits), the neighbour standing behind the counter, and the counter in front with the till, the task,
 * the bell and Mixa the cat.
 */
export function ShopStage({ errand, active, pending, shop, onShop, onCall, viewport, className = '' }: ShopStageProps) {
  const { portrait, neighbour } = viewport
  const visible = Math.round(neighbour * 1.12 * (1 - BEHIND_COUNTER))

  const back: ReactNode = (
    <div className={`relative flex min-h-0 flex-1 items-end ${portrait ? 'px-2 pt-2' : 'px-4'}`}>
      <StreetWindow className={`pointer-events-none absolute ${portrait ? 'right-[24%] top-0 w-[34%] opacity-90' : 'left-[40%] top-[4%] w-[min(24%,15rem)]'}`} />
      <DoorQueue
        pending={pending}
        serving={active}
        visit={errand.visit}
        className={`absolute bottom-0 ${portrait ? 'right-1 h-32' : 'right-4 h-[min(66%,16rem)]'}`}
      />
      <div className={`relative z-10 ${portrait ? 'pr-16' : 'pr-[min(22%,10rem)]'}`}>
        {active ? (
          <ErrandPerson errand={errand} size={neighbour} compact={portrait} visibleHeight={visible} />
        ) : (
          <div className="pb-6 pl-4">
            <Waiting onCall={onCall} />
          </div>
        )}
      </div>
    </div>
  )

  const fixtures = (
    <div className={`flex items-end ${portrait ? 'gap-3' : 'flex-col-reverse gap-1'}`}>
      <ShopCat shop={shop} onChange={onShop} size={portrait ? 70 : 72} />
      <CounterBell {...(active ? {} : { onRing: onCall })} />
    </div>
  )
  const counter = portrait ? (
    <CounterTop wrap>
      {active && (
        <div className="w-full">
          <ErrandTaskArea errand={errand} />
        </div>
      )}
      <Till shop={shop} onChange={onShop} />
      {fixtures}
    </CounterTop>
  ) : (
    <CounterTop>
      <Till shop={shop} onChange={onShop} />
      {active ? (
        <div className="min-w-0 flex-1">
          <ErrandTaskArea errand={errand} />
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {fixtures}
    </CounterTop>
  )

  const body = (
    <>
      {back}
      {counter}
    </>
  )
  const frame = `flex flex-col ${className}`
  return active ? (
    <ErrandRegion errand={errand} placeName="la Botiga" className={frame}>
      {body}
    </ErrandRegion>
  ) : (
    <div className={frame}>{body}</div>
  )
}
