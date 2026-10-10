import { DropZone } from '../scene/DropZone'
import { useWorldReducedMotion } from '../scene/useReducedMotion'
import { TAG_KIND, valueOfTag } from './FallbackTokens'
import { ofName } from './requestText'
import { ErrandTaskArea } from './ErrandStage'
import type { Errand } from './useErrand'

const pill = 'min-h-16 rounded-full px-6 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5'

export interface SandboxErrandPanelProps {
  errand: Errand
  /** «Encàrrec a la Botiga: la Fàtima». */
  label: string
  /** Called when the child lets the character go (answered, or «Ara no»). Nothing is lost by ignoring. */
  onClose: () => void
  /** Wording for the character's thanks, e.g. «Adéu!». */
  bye?: string
  /** Name of the character asking («La Fàtima»): their open hand takes the price tags. */
  who?: string
  className?: string
}

/**
 * The little sheet where one ambient request is played: what the character says, the task with the
 * place's own adapter (or the price tags), «Ajuda» and «Ara no». It sits over the room, so the room stays alive.
 */
export function SandboxErrandPanel({ errand, label, onClose, bye = 'Adéu!', who, className = '' }: SandboxErrandPanelProps) {
  const reduced = useWorldReducedMotion()
  const { phase, request, hintText, item, earned, hintLevel } = errand
  const text = phase === 'thanks' ? `Moltes gràcies! ${earned > 0 ? `Et dono ${earned} ${earned === 1 ? 'moneda' : 'monedes'}.` : ''}` : phase === 'shown' ? item.hints[2] : request.text
  const finish = (): void => {
    errand.next()
    onClose()
  }
  return (
    <section
      aria-label={label}
      data-errand-kind={errand.task?.adapterId ?? 'fichas'}
      className={`absolute inset-x-2 bottom-2 z-[4000] flex max-h-[66%] portrait:max-h-[80%] portrait:bottom-[88px] landscape:left-[236px] landscape:right-3 flex-col gap-2 overflow-y-auto rounded-[1.8rem] bg-white/95 p-3 shadow-[var(--world-shadow-lift)] ${reduced ? '' : 'sb-pop'} ${className}`}
    >
      <p role="status" aria-live="polite" data-testid="errand-request" className="text-lg font-bold leading-snug text-[var(--world-ink,#2b2440)] sm:text-xl">
        {text}
      </p>
      {hintText && phase === 'asking' && (
        <p data-testid="errand-hint" className="text-lg font-semibold leading-snug text-[var(--world-text-soft,#6b5f80)]">
          {hintText}
        </p>
      )}
      <div className="flex shrink-0 items-end justify-center rounded-[1.4rem] bg-[var(--world-surface-2,#ffeccd)] p-2">
        <ErrandTaskArea errand={errand} />
        {!errand.task && who && (
          <DropZone
            id="ma-veina"
            label={`la mà ${ofName(who)}`}
            accepts={(p) => p.kind === TAG_KIND && phase === 'asking'}
            onDrop={(p) => {
              const choice = item.choices.find((c) => c.value === valueOfTag(p))
              if (choice) void errand.submit(choice)
            }}
            className="p-1"
          >
            <span className="grid min-h-16 min-w-20 place-items-center rounded-2xl bg-white px-3 text-3xl shadow-[var(--world-shadow-soft)]" aria-hidden="true">
              🤲
            </span>
          </DropZone>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {phase === 'asking' && hintLevel < 2 && (
          <button type="button" onClick={errand.askHelp} className={`${pill} bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]`}>
            <span aria-hidden="true">💡 </span>Ajuda
          </button>
        )}
        {phase === 'asking' && (
          <button type="button" onClick={finish} className={`${pill} bg-white text-[var(--world-text-soft,#6b5f80)]`}>
            Ara no
          </button>
        )}
        {(phase === 'thanks' || phase === 'shown') && (
          <button type="button" onClick={finish} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
            {phase === 'thanks' ? bye : 'D’acord!'}
          </button>
        )}
      </div>
    </section>
  )
}
