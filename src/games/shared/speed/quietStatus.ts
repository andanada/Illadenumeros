const HALF = 0.5
const NEAR = 0.85
const STREAK_STEPS = [5, 10, 15]

/**
 * Screen-reader updates are rare on purpose: only milestones are announced, never every answer.
 * Returns the sentence to announce, or undefined to stay quiet.
 */
export function quietStatus(prevProgress: number, nextProgress: number, prevStreak: number, nextStreak: number): string | undefined {
  if (prevProgress < NEAR && nextProgress >= NEAR) return 'Gairebé hi som!'
  if (prevProgress < HALF && nextProgress >= HALF) return 'Ja portes la meitat del camí!'
  const reached = STREAK_STEPS.find((s) => prevStreak < s && nextStreak >= s)
  return reached === undefined ? undefined : `Quin ritme! ${reached} respostes ràpides seguides.`
}
