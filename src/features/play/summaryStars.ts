import type { GameSummary } from './gameTypes'

/** 1-3 stars from accuracy: effort always earns at least one. */
export function starsForSummary(summary: Pick<GameSummary, 'answered' | 'correct'>): 1 | 2 | 3 {
  if (summary.answered === 0) return 1
  const ratio = summary.correct / summary.answered
  return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1
}

