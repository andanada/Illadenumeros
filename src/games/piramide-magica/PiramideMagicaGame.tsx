import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { PiramideMagicaRound } from './PiramideMagicaRound'

/** Skills this game plays: additions (up), subtractions (find the missing base) and tens. */
export const PIRAMIDE_SKILLS = ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'B4', 'B6', 'B7'] as const

/** Piràmide Màgica: every block is the sum of the two below it. */
export function PiramideMagicaGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('piramide-magica', PIRAMIDE_SKILLS, props)
  return (
    <GameShell gameId="piramide-magica" roundNumber={rounds.roundNumber} maxRounds={props.maxRounds} petals={rounds.session.petals} onExit={props.onExit} speech={flow.item.speech}>
      <PiramideMagicaRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default PiramideMagicaGame
