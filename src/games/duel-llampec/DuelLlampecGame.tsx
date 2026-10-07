import { useEffect, useMemo, useRef, useState } from 'react'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { useProgress } from '../../core/progress/store'
import { GAME_TITLES, type GameProps } from '../../features/play/gameTypes'
import { useQuestionFlow } from '../../features/play/useQuestionFlow'
import { MuteToggle, Screen } from '../../ui/Screen'
import { ChoiceBubble, type BubbleState } from '../../ui/question/ChoiceBubble'
import { PetalCounter } from '../shared/StickerTrail'
import { computeSummary, masteredFrom } from '../shared/summary'
import { DUEL_DURATION_MS, GOAL_POINTS, duelSkills, pickRival, pointsFor, rivalProgress } from './duelLogic'
import { Lane, TimeTrail } from './Race'

const TICK_MS = 250
const NEXT_MS = 500
const REVEAL_MS = 1100

/** "Duel Llampec": a friendly 75 s race of fast facts. Time is only a shrinking star trail. */
export function DuelLlampecGame({ skillIds, maxRounds, onExit, onComplete }: GameProps) {
  const allowed = useMemo(() => duelSkills(skillIds), [skillIds])
  const flow = useQuestionFlow({ gameId: 'duel-llampec', skillIds: allowed })
  const character = useProgress((s) => s.profile?.character) ?? 'mixa'
  const petals = useProgress((s) => s.rewards.petals)
  const [rival] = useState(() => pickRival(character, Date.now()))

  const [elapsed, setElapsed] = useState(0)
  const [points, setPoints] = useState(0)
  const [solved, setSolved] = useState<string | undefined>(undefined)
  const [shaking, setShaking] = useState<{ id: string; value: string } | undefined>(undefined)

  // Both clocks start in the mount effects below (impure reads stay out of render).
  const startedAt = useRef(0)
  const shownAt = useRef(0)
  const busy = useRef(false)
  const ended = useRef(false)
  const rounds = useRef(0)
  const mastered = useRef<string[]>([])
  const petalsAtStart = useRef(petals)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flowRef = useRef(flow)
  const completeRef = useRef(onComplete)
  useEffect(() => {
    flowRef.current = flow
    completeRef.current = onComplete
  })

  const { item } = flow

  const finish = () => {
    if (ended.current) return
    ended.current = true
    clearTimeout(timeout.current)
    completeRef.current(
      computeSummary({
        answered: flowRef.current.answered,
        correct: flowRef.current.correctCount,
        petalsAtStart: petalsAtStart.current,
        petalsNow: useProgress.getState().rewards.petals,
        masteredSkillIds: mastered.current,
      }),
    )
  }

  useEffect(() => {
    startedAt.current = performance.now()
    const id = setInterval(() => {
      const t = performance.now() - startedAt.current
      setElapsed(t)
      if (t >= DUEL_DURATION_MS) finish()
    }, TICK_MS)
    return () => {
      clearInterval(id)
      clearTimeout(timeout.current)
    }
  }, [])

  useEffect(() => {
    shownAt.current = performance.now()
    speak(item.speech)
  }, [item.id, item.speech])

  const advance = (delay: number) => {
    timeout.current = setTimeout(() => {
      rounds.current += 1
      if (maxRounds !== undefined && rounds.current >= maxRounds) {
        finish()
        return
      }
      flowRef.current.next()
    }, delay)
  }

  const isSolved = solved === item.id

  const pick = async (choice: Choice) => {
    if (busy.current || ended.current || isSolved) return
    busy.current = true
    unlockAudio()
    try {
      const rt = performance.now() - shownAt.current
      const result = await flow.answer(choice, rt)
      mastered.current = masteredFrom(result, mastered.current)
      if (result.correct) {
        sfx.correct()
        setSolved(item.id)
        setPoints((p) => p + pointsFor(rt, flow.skill.fluencyTargetMs))
        advance(NEXT_MS)
      } else {
        sfx.almost()
        setShaking({ id: item.id, value: choice.value })
        if (result.itemDone) {
          setSolved(item.id)
          advance(REVEAL_MS)
        }
      }
    } finally {
      busy.current = false
    }
  }

  const childProgress = Math.min(1, points / GOAL_POINTS)
  const remaining = 1 - elapsed / DUEL_DURATION_MS
  const stateOf = (value: string): BubbleState => {
    if (isSolved) return value === item.answer ? 'correct' : 'dimmed'
    return flow.wrongValues.includes(value) ? 'wrong' : 'idle'
  }

  return (
    <Screen title={GAME_TITLES['duel-llampec']} back={onExit} right={<><PetalCounter petals={petals} /><MuteToggle /></>}>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-bold text-brand-dark">Qui arriba a les estrelles?</p>
          <TimeTrail remaining={remaining} />
        </div>
        <Lane character={character} progress={childProgress} label="El teu camí d’estrelles" glow={isSolved} />
        <Lane character={rival} progress={rivalProgress(elapsed, childProgress)} label="El camí de l’amic" />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-3 pb-8">
        <h2 className="text-center text-6xl font-bold tracking-tight text-brand-dark sm:text-7xl" data-testid="duel-question">
          {item.text}
        </h2>
        <div role="group" aria-label="Respostes" className="flex flex-wrap items-center justify-center gap-5">
          {item.choices.map((choice, i) => {
            const state = stateOf(choice.value)
            return (
              <ChoiceBubble
                key={`${item.id}:${choice.value}`}
                value={choice.value}
                index={i}
                state={state}
                shaking={shaking?.id === item.id && shaking.value === choice.value && state === 'wrong'}
                disabled={isSolved || state === 'wrong'}
                onPick={() => void pick(choice)}
              />
            )
          })}
        </div>
        {flow.wrongValues.length > 0 && !isSolved && <p className="text-xl font-bold text-almost">Gairebé! Torna-ho a provar</p>}
      </div>
    </Screen>
  )
}

export default DuelLlampecGame
