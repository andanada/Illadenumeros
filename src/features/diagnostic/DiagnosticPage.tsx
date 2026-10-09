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
import { Confetti } from '../../ui/Confetti'
import { MuteToggle, SpeakerButton } from '../../ui/Screen'
import { ChoiceBubble } from '../../ui/question/ChoiceBubble'
import { VisualModelView } from '../../ui/visual/VisualModelView'
import { NEIGHBOURS } from '../../world/characters/neighbours'
import { Avatar, Grain, Neighbour } from '../../world/scene/art'
import { useWorld } from '../../world/data'
import type { AvatarSpec } from '../../world/model/types'
import { useQuestionFlow } from '../play/useQuestionFlow'
import { diagnosticAnswer, stripSteps } from './diagnosticLogic'

const STEP_MS = 800
const REDIRECT_MS = 4500

function ErrandsStrip({ state }: { state: DiagnosticState }) {
  const steps = stripSteps(state)
  return (
    <ol className="flex items-center gap-1 sm:gap-2" aria-label="Progrés dels primers encàrrecs">
      {steps.map((s) => (
        <li key={s.anchor} aria-hidden="true" className={`grid size-6 place-items-center rounded-full text-sm font-bold sm:size-9 sm:text-lg shadow-[var(--world-shadow-soft)] ${s.status === 'done' ? 'bg-[var(--world-menta)] text-white' : s.status === 'current' ? 'bg-[var(--world-mango)]' : 'bg-white/70'}`}>
          {s.status === 'done' ? '✓' : ''}
        </li>
      ))}
    </ol>
  )
}

function Celebration({ avatar, onGo }: { avatar: AvatarSpec; onGo: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Confetti count={60} emoji />
      <Avatar spec={avatar} pose="cheer" size={220} />
      <motion.h2 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-bold text-[var(--world-ink)] sm:text-5xl">
        Ja coneixes el poble!
      </motion.h2>
      <button type="button" onClick={onGo} className="min-h-20 rounded-full bg-[var(--world-coral)] px-10 text-3xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5">
        Surt al carrer
      </button>
    </div>
  )
}

/** Milliseconds since a `performance.now()` reading; called from handlers only. */
const elapsedSince = (start: number): number => performance.now() - start


/** «Els primers encàrrecs»: the placement test as the neighbours' requests on her arrival day. No score, no wrong feedback. */
export default function DiagnosticPage() {
  const navigate = useNavigate()
  const avatar = useWorld().avatar
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
    timers.current.push(setTimeout(() => navigate('/poble'), REDIRECT_MS))
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

  const neighbour = NEIGHBOURS[(diag.index + 1) % NEIGHBOURS.length]

  if (finished) {
    return (
      <div data-world="dia" className="flex min-h-dvh flex-col font-display" style={{ background: 'linear-gradient(var(--world-sky-top), var(--world-sky-bottom))' }}>
        <h1 className="sr-only">Els primers encàrrecs</h1>
        <Celebration avatar={avatar} onGo={() => navigate('/poble')} />
      </div>
    )
  }

  return (
    <div data-world="dia" className="relative flex min-h-dvh flex-col overflow-x-hidden font-display" style={{ background: 'linear-gradient(var(--world-sky-top), var(--world-sky-bottom) 70%)' }}>
      <header className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <h1 className="rounded-full bg-white/85 px-4 py-2 text-xl font-bold text-[var(--world-ink)] shadow-[var(--world-shadow-soft)] sm:text-2xl">Els primers encàrrecs</h1>
        <div className="flex items-center gap-3">
          <ErrandsStrip state={diag} />
          <MuteToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-4 px-3 pb-24">
        <div className="flex w-full min-w-0 flex-col items-center gap-1 sm:flex-row sm:items-end sm:justify-center sm:gap-2">
          {neighbour && <Neighbour id={neighbour.id} pose="wave" size={140} />}
          <div className="relative flex min-w-0 max-w-full flex-wrap items-center justify-center gap-3 rounded-[2rem] bg-white px-4 py-3 shadow-[var(--world-shadow-lift)] sm:mb-10 sm:px-5 sm:py-4">
            <p className="sr-only">{neighbour?.name} et demana:</p>
            <h2 className="text-center min-w-0 break-words text-3xl font-bold tracking-tight text-[var(--world-ink)] sm:text-5xl">{item.text}</h2>
            <SpeakerButton text={item.speech} label="Escoltar la pregunta" />
          </div>
        </div>
        {item.visual.kind !== 'none' && (
          <div className="rounded-[2rem] bg-white/70 p-3">
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
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-[var(--world-ink)]" aria-live="polite">
            Gràcies, veí!
          </motion.p>
        )}
      </main>
      <Grain />
    </div>
  )
}
