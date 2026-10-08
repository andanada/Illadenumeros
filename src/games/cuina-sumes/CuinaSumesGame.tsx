import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { CuinaSumesRound } from './CuinaSumesRound'

/** Skills this game plays: make-ten, bridging, tens and the "sobra/falta" subtractions. */
export const CUINA_SKILLS = ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'B4', 'B6', 'B7'] as const

/** Cuina de Sumes: fill the recipe jar exactly (10, 20, 100) or find what is left over / missing. */
export function CuinaSumesGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('cuina-sumes', CUINA_SKILLS, props)
  return (
    <GameShell gameId="cuina-sumes" roundNumber={rounds.roundNumber} maxRounds={props.maxRounds} petals={rounds.session.petals} onExit={props.onExit} speech={flow.item.speech}>
      <CuinaSumesRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default CuinaSumesGame
