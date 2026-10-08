import { AnimatePresence, motion } from 'motion/react'
import { Fragment } from 'react'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import { Neighbour } from '../scene/art'
import { DropZone } from '../scene/DropZone'
import { useWorldReducedMotion } from '../scene/useReducedMotion'
import { FallbackTokens, TAG_KIND, valueOfTag } from './FallbackTokens'
import { neighbourFor, ofName } from './requestText'
import type { Errand } from './useErrand'

export interface ErrandStageProps {
  errand: Errand
  /** "La Botiga": used in the neighbour's accessible name. */
  placeName: string
}

function Bubble({ errand }: { errand: Errand }) {
  const { phase, request, hintText, item, earned } = errand
  const text =
    phase === 'thanks' ? `Moltes gràcies! ${earned > 0 ? `Et dono ${earned} ${earned === 1 ? 'moneda' : 'monedes'}.` : ''}` : phase === 'shown' ? item.hints[2] : request.text
  return (
    <div className="relative max-w-[22rem] rounded-[1.6rem] bg-white px-4 py-3 shadow-[var(--world-shadow-lift)]">
      <p role="status" aria-live="polite" className="text-xl font-bold leading-snug text-[var(--world-ink,#2b2440)] sm:text-2xl" data-testid="errand-request">
        {text}
      </p>
      {hintText && phase === 'asking' && <p data-testid="errand-hint" className="mt-1 text-lg font-semibold leading-snug text-[var(--world-text-soft,#6b5f80)]">{hintText}</p>}
      <span aria-hidden="true" className="absolute -bottom-3 left-10 size-6 rotate-45 bg-white" />
    </div>
  )
}

const pill = 'min-h-16 rounded-full px-6 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5 active:shadow-[var(--world-shadow-press)]'

/** A neighbour at the counter: asks, shows hints in the scene, thanks with coins. Never a red cross. */
export function ErrandStage({ errand, placeName }: ErrandStageProps) {
  const reduced = useWorldReducedMotion()
  const { phase, item, task, hintLevel, visit, submit } = errand
  const locked = phase !== 'asking'
  const solution = phase === 'shown'
  const { id: neighbourId, name } = neighbourFor(visit)
  const pose = phase === 'thanks' ? 'cheer' : 'idle'

  const onHand = (value: string | undefined): void => {
    const choice = item.choices.find((c) => c.value === value)
    if (choice) void submit(choice)
  }

  return (
    <section aria-label={`Encàrrec a ${placeName}: ${name}`} className="flex w-full flex-col gap-3" data-errand-kind={task?.adapterId ?? 'fichas'}>
      <div className="flex items-end gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={visit}
            initial={reduced ? false : { x: -120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: -120, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 18 }}
            className="shrink-0"
          >
            {task ? (
              <Neighbour id={neighbourId} pose={pose} size={150} title={name} />
            ) : (
              <DropZone id="ma-veina" label={`la mà ${ofName(name)}`} accepts={(p) => p.kind === TAG_KIND && !locked} onDrop={(p) => onHand(valueOfTag(p))}>
                <Neighbour id={neighbourId} pose={phase === 'asking' ? 'hold' : pose} size={150} title={name} />
              </DropZone>
            )}
          </motion.div>
        </AnimatePresence>
        <Bubble errand={errand} />
      </div>

      {hintLevel >= 1 && item.hintVisual.kind !== 'none' && phase !== 'thanks' && (
        <div aria-label="Pista" role="group" className="self-center rounded-[1.4rem] bg-white/80 p-2">
          <VisualModelView model={item.hintVisual} size="sm" animate={!reduced && hintLevel === 1} />
        </div>
      )}

      {/* Keyed by item: every neighbour starts with a fresh basket / tray. */}
      <Fragment key={item.id}>
        {task ? (
          task.render({ item, hintLevel, wrongValues: errand.flow.wrongValues, locked, solution, tries: errand.tries, submit: (c) => void submit(c) })
        ) : (
          <FallbackTokens choices={item.choices} wrongValues={errand.flow.wrongValues} locked={locked} submit={(c) => void submit(c)} {...(solution ? { reveal: item.answer } : {})} />
        )}
      </Fragment>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {phase === 'asking' && hintLevel < 2 && (
          <button type="button" onClick={errand.askHelp} className={`${pill} bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]`}>
            <span aria-hidden="true">💡 </span>Ajuda
          </button>
        )}
        {phase === 'asking' && (
          <button type="button" onClick={errand.next} className={`${pill} bg-white text-[var(--world-text-soft,#6b5f80)]`}>
            Ara no
          </button>
        )}
        {(phase === 'thanks' || phase === 'shown') && (
          <button type="button" onClick={errand.next} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
            {phase === 'thanks' ? 'Adéu!' : 'D’acord!'}
          </button>
        )}
      </div>
    </section>
  )
}
