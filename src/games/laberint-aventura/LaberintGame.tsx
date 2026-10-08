import { useCallback, useRef, useState } from 'react'
import { useProgress } from '../../core/progress/store'
import type { GameProps } from '../../features/play/gameTypes'
import { useQuestionFlow, type AnswerResult } from '../../features/play/useQuestionFlow'
import { QuestionCard } from '../../ui/QuestionCard'
import { GameShell } from '../shared/GameShell'
import { useGameRounds } from '../shared/useGameRounds'
import { MazeChest } from './MazeChest'
import { MazeMap } from './MazeMap'
import { mazeLength, mazeProgress } from './mazeLogic'

/**
 * Laberint de l'Aventura: the review "boss" of a region. Every junction asks one mixed question drawn by the
 * normal session selector from the skills handed in (the region's learning/mastered skills); the path always
 * moves forward, and a treasure chest with a sticker waits at the end.
 */
export function LaberintGame({ skillIds, maxRounds, onExit, onComplete }: GameProps) {
  const steps = mazeLength(maxRounds)
  const flow = useQuestionFlow({ gameId: 'laberint-aventura', ...(skillIds ? { skillIds } : {}) })
  const rounds = useGameRounds(steps, onComplete)
  const character = useProgress((s) => s.profile?.character) ?? 'mixa'
  const grantSticker = useProgress((s) => s.grantSticker)
  const [seed] = useState(() => `${Date.now()}`)
  const [done, setDone] = useState(0)
  const [cheer, setCheer] = useState(false)
  const errorsOnItem = useRef(0)
  const { register, completeIfFinished } = rounds
  const { next } = flow

  const handleResult = useCallback(
    (result: AnswerResult): void => {
      register(result, errorsOnItem.current)
      if (!result.correct) errorsOnItem.current += 1
    },
    [register],
  )

  const handleContinue = useCallback((): void => {
    errorsOnItem.current = 0
    setDone((n) => Math.min(steps, n + 1))
    setCheer(true)
    if (done + 1 < steps) next()
  }, [done, next, steps])

  const progress = mazeProgress(done, steps)
  return (
    <GameShell gameId="laberint-aventura" roundNumber={Math.min(done + 1, steps)} maxRounds={steps} petals={rounds.session.petals} onExit={onExit}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2">
        <div className="px-3">
          <MazeMap steps={steps} seed={seed} done={progress.done} character={character} cheering={cheer} />
        </div>
        {progress.finished ? (
          <MazeChest character={character} onOpen={grantSticker} onContinue={() => void completeIfFinished()} />
        ) : (
          <QuestionCard flow={flow} character={character} onResult={handleResult} onContinue={handleContinue} />
        )}
      </div>
    </GameShell>
  )
}

export default LaberintGame
