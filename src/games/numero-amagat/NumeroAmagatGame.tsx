import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { NumeroAmagatRound } from './NumeroAmagatRound'

const NUMERO_AMAGAT_SKILLS = ['A10', 'D9'] as const

/** El Número Amagat: balance the scale by putting the hidden number on the pan (? + 3 = 8, ? × 4 = 28). */
export function NumeroAmagatGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('numero-amagat', NUMERO_AMAGAT_SKILLS, props)
  return (
    <GameShell
      gameId="numero-amagat"
      roundNumber={rounds.roundNumber}
      maxRounds={props.maxRounds}
      petals={rounds.session.petals}
      onExit={props.onExit}
      speech={flow.item.speech}
    >
      <NumeroAmagatRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default NumeroAmagatGame
