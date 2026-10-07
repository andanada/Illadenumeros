import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { BotigaRound } from './BotigaRound'

const BOTIGA_PLUJA_SKILLS = ['C9', 'E10'] as const

/** La Botiga de la Pluja: pay exactly or give change with coins and notes from the purse. */
export function BotigaPlujaGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('botiga-pluja', BOTIGA_PLUJA_SKILLS, props)
  return (
    <GameShell
      gameId="botiga-pluja"
      roundNumber={rounds.roundNumber}
      maxRounds={props.maxRounds}
      petals={rounds.session.petals}
      onExit={props.onExit}
      speech={flow.item.speech}
    >
      <BotigaRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default BotigaPlujaGame
