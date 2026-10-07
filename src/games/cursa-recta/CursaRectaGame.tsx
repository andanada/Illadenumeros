import { useMemo, useRef } from 'react'
import type { GameProps } from '../../features/play/gameTypes'
import { GameShell } from '../shared/GameShell'
import { useGameBase } from '../shared/useGameBase'
import { JumpRound } from './JumpRound'
import { parseRaceTask } from './jumpLogic'
import { ReadRound } from './ReadRound'

const CURSA_RECTA_SKILLS = ['A9', 'B2', 'B4', 'B5', 'B6', 'B7'] as const

/** Cursa a la Recta: hop along the number line with +10, +1, −10 and −1 jumps. */
export function CursaRectaGame(props: GameProps) {
  const { flow, rounds, handleNext } = useGameBase('cursa-recta', CURSA_RECTA_SKILLS, props)
  const task = useMemo(() => parseRaceTask(flow.item), [flow.item])
  const tipSeen = useRef(false)

  return (
    <GameShell
      gameId="cursa-recta"
      roundNumber={rounds.roundNumber}
      maxRounds={props.maxRounds}
      petals={rounds.session.petals}
      onExit={props.onExit}
      speech={flow.item.speech}
    >
      {task?.kind === 'jump' && (
        <JumpRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} start={task.start} target={task.target} tipSeen={tipSeen} />
      )}
      {task?.kind === 'read' && (
        <ReadRound key={flow.item.id} flow={flow} rounds={rounds} onNext={handleNext} from={task.from} to={task.to} target={task.target} />
      )}
    </GameShell>
  )
}
