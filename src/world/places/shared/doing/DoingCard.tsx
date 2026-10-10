import { ErrandTaskArea } from '../../../errands/ErrandStage'
import type { Errand } from '../../../errands/useErrand'
import { RequestCard } from '../RequestCard'

const pill = 'min-h-16 rounded-full px-6 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-50'

export interface DoingCardProps {
  errand: Errand
  placeName: string
  onClose: () => void
  /** The task is done in the room: the card only checks. Without it, the price tags are shown in the card. */
  world?: { caption: string; ready: boolean; label: string; onCheck: () => void }
}

/** The request as a docked card: the words, the help ladder, «Ara no», and «Comprova» when the work is done with the hands. */
export function DoingCard({ errand, placeName, onClose, world }: DoingCardProps) {
  const asking = errand.phase === 'asking'
  return (
    <RequestCard errand={errand} placeName={placeName} onClose={() => { errand.next(); onClose() }} inline={world !== undefined}>
      {world ? (
        <>
          {asking && (
            <p data-testid="doing-caption" className="m-0 rounded-full bg-[var(--world-surface-2,#ffeccd)] px-4 py-1 text-lg font-bold">
              {world.caption}
            </p>
          )}
          {asking && (
            <button type="button" disabled={!world.ready} onClick={world.onCheck} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
              <span aria-hidden="true">✔ </span>
              {world.label}
            </button>
          )}
        </>
      ) : (
        <ErrandTaskArea errand={errand} />
      )}
    </RequestCard>
  )
}
