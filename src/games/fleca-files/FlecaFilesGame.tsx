import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { FlecaFilesRound } from './FlecaFilesRound'

const FLECA_FILES_SKILLS = ['C3', 'C4', 'C5', 'D2', 'D3', 'D5'] as const

/** La Fleca de les Files: bake `a` rows of `b` cupcakes on a tray, then answer how many there are. */
export function FlecaFilesGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('fleca-files', FLECA_FILES_SKILLS, props)
  return (
    <GameShell
      gameId="fleca-files"
      roundNumber={rounds.roundNumber}
      maxRounds={props.maxRounds}
      petals={rounds.session.petals}
      onExit={props.onExit}
      speech={flow.item.speech}
    >
      <FlecaFilesRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default FlecaFilesGame
