import type { Bubble, BubbleTask } from './bubbleField'

export type PairVerdict = 'match' | 'wrong-with-target' | 'wrong-other'

/** Judges two tapped bubbles. Wrong pairs not involving the highlighted bubble are never recorded as errors. */
export function judgePair(first: Bubble, second: Bubble, task: BubbleTask): PairVerdict {
  if (first.value + second.value === task.total) return 'match'
  return first.role === 'target' || second.role === 'target' ? 'wrong-with-target' : 'wrong-other'
}

/** Toggles a bubble in the selection (max 2). Tapping a selected bubble deselects it. */
export function toggleSelection(selected: readonly string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((s) => s !== id)
  return selected.length >= 2 ? [id] : [...selected, id]
}

/** Cells for the hint ten-frame: `a` counters, then ghost cells for what is missing up to `total`. */
export function hintFrameShape(task: BubbleTask): { filled: number; missing: number } {
  return { filled: Math.min(task.a, 10), missing: Math.max(0, Math.min(10, task.total) - task.a) }
}

/** Answer value sent to the flow for a wrong pair; never equals a numeric answer. */
export function wrongPairValue(first: Bubble, second: Bubble): string {
  return `${first.value}+${second.value}`
}
