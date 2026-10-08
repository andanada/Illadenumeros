import type { Level } from '../shared/tables/tableFact'

/** Bars (compassos) the child taps herself; the rest are already counted on the tape. Level 3 goes straight to the question. */
export function tapsRequired(groups: number, level: Level): number {
  if (level === 1) return groups
  if (level === 2) return Math.min(groups, 3)
  return 0
}

/** Multiples already counted before the first tap (the tape starts there). */
export const preCounted = (size: number, groups: number, taps: number): number[] =>
  Array.from({ length: Math.max(0, groups - taps) }, (_, i) => size * (i + 1))

/** The beats of the bar that follows `doneBars` bars: size beats, the last one is the strong beat. */
export const barBeats = (size: number, doneBars: number): number[] => Array.from({ length: size }, (_, i) => doneBars * size + i + 1)

export const isStrongBeat = (beat: number, size: number): boolean => size > 0 && beat % size === 0

/** Tape of counted multiples; the final one is hidden ("?") while the child still has to say it. */
export function tapeEntries(size: number, counted: number, groups: number, hideLast: boolean): string[] {
  return Array.from({ length: counted }, (_, i) => (hideLast && i === groups - 1 ? '?' : String(size * (i + 1))))
}

export interface RitmeTexts {
  instruction: string
  question: string
}

export function ritmeTexts(kind: 'mul' | 'div', size: number, groups: number, total: number): RitmeTexts {
  if (kind === 'mul') {
    return {
      instruction: `Toca el batec fort de cada compàs de ${size}`,
      question: `Quin número cau al compàs ${groups}?`,
    }
  }
  return { instruction: `Toca el batec fort de cada compàs de ${size} fins al ${total}`, question: `Quants compassos de ${size} hi ha fins al ${total}?` }
}

/** Gentle nudge when a weak beat is tapped (never an error). */
export const weakBeatMessage = (beat: number, size: number): string => `El ${beat} és un batec suau. El batec fort és el ${Math.ceil(beat / size) * size}.`
