import type { ReactNode } from 'react'
import { VisualModelView } from '../../../ui/visual/VisualModelView'
import { ErrandRegion } from '../../errands/ErrandStage'
import type { Errand } from '../../errands/useErrand'
import { useWorldReducedMotion } from '../../scene/useReducedMotion'

const pill = 'min-h-16 rounded-full px-5 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5'

export interface RequestCardProps {
  errand: Errand
  placeName: string
  /** The thing she does with her hands, below the words (a task, or the button that hands over her answer). */
  children?: ReactNode
  /** She is done (thanks) or lets it go («Ara no»): the card closes. */
  onClose: () => void
  /** The action sits in the same row as the help buttons (a single big button), not above them. */
  inline?: boolean
  className?: string
}

/**
 * What a character needs, in words, with the help ladder and a way out. Docked under the scene so the room
 * stays playable; ignoring it is always fine («Ara no»). Never a red cross, never a score.
 */
export function RequestCard({ errand, placeName, children, onClose, inline = false, className = '' }: RequestCardProps) {
  const reduced = useWorldReducedMotion()
  const { phase, request, hintText, item, earned, hintLevel } = errand
  const text = phase === 'thanks' ? `Moltes gràcies! ${earned > 0 ? `Et dono ${earned} ${earned === 1 ? 'moneda' : 'monedes'}.` : ''}` : phase === 'shown' ? item.hints[2] : request.text
  const visual = hintLevel >= 1 && item.hintVisual.kind !== 'none' && phase === 'asking'
  return (
    <ErrandRegion errand={errand} placeName={placeName} className={`mx-auto flex w-full max-w-[56rem] flex-col gap-2 rounded-[1.6rem] bg-white/95 p-3 shadow-[var(--world-shadow-lift)] ${className}`}>
      <p role="status" aria-live="polite" data-testid="errand-request" className="text-lg font-bold leading-snug text-[var(--world-ink,#2b2440)] sm:text-xl">
        {text}
      </p>
      {hintText && phase === 'asking' && (
        <p data-testid="errand-hint" className="text-base font-semibold leading-snug text-[var(--world-text-soft,#6b5f80)] sm:text-lg">
          {hintText}
        </p>
      )}
      {visual && (
        <div role="group" aria-label="Pista" className="flex justify-center rounded-[1.1rem] bg-[var(--world-surface-2,#ffeccd)] p-1.5">
          <VisualModelView model={item.hintVisual} size="sm" animate={!reduced && hintLevel === 1} />
        </div>
      )}
      {inline ? null : children}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {inline ? children : null}
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
        {(phase === 'thanks' || phase === 'shown') && (
          <button type="button" onClick={onClose} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
            {phase === 'thanks' ? 'Adéu!' : 'D’acord!'}
          </button>
        )}
      </div>
    </ErrandRegion>
  )
}
