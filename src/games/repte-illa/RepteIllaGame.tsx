import { useRef, useState } from 'react'
import { useProgress } from '../../core/progress/store'
import { useQuestionFlow, type AnswerResult } from '../../features/play/useQuestionFlow'
import { GAME_TITLES, type GameProps } from '../../features/play/gameTypes'
import { MuteToggle, Screen } from '../../ui/Screen'
import { QuestionCard } from '../../ui/QuestionCard'
import { Mascot } from '../../ui/mascot/Mascot'
import { PetalCounter, StickerTrail } from '../shared/StickerTrail'
import { computeSummary, masteredFrom } from '../shared/summary'

const FREE_PLAY_TRAIL = 10

/** "El Repte de l'Illa": generic mixed practice that works for any skill. */
export function RepteIllaGame({ skillIds, maxRounds, onExit, onComplete }: GameProps) {
  const flow = useQuestionFlow({ gameId: 'repte-illa', ...(skillIds ? { skillIds } : {}) })
  const character = useProgress((s) => s.profile?.character) ?? 'mixa'
  const petals = useProgress((s) => s.rewards.petals)
  const petalsAtStart = useRef(petals)
  const mastered = useRef<string[]>([])
  const [rounds, setRounds] = useState(0)
  const [cheer, setCheer] = useState(false)

  const handleResult = (result: AnswerResult) => {
    mastered.current = masteredFrom(result, mastered.current)
    setCheer(result.correct)
  }

  const handleContinue = () => {
    const finished = rounds + 1
    setRounds(finished)
    setCheer(false)
    if (maxRounds !== undefined && finished >= maxRounds) {
      onComplete(
        computeSummary({
          answered: flow.answered,
          correct: flow.correctCount,
          petalsAtStart: petalsAtStart.current,
          petalsNow: useProgress.getState().rewards.petals,
          masteredSkillIds: mastered.current,
        }),
      )
      return
    }
    flow.next()
  }

  const total = maxRounds ?? FREE_PLAY_TRAIL
  return (
    <Screen title={GAME_TITLES['repte-illa']} back={onExit} right={<><PetalCounter petals={petals} /><MuteToggle /></>}>
      <div className="flex flex-wrap items-center gap-4 px-4 pb-4">
        <Mascot character={character} mood={cheer ? 'balla' : 'anims'} size={72} />
        <StickerTrail done={maxRounds === undefined ? rounds % total : Math.min(rounds, total)} total={total} label="Progrés del repte" />
      </div>
      <QuestionCard flow={flow} character={character} onResult={handleResult} onContinue={handleContinue} />
    </Screen>
  )
}

export default RepteIllaGame
