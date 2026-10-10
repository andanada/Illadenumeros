import { z } from 'zod'
import { sceneIdSchema } from '../model/types'

/** What the character wants: the verb of the little scene (cook a dish, serve a client, drive...). */
export const REQUEST_KINDS = ['cook', 'serve', 'give', 'drive', 'style', 'play'] as const
export const requestKindSchema = z.enum(REQUEST_KINDS)
export type RequestKind = z.infer<typeof requestKindSchema>

/**
 * An ambient request: a character's need in a place, shown as a small bubble the child may ignore.
 * It never fails and nobody gets angry: after `expiresSoft` the bubble just calms down (status 'calm')
 * and wakes again when she comes back. The real question is chosen by the engine when it is played
 * (same useErrand / useQuestionFlow as always), so Leitner, fluency and attempts work unchanged.
 */
export const requestSchema = z.object({
  id: z.string().min(1).max(80),
  placeId: sceneIdSchema,
  kind: requestKindSchema,
  /** Neighbour / character preset that carries the bubble. */
  actorId: z.string().min(1).max(40),
  /** Skill the day's plan aims this request at (the engine selector still has the last word). */
  skillId: z.string().min(1).max(20).optional(),
  factKey: z.string().min(1).max(20).optional(),
  createdAt: z.number().int().nonnegative(),
  expiresSoft: z.number().int().nonnegative(),
})
export type Request = z.infer<typeof requestSchema>

export type RequestStatus = 'waiting' | 'calm'

/** Calm = past its soft expiry. Pure, derived from the clock (nothing is stored). */
export const statusAt = (request: Request, now: number): RequestStatus => (now >= request.expiresSoft ? 'calm' : 'waiting')
