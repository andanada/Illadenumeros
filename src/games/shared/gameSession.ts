import type { AnswerOutcome } from '../../core/progress/applyAnswer'
import type { GameSummary } from '../../features/play/gameTypes'

/** Immutable tally of a game session. A "round" is one finished item. */
export interface SessionState {
  rounds: number
  /** Rounds solved on the first try, without help. */
  correct: number
  petals: number
  masteredSkillIds: readonly string[]
}

export const emptySession: SessionState = { rounds: 0, correct: 0, petals: 0, masteredSkillIds: [] }

/** Adds petals and mastery from one recorded answer (right or wrong). */
export function addOutcome(state: SessionState, outcome: AnswerOutcome | undefined): SessionState {
  if (!outcome) return state
  const skillId = outcome.skillState.skillId
  const mastered =
    outcome.becameMastered && !state.masteredSkillIds.includes(skillId)
      ? [...state.masteredSkillIds, skillId]
      : state.masteredSkillIds
  return { ...state, petals: state.petals + outcome.petals, masteredSkillIds: mastered }
}

/** Closes a round; `firstTry` is true when it was solved with no previous errors. */
export function finishRound(state: SessionState, firstTry: boolean): SessionState {
  return { ...state, rounds: state.rounds + 1, correct: state.correct + (firstTry ? 1 : 0) }
}

export function isSessionFinished(state: SessionState, maxRounds: number | undefined): boolean {
  return maxRounds !== undefined && state.rounds >= maxRounds
}

export function toSummary(state: SessionState): GameSummary {
  return {
    answered: state.rounds,
    correct: state.correct,
    petals: state.petals,
    masteredSkillIds: [...state.masteredSkillIds],
  }
}
