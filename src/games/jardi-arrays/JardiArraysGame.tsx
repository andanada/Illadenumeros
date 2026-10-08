import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { JardiArraysRound } from './JardiArraysRound'

const JARDI_SKILLS = ['C3', 'C4', 'C5', 'D2', 'D3', 'C6', 'C7', 'D4'] as const

/** Jardí d'Arrays: plant rows of flowers (area model) and read the product; or share a garden into equal rows. */
export function JardiArraysGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('jardi-arrays', JARDI_SKILLS, props)
  return (
    <GameShell gameId="jardi-arrays" roundNumber={rounds.roundNumber} maxRounds={props.maxRounds} petals={rounds.session.petals} onExit={props.onExit} speech={flow.item.speech}>
      <JardiArraysRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default JardiArraysGame
