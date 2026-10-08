import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { RitmeTaulesRound } from './RitmeTaulesRound'

const RITME_SKILLS = ['C4', 'C5', 'D2', 'D3', 'C7', 'D4'] as const

/** Ritme de les Taules: tap the strong beat of every bar (skip counting), then say which number lands there. */
export function RitmeTaulesGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('ritme-taules', RITME_SKILLS, props)
  return (
    <GameShell gameId="ritme-taules" roundNumber={rounds.roundNumber} maxRounds={props.maxRounds} petals={rounds.session.petals} onExit={props.onExit} speech={flow.item.speech}>
      <RitmeTaulesRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} />
    </GameShell>
  )
}

export default RitmeTaulesGame
