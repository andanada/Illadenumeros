import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { PastisRound } from './PastisRound'

const PASTIS_SKILLS = ['C8', 'D7', 'E9'] as const

/** Pastís de Fraccions: cut a cake, share a tray of cupcakes, and meet equivalent fractions by cutting more. */
export function PastisFraccionsGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('pastis-fraccions', PASTIS_SKILLS, props)
  return (
    <GameShell
      gameId="pastis-fraccions"
      roundNumber={rounds.roundNumber}
      maxRounds={props.maxRounds}
      petals={rounds.session.petals}
      onExit={props.onExit}
      speech={flow.item.speech}
    >
      <PastisRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default PastisFraccionsGame
