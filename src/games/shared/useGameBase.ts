import { useCallback, useMemo } from 'react'
import type { GameId } from '../../core/ambit/types'
import type { GameProps } from '../../features/play/gameTypes'
import { useQuestionFlow, type QuestionFlow } from '../../features/play/useQuestionFlow'
import { useGameRounds, type GameRounds } from './useGameRounds'

export interface GameBase {
  flow: QuestionFlow
  rounds: GameRounds
  /** Advances to the next item, or completes the game after the last round. */
  handleNext: () => void
}

/** Skills the game shows: the host's restriction intersected with the game's own skills (fallback: the first). */
export function resolveSkillIds(own: readonly string[], allowed: readonly string[] | undefined): string[] {
  if (!allowed) return [...own]
  const common = own.filter((id) => allowed.includes(id))
  return common.length > 0 ? common : [own[0] as string]
}

/** Flow + round tally shared by the three games of this folder. */
export function useGameBase(gameId: GameId, ownSkills: readonly string[], props: GameProps): GameBase {
  const skillIds = useMemo(() => resolveSkillIds(ownSkills, props.skillIds), [ownSkills, props.skillIds])
  const flow = useQuestionFlow({ gameId, skillIds })
  const rounds = useGameRounds(props.maxRounds, props.onComplete)
  const { completeIfFinished } = rounds
  const { next } = flow
  const handleNext = useCallback(() => {
    if (!completeIfFinished()) next()
  }, [completeIfFinished, next])
  return { flow, rounds, handleNext }
}

/** Props every per-item round component receives. */
export interface RoundProps {
  flow: QuestionFlow
  rounds: GameRounds
  onNext: () => void
}
