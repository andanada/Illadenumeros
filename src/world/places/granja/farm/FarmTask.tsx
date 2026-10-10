import { useMemo } from 'react'
import { RequestCard } from '../../shared/RequestCard'
import type { Errand } from '../../../errands/useErrand'
import { useRequestTask } from '../../../sandbox/useRequestTask'
import type { PlantTask } from '../garden/plantLogic'
import { PILE_AT } from '../share/shareLayout'
import type { ShareTask } from '../share/shareLogic'
import { useShareTask } from '../share/useShareTask'
import { ROOM } from './rooms'

const check = 'min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-6 text-xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-45'

interface CardProps {
  errand: Errand
  onClose: () => void
}

/** Sow rows × columns of seeds on the plot, then «Comprova»: the seeds lying there are counted and answered. */
export function PlantCard({ errand, task, onClose }: CardProps & { task: PlantTask }) {
  const spec = useMemo(() => ({ zone: 'parcel', def: 'llavor-peticio', source: { def: 'llavor-peticio', room: ROOM.hort, at: PILE_AT }, supply: Math.min(40, task.total + 2), expected: task.total }), [task.total])
  const t = useRequestTask(errand, spec)
  return (
    <RequestCard errand={errand} placeName="la Granja" onClose={onClose} inline>
      <button type="button" className={check} disabled={t.state !== 'counting'} onClick={() => void t.submit()}>
        Comprova
      </button>
    </RequestCard>
  )
}

/** Deal the feed into the bowls (or fill the egg boxes), then «Comprova». What is left over is said: «En sobren 3». */
export function ShareCard({ errand, task, onClose }: CardProps & { task: ShareTask }) {
  const t = useShareTask(errand, task, ROOM.hort, true)
  return (
    <RequestCard errand={errand} placeName="la Granja" onClose={onClose} inline>
      <button type="button" className={check} disabled={t.state !== 'counting' || !t.reading.ready} onClick={() => void t.submit()}>
        Comprova
      </button>
      {t.state === 'counting' && !t.reading.ready && task.mode !== 'groups' && (
        <p className="m-0 text-base font-semibold text-[var(--world-text-soft,#6b5f80)]">Mira que cada bol en tingui igual.</p>
      )}
      {t.leftover && (
        <p data-testid="leftover" className="m-0 rounded-full bg-[var(--world-surface-2,#ffeccd)] px-4 py-2 text-lg font-bold text-[var(--world-ink,#2b2440)]">
          {t.leftover}
        </p>
      )}
    </RequestCard>
  )
}
