import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { LlaminadureRound } from './LlaminadureRound'

const LLAMINADURES_SKILLS = ['C6', 'C7', 'C8', 'D4', 'D6', 'D7'] as const

/** Repartim Llaminadures: deal candies one by one onto plates; the leftovers sit aside ("sobren"). */
export function LlaminadureGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('llaminadures', LLAMINADURES_SKILLS, props)
  return (
    <GameShell
      gameId="llaminadures"
      roundNumber={rounds.roundNumber}
      maxRounds={props.maxRounds}
      petals={rounds.session.petals}
      onExit={props.onExit}
      speech={flow.item.speech}
    >
      <LlaminadureRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default LlaminadureGame
