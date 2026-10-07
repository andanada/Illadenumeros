import { z } from 'zod'
import { cpaStageSchema, gameIdSchema, MISCONCEPTIONS } from '../../core/ambit/types'
import type { Attempt } from '../../core/progress/applyAnswer'
import { validRows } from '../../core/progress/playerData'

const attemptSchema = z.object({
  id: z.string(),
  ambitId: z.string(),
  skillId: z.string(),
  factKey: z.string().optional(),
  correct: z.boolean(),
  rtMs: z.number(),
  hintsUsed: z.number(),
  // An unknown misconception (older/newer app) must not discard the whole attempt.
  misconception: z.enum(MISCONCEPTIONS).optional().catch(undefined),
  cpaStage: cpaStageSchema,
  gameId: gameIdSchema,
  sessionId: z.string(),
  createdAt: z.number(),
})

/** Attempts read from the database; damaged rows are skipped. */
export function parseAttempts(rows: unknown[]): Attempt[] {
  return validRows<Attempt>(rows, (row) => attemptSchema.safeParse(row) as { success: boolean; data?: Attempt })
}
