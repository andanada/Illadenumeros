import type { ReactNode } from 'react'
import { VisualModelView } from '../../../../ui/visual/VisualModelView'
import { ErrandTaskArea } from '../../../errands/ErrandStage'
import type { Errand } from '../../../errands/useErrand'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'

const pill = 'min-h-14 rounded-full px-4 text-lg font-bold portrait:min-h-12 portrait:px-3 portrait:text-base shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-45'

export interface HandsCardProps {
  errand: Errand
  /** «la Casa», «la Perruqueria»: with who asks it names the region. */
  place: string
  /** «la iaia», «la Fatima»… */
  who: string
  /** What the hands do next, never the number. */
  caption: string | undefined
  /** «Serveix»: ready when something has been carried. */
  serve: { label: string; ready: boolean; onServe: () => void } | undefined
  onClose: () => void
  /** Where the card floats (Tailwind classes): the place keeps it off the part of the room where the work is. */
  dockClass: string
  children?: ReactNode
}

/** The family member's request as a compact card: the words, the help ladder, «Serveix» and a way out. */
export function HandsCard({ errand, place, who, caption, serve, onClose, dockClass, children }: HandsCardProps) {
  const reduced = useWorldReducedMotion()
  const { phase, request, hintText, item, earned, hintLevel } = errand
  const thanks = phase === 'thanks'
  const text = thanks ? `Moltes gràcies! ${earned > 0 ? `Et dono ${earned} ${earned === 1 ? 'moneda' : 'monedes'}.` : ''}` : phase === 'shown' ? item.hints[2] : request.text
  const visual = hintLevel >= 1 && item.hintVisual.kind !== 'none' && phase === 'asking'
  return (
    <section
      aria-label={`Encàrrec a ${place}: ${who}`}
      data-errand-kind={errand.task?.adapterId ?? 'fichas'}
            className={`absolute left-1/2 z-[950] flex max-h-[46%] w-[min(40rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col gap-1 overflow-y-auto rounded-[1.4rem] bg-white/96 p-2.5 portrait:gap-0.5 portrait:p-2 shadow-[var(--world-shadow-lift)] ${dockClass}`}
    >
      <p role="status" aria-live="polite" data-testid="errand-request" className="m-0 text-lg font-bold leading-snug text-[var(--world-ink,#2b2440)] portrait:text-base">
        {text}
      </p>
      {hintText && phase === 'asking' && (
        <p data-testid="errand-hint" className="m-0 text-base font-semibold leading-snug text-[var(--world-text-soft,#6b5f80)] portrait:text-sm">
          {hintText}
        </p>
      )}
      {visual && (
        <div role="group" aria-label="Pista" className="flex justify-center rounded-[1.1rem] bg-[var(--world-surface-2,#ffeccd)] p-1">
          <VisualModelView model={item.hintVisual} size="sm" animate={!reduced && hintLevel === 1} />
        </div>
      )}
      {caption && phase === 'asking' && (
        <p data-testid="doing-caption" className="m-0 w-fit rounded-2xl bg-[var(--world-surface-2,#ffeccd)] px-3 py-0.5 text-base font-bold portrait:text-sm">
          {caption}
        </p>
      )}
      {children}
      <div className="flex flex-wrap items-center justify-center gap-2 portrait:gap-1.5">
        {serve && phase === 'asking' && (
          <button type="button" disabled={!serve.ready} onClick={serve.onServe} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
            <span aria-hidden="true">✔ </span>
            {serve.label}
          </button>
        )}
        {phase === 'asking' && hintLevel < 2 && (
          <button type="button" onClick={errand.askHelp} className={`${pill} bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]`}>
            <span aria-hidden="true">💡 </span>Ajuda
          </button>
        )}
        {phase === 'asking' && (
          <button type="button" onClick={onClose} className={`${pill} bg-white text-[var(--world-text-soft,#6b5f80)]`}>
            Ara no
          </button>
        )}
        {(thanks || phase === 'shown') && (
          <button type="button" onClick={onClose} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
            {thanks ? 'Adéu!' : 'D’acord!'}
          </button>
        )}
      </div>
    </section>
  )
}

/** The price tags (or any other sheet task) for an item the hands cannot play. */
export const SheetTask = ({ errand }: { errand: Errand }) => (
  <div className="flex flex-wrap items-end justify-center rounded-[1.4rem] bg-[var(--world-surface-2,#ffeccd)] p-2">
    <ErrandTaskArea errand={errand} />
  </div>
)
