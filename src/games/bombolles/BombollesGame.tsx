import { useMemo } from 'react'
import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { parseBubbleTask } from './bubbleField'
import { BombollesRound } from './BombollesRound'

/** Skills this game can show; A5 (amics del 10) is the core one. */
const BOMBOLLES_SKILLS = ['A5', 'A3', 'A8'] as const

/** Bombolles Amigues del 10: tap two floating bubbles that make 10 and they merge into a star. */
export function BombollesGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('bombolles', BOMBOLLES_SKILLS, props)
  const task = useMemo(() => parseBubbleTask(flow.item), [flow.item])

  return (
    <GameShell
      gameId="bombolles"
      roundNumber={rounds.roundNumber}
      maxRounds={props.maxRounds}
      petals={rounds.session.petals}
      onExit={props.onExit}
      speech={flow.item.speech}
    >
      {task ? (
        <BombollesRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} task={task} />
      ) : (
        <p className="p-6 text-2xl">Aquesta pregunta no és per a les bombolles.</p>
      )}
    </GameShell>
  )
}
