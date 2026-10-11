import { useMemo } from 'react'
import { worldSfx } from '../../../scene/worldSfx'
import type { Errand } from '../../../errands/useErrand'
import { DoingCard } from '../../shared/doing/DoingCard'
import { usePileTask } from '../../shared/doing/usePileTask'
import { basketCaption, basketSpec } from '../basket/basketSpec'
import { changeCaption, changeSpec } from '../change/changeSpec'
import type { BotigaMode } from '../errands/botigaMode'
import type { BasketTask } from '../errands/basketLogic'
import type { PayTask } from '../errands/payLogic'

interface CardProps {
  errand: Errand
  carrier: string | undefined
  compact: boolean
  onClose: () => void
}

/** Carry the goods from the crate into the basket (or take the extra ones out), then hand the basket over. */
function BasketCard({ errand, task, carrier, compact, onClose }: CardProps & { task: BasketTask }) {
  const item = errand.item
  const spec = useMemo(() => basketSpec(task, item, true, carrier, compact), [task, item, carrier, compact])
  const t = usePileTask(errand, spec)
  const world = { caption: basketCaption(task, t.ready), ready: t.ready, label: 'Dona la cistella', onCheck: () => void t.submit() }
  return <DoingCard errand={errand} placeName="la Botiga" onClose={onClose} world={world} />
}

/** Take coins from the till drawer into the customer's hand, then hand the change over. */
function ChangeCard({ errand, task, carrier, compact, onClose }: CardProps & { task: PayTask }) {
  const item = errand.item
  const spec = useMemo(() => changeSpec(task, item, true, carrier, compact), [task, item, carrier, compact])
  const t = usePileTask(errand, spec)
  const world = { caption: changeCaption(t.ready), ready: t.ready, label: 'Dona el canvi', onCheck: () => void t.submit() }
  return <DoingCard errand={errand} placeName="la Botiga" onClose={onClose} world={world} />
}

export interface ShopFooterProps {
  errand: Errand
  mode: BotigaMode
  open: boolean
  carrier: string | undefined
  compact: boolean
  onClose: () => void
  onExit: () => void
}

/** The foot of the screen: «Surt al carrer» and, while a request played in the shop is on, its card. */
export function ShopFooter({ errand, mode, open, carrier, compact, onClose, onExit }: ShopFooterProps) {
  return (
    <div className="flex w-full flex-wrap items-end gap-2 px-2 pb-2">
      <button
        type="button"
        onClick={() => {
          worldSfx.doorClose()
          onExit()
        }}
        className="flex min-h-16 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)] portrait:fixed portrait:bottom-3 portrait:left-3 portrait:z-[4100]"
      >
        <span aria-hidden="true">🚪</span>Surt al carrer
      </button>
      {open && mode.kind !== 'sheet' && (
        <div className="min-w-0 flex-1 basis-[22rem]">
          {mode.kind === 'basket' ? <BasketCard errand={errand} task={mode.task} carrier={carrier} compact={compact} onClose={onClose} /> : <ChangeCard errand={errand} task={mode.task} carrier={carrier} compact={compact} onClose={onClose} />}
        </div>
      )}
    </div>
  )
}
