import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { MarcMagicRound } from './MarcMagicRound'

const MARC_MAGIC_SKILLS = ['A1', 'A4', 'A6', 'A7', 'A8'] as const

/** El Marc Màgic: build the operation with counters in a double ten-frame, then answer. */
export function MarcMagicGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('marc-magic', MARC_MAGIC_SKILLS, props)
  return (
    <GameShell
      gameId="marc-magic"
      roundNumber={rounds.roundNumber}
      maxRounds={props.maxRounds}
      petals={rounds.session.petals}
      onExit={props.onExit}
      speech={flow.item.speech}
    >
      <MarcMagicRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}
