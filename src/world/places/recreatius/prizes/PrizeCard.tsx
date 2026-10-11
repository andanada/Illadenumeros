import { useMemo } from 'react'
import type { Errand } from '../../../errands/useErrand'
import { DoingCard } from '../../shared/doing/DoingCard'
import { usePileTask } from '../../shared/doing/usePileTask'
import type { PrizeTask } from './prizeLogic'
import { prizeCaption, prizeSpec } from './prizeSpec'

export interface PrizeCardProps {
  errand: Errand
  task: PrizeTask
  /** The clerk the toys are handed to when the count is right. */
  clerk: string
  compact: boolean
  onClose: () => void
}

/** The clerk's prize count: carry the toys from the counter shelf onto the tray (or take some out), then hand the tray over. */
export function PrizeCard({ errand, task, clerk, compact, onClose }: PrizeCardProps) {
  const item = errand.item
  const spec = useMemo(() => prizeSpec(task, item, true, clerk, compact), [task, item, clerk, compact])
  const t = usePileTask(errand, spec)
  const world = { caption: prizeCaption(task, t.ready), ready: t.ready, label: 'Dona la safata', onCheck: () => void t.submit() }
  return <DoingCard errand={errand} placeName="els Recreatius" onClose={onClose} world={world} />
}
