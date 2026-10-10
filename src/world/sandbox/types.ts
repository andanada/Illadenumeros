import { z } from 'zod'
import { avatarSpecSchema } from '../model/types'

/** Who can be on stage. Validated where scenes hand their cast to the sandbox. */
const point = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })

export const actorSeedSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(['avatar', 'neighbour', 'pet']),
  /** Catalan with article, for announcements: «la Laia», «el Nyx». */
  name: z.string().min(1).max(60),
  at: point,
  facing: z.union([z.literal(1), z.literal(-1)]).optional(),
  /** kind avatar. */
  avatar: avatarSpecSchema.optional(),
  /** kind neighbour: a preset id or a crowd seed. */
  neighbour: z.string().optional(),
  /** kind pet: a PetId (nyx, mixa, blau, nuvol, melo). */
  pet: z.enum(['nyx', 'mixa', 'blau', 'nuvol', 'melo']).optional(),
  /** Pets only: id of the actor they trail at a distance. */
  follow: z.string().optional(),
  /** Item defs this character adores (extra happy when given). */
  loves: z.array(z.string()).optional(),
})
export type ActorSeed = z.infer<typeof actorSeedSchema>

export const parseSeeds = (seeds: readonly unknown[]): ActorSeed[] => seeds.map((s) => actorSeedSchema.parse(s))

/** A thing actors can sit on (sofa, chair, bench, bus seat). Positions are scene fractions. */
export interface SeatDef {
  readonly id: string
  /** Catalan with article: «el sofà». */
  readonly label: string
  /** Where the actor sits (their feet). */
  readonly at: { x: number; y: number }
  readonly facing?: 1 | -1
}

/** A door: walking into it moves the actor (and what they carry) to `to`. */
export interface DoorDef {
  readonly id: string
  readonly label: string
  readonly at: { x: number; y: number }
  /** Room the door leads to (any id the host understands: a room, a place). */
  readonly to: string
  /** Where the actor appears on the other side. */
  readonly arrive: { x: number; y: number }
  /** Size of the door on screen, fractions of the stage (default 0.13 × 0.38). Its feet are at `at`. */
  readonly box?: { w: number; h: number }
}

/** A table, shelf or counter where a carried object can be put down. */
export interface SurfaceDef {
  readonly id: string
  readonly label: string
  /** Where the object ends up. */
  readonly at: { x: number; y: number }
  /** Where the actor stands to do it. */
  readonly stand: { x: number; y: number }
}
