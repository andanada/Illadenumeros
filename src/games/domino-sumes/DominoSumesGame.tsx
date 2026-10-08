import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { DominoSumesRound } from './DominoSumesRound'

/** Skills this game plays: additions up to 20 and their ten-friends, subtractions up to 20, tens. */
export const DOMINO_SKILLS = ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'B4', 'B6'] as const

/** Dòmino de Sumes: chain dominoes so that touching halves are worth the same (3 + 4 next to 7). */
export function DominoSumesGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('domino-sumes', DOMINO_SKILLS, props)
  return (
    <GameShell gameId="domino-sumes" roundNumber={rounds.roundNumber} maxRounds={props.maxRounds} petals={rounds.session.petals} onExit={props.onExit} speech={flow.item.speech}>
      <DominoSumesRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default DominoSumesGame
