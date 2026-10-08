import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { OPERATIONS } from '../../ambits/mates/operations'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { useProgress } from '../../core/progress/store'
import { GAME_TITLES, type GameProps } from '../../features/play/gameTypes'
import { Button } from '../../ui/Button'
import { MuteToggle, Screen, SpeakerButton } from '../../ui/Screen'
import { ChoiceBubble, type BubbleState } from '../../ui/question/ChoiceBubble'
import { PetalCounter } from '../shared/StickerTrail'
import { computeSummary, masteredFrom } from '../shared/summary'
import { loadPastAttempts } from '../shared/speed/loadPastAttempts'
import { PaceBar } from '../shared/speed/PaceBar'
import { PauseOverlay } from '../shared/speed/PauseOverlay'
import { classifyAnswer } from '../shared/speed/pace'
import { compareWithPast, type PastAttempt, type PersonalBest } from '../shared/speed/personalBest'
import { quietStatus } from '../shared/speed/quietStatus'
import { addFinished, emptyStats, type RoundStats } from '../shared/speed/roundStats'
import { SpeedSummary } from '../shared/speed/SpeedSummary'
import { useAnswerKeys } from '../shared/speed/useAnswerKeys'
import { usePrefersReducedMotion } from '../shared/speed/usePrefersReducedMotion'
import { useSpeedQuestions } from '../shared/speed/useSpeedQuestions'
import { useStopwatch } from '../shared/speed/useStopwatch'
import { TrainTrack } from './TrainTrack'
import { steamLevel, stepFor, tripEnded, tripProgress } from './trainLogic'

const NEXT_MS = 550
const REVEAL_MS = 1300
const ADD = OPERATIONS.find((o) => o.id === 'add') ?? { skillIds: ['A4'] }

interface Trip {
  stats: RoundStats
  distance: number
}

/** "Tren de Sumes": fast right answers fill the steam and move the train; slow ones only slow it down. */
export function TrenSumesGame({ skillIds, maxRounds, onExit, onComplete }: GameProps) {
  const q = useSpeedQuestions({ gameId: 'tren-sumes', operation: ADD, skillIds })
  const watch = useStopwatch()
  const reduced = usePrefersReducedMotion()
  const character = useProgress((s) => s.profile?.character) ?? 'mixa'
  const petals = useProgress((s) => s.rewards.petals)

  const [trip, setTrip] = useState<Trip>({ stats: emptyStats, distance: 0 })
  const [solved, setSolved] = useState(false)
  const [shaking, setShaking] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState('')
  const [best, setBest] = useState<PersonalBest | undefined>(undefined)

  const busy = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const past = useRef<PastAttempt[]>([])
  const mastered = useRef<string[]>([])
  const petalsAtStart = useRef(petals)
  const answersRef = useRef<HTMLDivElement>(null)
  const { restart, read, pause, resume, paused } = watch

  useEffect(() => {
    void loadPastAttempts(Date.now()).then((rows) => {
      past.current = rows
    })
    return () => clearTimeout(timeout.current)
  }, [])

  useEffect(() => {
    restart()
  }, [q.item.id, restart])

  const finishQuestion = (correct: boolean, clean: boolean, rt: number, errorsShown: boolean): void => {
    const speed = classifyAnswer(rt, q.pace)
    const stats = addFinished(trip.stats, { correct, clean, speed, rtMs: rt })
    const distance = trip.distance + stepFor(speed, correct && clean)
    const message = quietStatus(tripProgress(trip.distance), tripProgress(distance), trip.stats.fastStreak, stats.fastStreak)
    if (message) setStatus(message)
    setTrip({ stats, distance })
    setSolved(true)
    timeout.current = setTimeout(
      () => {
        if (tripEnded(distance, stats.finished, maxRounds)) {
          setBest(compareWithPast(past.current, stats.cleanRts, Date.now()))
          return
        }
        setSolved(false)
        setShaking(undefined)
        setStatus('')
        q.advance()
      },
      errorsShown ? REVEAL_MS : NEXT_MS,
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

  const values = useMemo(() => q.item.choices.map((c) => c.value), [q.item])
  const pickRef = useRef(pick)
  useEffect(() => {
    pickRef.current = pick
  })
  const onKeyPick = useCallback(
    (value: string): void => {
      const choice = q.item.choices.find((c) => c.value === value)
      if (choice && !q.wrongValues.includes(value)) void pickRef.current(choice)
    },
    [q.item, q.wrongValues],
  )
  useAnswerKeys({ values, enabled: best === undefined && !paused, onPick: onKeyPick, containerRef: answersRef })

  const finish = (): void => {
    const { stats } = trip
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
      <Screen title={GAME_TITLES['tren-sumes']} back={onExit}>
        <SpeedSummary character={character} best={best} stats={trip.stats} arrival="El tren ha arribat a l’estació!" onContinue={finish} />
      </Screen>
    )
  }

  const stateOf = (value: string): BubbleState => {
    // 'solution' (not 'correct'): the shared bubble animates 'correct' with a three-keyframe spring that motion rejects.
    if (solved) return value === q.item.answer ? 'solution' : 'dimmed'
    return q.wrongValues.includes(value) ? 'wrong' : 'idle'
  }

  return (
    <Screen
      title={GAME_TITLES['tren-sumes']}
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
        <TrainTrack progress={tripProgress(trip.distance)} steam={steamLevel(trip.stats.fastStreak)} character={character} reduced={reduced} />
        <PaceBar elapsedMs={watch.elapsedMs} paceMs={q.pace} />
        <h2 className="text-center text-6xl font-bold tracking-tight text-brand-dark sm:text-7xl" data-testid="speed-question" aria-label={q.item.speech}>
          {paused ? '…' : q.item.text}
        </h2>
        <div ref={answersRef} role="group" aria-label="Respostes" className="flex flex-wrap items-center justify-center gap-5">
          {q.item.choices.map((choice, i) => {
            const state = stateOf(choice.value)
            return (
              <ChoiceBubble
                key={`${q.item.id}:${choice.value}`}
                value={choice.value}
                index={i}
                state={state}
                shaking={shaking === choice.value && state === 'wrong'}
                disabled={solved || paused || state === 'wrong'}
                onPick={() => void pick(choice)}
              />
            )
          })}
        </div>
        <p role="status" aria-live="polite" className="min-h-8 text-center text-xl font-bold text-brand-dark" data-testid="speed-status">
          {status}
        </p>
      </div>
    </Screen>
  )
}

export default TrenSumesGame
