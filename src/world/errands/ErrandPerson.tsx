import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import { Neighbour } from '../scene/art'
import { DropZone } from '../scene/DropZone'
import { useWorldReducedMotion } from '../scene/useReducedMotion'
import { CoinFlight, Sparkles } from './Celebration'
import { TAG_KIND, valueOfTag } from './FallbackTokens'
import { neighbourPose } from './neighbourMood'
import { neighbourFor, ofName } from './requestText'
import type { Errand } from './useErrand'

const ARRIVAL_MS = 1500

const pill = 'min-h-16 rounded-full px-6 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5 active:shadow-[var(--world-shadow-press)]'

/** What the neighbour says, with the hint (and its picture) when she asks for help. The tail points at their head. */
function Bubble({ errand, compact }: { errand: Errand; compact: boolean }) {
  const reduced = useWorldReducedMotion()
  const { phase, request, hintText, item, earned, hintLevel } = errand
  const text =
    phase === 'thanks' ? `Moltes gràcies! ${earned > 0 ? `Et dono ${earned} ${earned === 1 ? 'moneda' : 'monedes'}.` : ''}` : phase === 'shown' ? item.hints[2] : request.text
  const showVisual = hintLevel >= 1 && item.hintVisual.kind !== 'none' && phase !== 'thanks'
  return (
    <div className={`relative rounded-[1.6rem] bg-white px-4 py-3 shadow-[var(--world-shadow-lift)] ${compact ? 'max-w-[15rem]' : 'max-w-[20rem]'}`}>
      <span aria-hidden="true" className="absolute -left-2.5 top-7 size-6 rotate-45 rounded-[4px] bg-white" />
      <p role="status" aria-live="polite" className={`relative font-bold leading-snug text-[var(--world-ink,#2b2440)] ${compact ? 'text-lg' : 'text-xl lg:text-2xl'}`} data-testid="errand-request">
        {text}
      </p>
      {hintText && phase === 'asking' && (
        <p data-testid="errand-hint" className="relative mt-1 text-lg font-semibold leading-snug text-[var(--world-text-soft,#6b5f80)]">
          {hintText}
        </p>
      )}
      {showVisual && (
        <div aria-label="Pista" role="group" className="relative mt-2 flex justify-center rounded-[1.1rem] bg-[var(--world-surface-2,#ffeccd)] p-1.5">
          <VisualModelView model={item.hintVisual} size="sm" animate={!reduced && hintLevel === 1} />
        </div>
      )}
    </div>
  )
}

function Buttons({ errand }: { errand: Errand }) {
  const { phase, hintLevel } = errand
  return (
    <div className="flex flex-wrap items-center gap-2">
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
  )
}

export interface ErrandPersonProps {
  errand: Errand
  /** Neighbour height in px (stature 1). */
  size: number
  /** Narrow screens: smaller bubble text. */
  compact?: boolean
  /** Standing behind a counter: only this many px of them show (legs hidden, the arms and sparkles still can rise). */
  visibleHeight?: number
}

/**
 * The neighbour of this errand, standing behind the counter: walks in waving, tilts their head kindly after a
 * wrong try, cheers (sparkles, coins flying to the HUD) when served. With price tags, their hand takes them.
 */
export function ErrandPerson({ errand, size, compact = false, visibleHeight }: ErrandPersonProps) {
  const reduced = useWorldReducedMotion()
  const { phase, task, visit, tries, earned } = errand
  const { id, name } = neighbourFor(visit)
  const [arrivedVisit, setArrivedVisit] = useState<number | undefined>(undefined)
  const arriving = arrivedVisit !== visit
  const tilt = useMotionValue(0)
  const body = useRef<HTMLDivElement>(null)
  const pose = neighbourPose({ phase, arriving, handOut: !task })

  useEffect(() => {
    const timer = setTimeout(() => setArrivedVisit(visit), reduced ? 0 : ARRIVAL_MS)
    return () => clearTimeout(timer)
  }, [visit, reduced])

  // A wrong try: a kind, puzzled head tilt (never a frown).
  useEffect(() => {
    if (tries === 0 || reduced) return
    const controls = animate(tilt, [0, -9, -9, 0], { duration: 1.4, times: [0, 0.2, 0.75, 1] })
    return () => controls.stop()
  }, [tries, reduced, tilt])

  const onHand = (value: string | undefined): void => {
    const choice = errand.item.choices.find((c) => c.value === value)
    if (choice) void errand.submit(choice)
  }

  const person = (
    <motion.div
      key={visit}
      ref={body}
      initial={reduced ? false : { x: 180, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 15 }}
      className="relative"
      data-testid="errand-neighbour"
      data-pose={pose}
    >
      <motion.div style={{ rotate: tilt, transformOrigin: '50% 85%' }} className={arriving && !reduced ? 'world-hop' : undefined}>
        <Neighbour id={id} pose={pose} size={size} title={name} />
      </motion.div>
      {phase === 'thanks' && !reduced && <Sparkles key={`s-${visit}`} />}
    </motion.div>
  )

  return (
    <div className="flex items-stretch gap-2">
      <div className="shrink-0 self-end" style={visibleHeight ? { height: visibleHeight, clipPath: 'inset(-80% -80% 0 -80%)' } : undefined}>
        {task ? (
          person
        ) : (
          <DropZone id="ma-veina" label={`la mà ${ofName(name)}`} accepts={(p) => p.kind === TAG_KIND && phase === 'asking'} onDrop={(p) => onHand(valueOfTag(p))}>
            {person}
          </DropZone>
        )}
      </div>
      <div className={`flex min-w-0 flex-col items-start gap-2 self-start ${compact ? 'pt-1' : 'pt-4'}`}>
        <Bubble errand={errand} compact={compact} />
        <Buttons errand={errand} />
      </div>
      {phase === 'thanks' && !reduced && <CoinFlight key={`c-${visit}`} amount={earned} origin={body} />}
    </div>
  )
}
