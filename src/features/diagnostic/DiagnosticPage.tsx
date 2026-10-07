import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { matesAmbit } from '../../ambits/mates'
import { DIAGNOSTIC_ANCHORS } from '../../ambits/mates/skills'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { currentAnchor, placementFrom, recordDiagnostic, startDiagnostic, type DiagnosticState } from '../../core/engine/diagnostic'
import type { Choice } from '../../core/ambit/types'
import { useProgress } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Confetti } from '../../ui/Confetti'
import { MuteToggle, Screen, SpeakerButton } from '../../ui/Screen'
import { Mascot } from '../../ui/mascot/Mascot'
import { ChoiceBubble } from '../../ui/question/ChoiceBubble'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import type { CharacterId } from '../../core/storage/db'
import { useQuestionFlow } from '../play/useQuestionFlow'
import { diagnosticAnswer, stripSteps } from './diagnosticLogic'

const STEP_MS = 800
const REDIRECT_MS = 4500

function ExpeditionStrip({ state }: { state: DiagnosticState }) {
  const steps = stripSteps(state)
  return (
    <ol className="flex items-center gap-3" aria-label="Progrés de l’expedició">
      {steps.map((s, i) => (
        <li key={s.anchor} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`sticker grid size-12 place-items-center rounded-full text-2xl ${
              s.status === 'done' ? 'bg-sol' : s.status === 'current' ? 'bg-chicle' : 'bg-white opacity-60'
            }`}
          >
            {s.status === 'done' ? '⭐' : s.status === 'current' ? '🧭' : '🏝️'}
          </span>
          {i < steps.length - 1 && <span aria-hidden="true" className="h-1 w-5 rounded border-t-4 border-dotted border-brand/40" />}
        </li>
      ))}
    </ol>
  )
}

function Celebration({ character, onGo }: { character: CharacterId; onGo: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Confetti count={60} emoji />
      <Mascot character={character} mood="balla" size={180} />
      <motion.h2 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-bold text-brand-dark">
        Hem descobert l’illa!
      </motion.h2>
      <Button big onClick={onGo}>Veure el mapa</Button>
    </div>
  )
}

/** Milliseconds since a `performance.now()` reading; called from handlers only. */
const elapsedSince = (start: number): number => performance.now() - start

function useCharacter() {
  return useProgress((s) => s.profile?.character) ?? 'mixa'
}

/** "L'Expedició del Mapa": placement test dressed as a treasure expedition. No score, no wrong feedback. */
export default function DiagnosticPage() {
  const navigate = useNavigate()
  const character = useCharacter()
  const finishDiagnostic = useProgress((s) => s.finishDiagnostic)
  const [diag, setDiag] = useState<DiagnosticState>(() => startDiagnostic([...DIAGNOSTIC_ANCHORS]))
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const [tick, setTick] = useState(0)
  const [finished, setFinished] = useState(false)
  const busy = useRef(false)
  const shownAt = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const anchor = currentAnchor(diag) ?? DIAGNOSTIC_ANCHORS[0]
  const forced = useMemo(() => ({ skillId: anchor }), [anchor])
  const flow = useQuestionFlow({ gameId: 'repte-illa', forced })
  const { item, next: nextItem } = flow

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Runs after the render that already carries the new anchor, so the next item targets it.
  const handledTick = useRef(0)
  useEffect(() => {
    if (tick === handledTick.current) return
    handledTick.current = tick
    nextItem()
    setPicked(undefined)
  }, [tick, nextItem])

  useEffect(() => {
    shownAt.current = performance.now()
    speak(item.speech)
  }, [item.id, item.speech])

  const finish = async (state: DiagnosticState) => {
    await finishDiagnostic(placementFrom(state, matesAmbit.skills))
    sfx.fanfare()
    setFinished(true)
    timers.current.push(setTimeout(() => navigate('/map'), REDIRECT_MS))
  }

  const pick = async (choice: Choice) => {
    if (busy.current || picked !== undefined) return
    busy.current = true
    unlockAudio()
    try {
      const rt = elapsedSince(shownAt.current)
      setPicked(choice.value)
      const result = await flow.answer(choice, rt)
      const next = recordDiagnostic(diag, diagnosticAnswer({ correct: result.correct, rtMs: rt, fluencyTargetMs: flow.skill.fluencyTargetMs }))
      sfx.star()
      setDiag(next)
      if (next.done) {
        await finish(next)
      } else {
        timers.current.push(setTimeout(() => setTick((t) => t + 1), STEP_MS))
      }
    } catch {
      // Storage problems must not trap the child: let her answer again.
      setPicked(undefined)
    } finally {
      busy.current = false
    }
  }

  if (finished) {
    return (
      <Screen title="L’Expedició del Mapa">
        <Celebration character={character} onGo={() => navigate('/map')} />
      </Screen>
    )
  }

  return (
    <Screen title="L’Expedició del Mapa" right={<MuteToggle />}>
      <div className="flex flex-col items-center gap-4 px-4 pb-3">
        <ExpeditionStrip state={diag} />
        <p className="text-xl font-bold text-brand-dark">Anem a descobrir l’illa!</p>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-3 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <h2 className="text-center text-5xl font-bold tracking-tight text-brand-dark sm:text-6xl">{item.text}</h2>
          <SpeakerButton text={item.speech} label="Escoltar la pregunta" />
        </div>
        {item.visual.kind !== 'none' && (
          <div className="rounded-[2rem] bg-white/60 p-3">
            <VisualModelView key={item.id} model={item.visual} size="md" />
          </div>
        )}
        <div role="group" aria-label="Respostes" className="flex flex-wrap items-center justify-center gap-5">
          {item.choices.map((choice, i) => (
            <ChoiceBubble
              key={`${item.id}:${choice.value}`}
              value={choice.value}
              index={i}
              state={picked === undefined || picked === choice.value ? 'idle' : 'dimmed'}
              shaking={false}
              disabled={picked !== undefined}
              onPick={() => void pick(choice)}
            />
          ))}
        </div>
        {picked !== undefined && (
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-almost" aria-live="polite">
            ⭐ Un pas d’exploració!
          </motion.p>
        )}
      </div>
    </Screen>
  )
}
