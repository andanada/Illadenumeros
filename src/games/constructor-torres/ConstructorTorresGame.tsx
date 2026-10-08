import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { ConstructorTorresRound } from './ConstructorTorresRound'

const TORRES_SKILLS = ['C3', 'C4', 'C5', 'D2', 'D3', 'C6', 'C7', 'D4'] as const

/** Constructor de Torres: stack floors of equal blocks (repeated addition) and count blocks, or count floors of a given tower. */
export function ConstructorTorresGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('constructor-torres', TORRES_SKILLS, props)
  return (
    <GameShell gameId="constructor-torres" roundNumber={rounds.roundNumber} maxRounds={props.maxRounds} petals={rounds.session.petals} onExit={props.onExit} speech={flow.item.speech}>
      <ConstructorTorresRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default ConstructorTorresGame
