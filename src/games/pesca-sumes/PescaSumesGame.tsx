import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { OPERATIONS } from '../../ambits/mates/operations'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { useProgress } from '../../core/progress/store'
import { GAME_TITLES, type GameProps } from '../../features/play/gameTypes'
import { Button } from '../../ui/Button'
import { MuteToggle, Screen, SpeakerButton } from '../../ui/Screen'
import type { BubbleState } from '../../ui/question/ChoiceBubble'
import { PetalCounter } from '../shared/StickerTrail'
import { computeSummary, masteredFrom } from '../shared/summary'
import { loadPastAttempts } from '../shared/speed/loadPastAttempts'
import { PauseOverlay } from '../shared/speed/PauseOverlay'
import { classifyAnswer, driftDurationMs, shouldCalmDown } from '../shared/speed/pace'
import { compareWithPast, type PastAttempt, type PersonalBest } from '../shared/speed/personalBest'
import { quietStatus } from '../shared/speed/quietStatus'
import { addFinished, addLeftBehind, emptyStats, type RoundStats } from '../shared/speed/roundStats'
import { SpeedSummary } from '../shared/speed/SpeedSummary'
import { useAnswerKeys } from '../shared/speed/useAnswerKeys'
import { usePrefersReducedMotion } from '../shared/speed/usePrefersReducedMotion'
import { useSpeedQuestions } from '../shared/speed/useSpeedQuestions'
import { useStopwatch } from '../shared/speed/useStopwatch'
import { FishPond } from './FishPond'
import { catchEnded, catchProgress, layoutFish, leaveAfterMs, roundCap } from './fishLogic'

const NEXT_MS = 550
const REVEAL_MS = 1300
const ADD = OPERATIONS.find((o) => o.id === 'add') ?? { skillIds: ['A4'] }

/** "Pesca de Sumes": answers swim by as fish. A fish that leaves comes back later: nothing is lost. */
export function PescaSumesGame({ skillIds, maxRounds, onExit, onComplete }: GameProps) {
  const q = useSpeedQuestions({ gameId: 'pesca-sumes', operation: ADD, skillIds })
  const watch = useStopwatch()
  const reduced = usePrefersReducedMotion()
  const character = useProgress((s) => s.profile?.character) ?? 'mixa'
  const petals = useProgress((s) => s.rewards.petals)

  const [stats, setStats] = useState<RoundStats>(emptyStats)
  const [solved, setSolved] = useState(false)
  const [shaking, setShaking] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState('')
  const [best, setBest] = useState<PersonalBest | undefined>(undefined)
  const [serial, setSerial] = useState(0)

  const busy = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const past = useRef<PastAttempt[]>([])
  const mastered = useRef<string[]>([])
  const petalsAtStart = useRef(petals)
  const leftFor = useRef<string | undefined>(undefined)
  const pondRef = useRef<HTMLDivElement>(null)
  const { restart, read, pause, resume, paused, elapsedMs } = watch

  // Calm mode: reduced motion, or the fish wait after several misses in a row. No moving targets, nothing leaves.
  const calm = reduced || shouldCalmDown(stats.missesInRow)
  const choiceCount = q.item.choices.length
  const slots = useMemo(() => layoutFish(choiceCount, serial), [choiceCount, serial])
  const driftMs = useMemo(() => driftDurationMs(q.pace, stats.missesInRow), [q.pace, stats.missesInRow])
  const leaveAt = leaveAfterMs(driftMs, slots)

  useEffect(() => {
    void loadPastAttempts(Date.now()).then((rows) => {
      past.current = rows
    })
    return () => clearTimeout(timeout.current)
  }, [])

  useEffect(() => {
    restart()
  }, [q.item.id, restart])

  const next = (): void => {
    setSolved(false)
    setShaking(undefined)
    setSerial((n) => n + 1)
    q.advance()
  }

  const finishQuestion = (correct: boolean, clean: boolean, rt: number, revealed: boolean): void => {
    const speed = classifyAnswer(rt, q.pace)
    const after = addFinished(stats, { correct, clean, speed, rtMs: rt })
    const message = quietStatus(catchProgress(stats.finished, maxRounds), catchProgress(after.finished, maxRounds), stats.fastStreak, after.fastStreak)
    setStatus(message ?? '')
    setStats(after)
    setSolved(true)
    timeout.current = setTimeout(
      () => {
        if (catchEnded(after.finished, maxRounds)) setBest(compareWithPast(past.current, after.cleanRts, Date.now()))
        else next()
      },
      revealed ? REVEAL_MS : NEXT_MS,
    )
  }

  const pick = async (choice: Choice): Promise<void> => {
    if (busy.current || solved || paused) return
    busy.current = true
    unlockAudio()
    try {
      const rt = read()
      const result = await q.submit(choice, rt)
      mastered.current = masteredFrom(result, mastered.current)
      if (result.correct) {
        sfx.correct()
        finishQuestion(true, result.clean, rt, false)
      } else {
        sfx.almost()
        setShaking(choice.value)
        setStatus('Gairebé! Torna-ho a provar.')
        if (result.itemDone) finishQuestion(false, false, rt, true)
      }
    } finally {
      busy.current = false
    }
  }

  // The fish swam away: the same fact returns a few questions later. Not wrong, just not fluent yet.
  useEffect(() => {
    // `elapsedMs` only re-runs this effect; the exact (restart-aware) clock decides.
    if (calm || solved || paused || best !== undefined || leftFor.current === q.item.id || read() < leaveAt) return
    leftFor.current = q.item.id
    setStats((s) => addLeftBehind(s))
    setStatus('Aquest peix tornarà més tard.')
    setShaking(undefined)
    setSerial((n) => n + 1)
    q.requeueAndAdvance()
  }, [calm, solved, paused, best, elapsedMs, leaveAt, read, q])

  const pickRef = useRef(pick)
  useEffect(() => {
    pickRef.current = pick
  })
  const values = useMemo(() => q.item.choices.map((c) => c.value), [q.item])
  const onKeyPick = useCallback(
    (value: string): void => {
      const choice = q.item.choices.find((c) => c.value === value)
      if (choice && !q.wrongValues.includes(value)) void pickRef.current(choice)
    },
    [q.item, q.wrongValues],
  )
  useAnswerKeys({ values, enabled: best === undefined && !paused, onPick: onKeyPick, containerRef: pondRef })

  const finish = (): void => {
    onComplete(
      computeSummary({
        answered: stats.finished,
        correct: stats.clean,
        petalsAtStart: petalsAtStart.current,
        petalsNow: useProgress.getState().rewards.petals,
        masteredSkillIds: mastered.current,
      }),
    )
  }

  if (best) {
    return (
      <Screen title={GAME_TITLES['pesca-sumes']} back={onExit}>
        <SpeedSummary character={character} best={best} stats={stats} arrival="Quina bona pesca!" onContinue={finish} />
      </Screen>
    )
  }

  const stateOf = (value: string): BubbleState => {
    if (solved) return value === q.item.answer ? 'correct' : 'dimmed'
    return q.wrongValues.includes(value) ? 'wrong' : 'idle'
  }
  const caught = Math.min(stats.finished, roundCap(maxRounds))

  return (
    <Screen
      title={GAME_TITLES['pesca-sumes']}
      back={onExit}
      right={
        <>
          <PetalCounter petals={petals} />
          <Button variant="soft" aria-label="Pausa" className="px-5" onClick={pause}>
            ⏸️ Pausa
          </Button>
          <SpeakerButton text={q.item.speech} label="Escoltar la suma" />
          <MuteToggle />
        </>
      }
    >
      {paused && <PauseOverlay onResume={resume} onExit={onExit} />}
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-3 pb-8">
        <ol aria-label="Peixos pescats" className="flex flex-wrap justify-center gap-1" data-testid="catch-row">
          {Array.from({ length: roundCap(maxRounds) }, (_, i) => (
            <li key={i} aria-hidden="true" className={`text-2xl ${i < caught ? '' : 'opacity-25 grayscale'}`}>
              🐟
            </li>
          ))}
        </ol>
        <h2 className="text-center text-6xl font-bold tracking-tight text-brand-dark sm:text-7xl" data-testid="speed-question" aria-label={q.item.speech}>
          {paused ? '…' : q.item.text}
        </h2>
        <FishPond
          choices={q.item.choices}
          stateOf={stateOf}
          shaking={shaking}
          moving={!calm}
          driftMs={driftMs}
          slots={slots}
          paused={paused}
          frozen={solved}
          onPick={(choice) => void pick(choice)}
          containerRef={pondRef}
        />
        {!reduced && calm && <p className="text-center text-lg font-bold text-brand-dark">Els peixos s’han aturat perquè tinguis temps de pensar.</p>}
        <p role="status" aria-live="polite" className="min-h-8 text-center text-xl font-bold text-brand-dark" data-testid="speed-status">
          {status}
        </p>
      </div>
    </Screen>
  )
}

export default PescaSumesGame
