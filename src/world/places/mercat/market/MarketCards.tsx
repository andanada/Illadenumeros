import { useMemo } from 'react'
import { VisualModelView } from '../../../../ui/visual/VisualModelView'
import { ErrandTaskArea } from '../../../errands/ErrandStage'
import type { Errand } from '../../../errands/useErrand'
import { useRequestTask } from '../../../sandbox/useRequestTask'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { RequestCard } from '../../shared/RequestCard'
import type { ScaleTask, TrayTask } from './priceLogic'
import { PILE_AT, ROOM } from './rooms'
import { useTrayTask } from './useTrayTask'

const check = 'min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-6 text-xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-45'

interface CardProps {
  errand: Errand
  onClose: () => void
}

/** Bags of a tenth of a kilo on the big scale until it reads the weight asked; then she answers how many. */
export function ScaleCard({ errand, task, onClose }: CardProps & { task: ScaleTask }) {
  const spec = useMemo(() => ({ zone: 'bascula-peticio', def: 'bossa', source: { def: 'bossa', room: ROOM, at: PILE_AT }, supply: Math.min(40, task.tenths + 2), expected: task.tenths }), [task.tenths])
  const t = useRequestTask(errand, spec)
  return (
    <RequestCard errand={errand} placeName="el Mercat" onClose={onClose} inline>
      <button type="button" className={check} disabled={t.state !== 'counting'} onClick={() => void t.submit()}>
        Comprova
      </button>
    </RequestCard>
  )
}

/** Coins and notes on the cashier tray: pay the total, the change or the new price. */
export function TrayCard({ errand, task, onClose }: CardProps & { task: TrayTask }) {
  const t = useTrayTask(errand, task, true)
  return (
    <RequestCard errand={errand} placeName="el Mercat" onClose={onClose} inline>
      <button type="button" className={check} disabled={t.state !== 'counting'} onClick={() => void t.submit()}>
        Cobra
      </button>
    </RequestCard>
  )
}

/** Items with no world version (hundredths, comparing, ×, order, multiples, fractions…): the picture and the price tags. */
export function MarketSheet({ errand, onClose }: CardProps) {
  const reduced = useWorldReducedMotion()
  const { item, phase } = errand
  const showVisual = item.visual.kind !== 'none'
  return (
    <div className="absolute inset-x-2 bottom-2 z-[4000] max-h-[72%] overflow-y-auto rounded-[1.8rem] landscape:left-[236px] portrait:bottom-[88px]">
      <RequestCard errand={errand} placeName="el Mercat" onClose={onClose}>
        {showVisual && phase !== 'thanks' && (
          <div role="group" aria-label="Dibuix" className="flex justify-center rounded-[1.1rem] bg-[var(--world-surface-2,#ffeccd)] p-1.5">
            <VisualModelView model={item.visual} size="sm" animate={!reduced} />
          </div>
        )}
        <div className="flex items-end justify-center rounded-[1.4rem] bg-[var(--world-surface-2,#ffeccd)] p-2">
          <ErrandTaskArea errand={errand} />
        </div>
      </RequestCard>
    </div>
  )
}
