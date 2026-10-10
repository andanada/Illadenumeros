import { z } from 'zod'
import type { Item } from '../../../core/ambit/types'
import type { Pt } from './actorMachine'
import type { ErrandPhase } from '../../errands/types'

/** What a place says about the in-world version of an engine item. Validated where the place hands it over. */
export const requestTaskSpecSchema = z.object({
  /** Zone the child fills (or empties). */
  zone: z.string().min(1),
  /** Count only this def (default: everything in the zone). */
  def: z.string().min(1).optional(),
  /** Objects that are laid out for her to carry; `at` is the middle of the pile. */
  source: z
    .object({ def: z.string().min(1), room: z.string().min(1), at: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }) })
    .optional(),
  /** How many source objects to lay out (default: expected + 2, at least 1). */
  supply: z.number().int().min(1).max(40).optional(),
  /** The count to reach when the item's answer is not the count (default: from the item). */
  expected: z.number().int().min(0).max(999).optional(),
  /** false: nothing is laid out and nothing reacts (the place has no open request). Default true. */
  active: z.boolean().optional(),
  /** Actor who receives the counted things once the answer is right. */
  giveTo: z.string().min(1).optional(),
})
export type RequestTaskSpec = z.infer<typeof requestTaskSpecSchema>

export type TaskState = 'empty' | 'counting' | 'checking' | 'done' | 'shown'

const isCount = (text: string): boolean => /^\d{1,3}$/.test(text.trim())

/** How many things the item asks for: the numeric answer, else what its operands give. undefined when it is not a count. */
export function expectedCount(item: Item, override?: number): number | undefined {
  if (override !== undefined) return override
  if (isCount(item.answer)) return Number(item.answer)
  const ops = item.operands
  if (!ops) return undefined
  const value = ops.op === '+' ? ops.a + ops.b : ops.op === '-' ? ops.a - ops.b : ops.op === '×' ? ops.a * ops.b : ops.b === 0 ? NaN : ops.a / ops.b
  return Number.isInteger(value) && value >= 0 && value <= 999 ? value : undefined
}

export const supplyCount = (expected: number, spec: Pick<RequestTaskSpec, 'supply'>): number => Math.max(1, spec.supply ?? expected + 2)

export function taskState(phase: ErrandPhase, count: number): TaskState {
  if (phase === 'checking') return 'checking'
  if (phase === 'thanks' || phase === 'leaving') return 'done'
  if (phase === 'shown') return 'shown'
  return count === 0 ? 'empty' : 'counting'
}

/** A neat pile: rows of up to 6, fanned around `at`, clamped to the floor. Deterministic. */
export function pilePoints(at: Pt, n: number, floorTop: number): readonly Pt[] {
  const per = 6
  return Array.from({ length: n }, (_, i) => {
    const col = i % per
    const row = Math.floor(i / per)
    return {
      x: Math.min(0.96, Math.max(0.04, at.x + (col - (Math.min(per, n) - 1) / 2) * 0.05)),
      y: Math.min(0.97, Math.max(floorTop + 0.03, at.y + row * 0.035)),
    }
  })
}

/** Spoken/announced progress, only when the place asks for it (the count is never shown by default). */
export const progressSaid = (count: number, zoneLabel: string): string => `Ara hi ha ${count} ${zoneLabel}.`
