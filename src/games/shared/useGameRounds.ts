import { useCallback, useRef, useState } from 'react'
import type { AnswerResult } from '../../features/play/useQuestionFlow'
import type { GameSummary } from '../../features/play/gameTypes'
import { addOutcome, emptySession, finishRound, isSessionFinished, toSummary, type SessionState } from './gameSession'

export interface GameRounds {
  session: SessionState
  /** 1-based number of the round being played. */
  roundNumber: number
  finished: boolean
  /** Registers a flow answer; `errorsBefore` = flow.errors at the moment of answering. */
  register: (result: AnswerResult, errorsBefore: number) => void
  /** Call from the "Següent" button: completes the game on the last round. Returns true if it completed. */
  completeIfFinished: () => boolean
}

export function useGameRounds(maxRounds: number | undefined, onComplete: (summary: GameSummary) => void): GameRounds {
  const [session, setSession] = useState<SessionState>(emptySession)
  const latest = useRef<SessionState>(emptySession)

  const register = useCallback((result: AnswerResult, errorsBefore: number) => {
    let next = addOutcome(latest.current, result.outcome)
    if (result.itemDone) next = finishRound(next, result.correct && errorsBefore === 0)
    latest.current = next
    setSession(next)
  }, [])

  const finished = isSessionFinished(session, maxRounds)
  const completeIfFinished = useCallback((): boolean => {
    if (!isSessionFinished(latest.current, maxRounds)) return false
    onComplete(toSummary(latest.current))
    return true
  }, [maxRounds, onComplete])

  return { session, roundNumber: Math.min(session.rounds + 1, maxRounds ?? session.rounds + 1), finished, register, completeIfFinished }
}
