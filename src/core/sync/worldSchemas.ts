import { z } from 'zod'
import { PALETTE_COLORS, SCENE_IDS, SKIN_TONES } from '../../world/model/types'

/*
 * Client copy of the server's world doc format (server/src/lib/worldSchema.ts), with the same
 * bounds (timestamps capped like `msEpoch` so zod 3 and zod 4 agree on integers). The shapes are the
 * shared contract of src/world/model/types.ts plus `petalsSpent`, the monotonic coins-spent counter.
 */

export const CATALOG_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const MAX_WORLD_BYTES = 64 * 1024
export const MAX_OWNED = 2000
export const MAX_PETS = 50
export const MAX_PLACED_PER_SCENE = 200
export const MAX_COINS = 1_000_000_000

const catalogId = z.string().max(40).regex(CATALOG_ID_RE)
const color = z.enum(PALETTE_COLORS)
const sceneId = z.enum(SCENE_IDS)
const msEpoch = z.number().int().min(0).max(8_640_000_000_000_000)
const worn = z.object({ item: catalogId, color })

const avatarSchema = z.object({
  skin: z.enum(SKIN_TONES),
  hair: z.object({ style: catalogId, color }),
  eyes: catalogId,
  mouth: catalogId,
  top: worn,
  bottom: worn,
  shoes: worn,
  accessory: worn.nullable(),
})

const placementSchema = z.object({
  uid: z.string().min(1).max(40),
  item: catalogId,
  color: color.optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  z: z.number().int().min(0).max(999),
  flip: z.boolean().optional(),
})

export const worldDataSchema = z.object({
  id: z.literal('world'),
  avatar: avatarSchema,
  owned: z.array(catalogId).max(MAX_OWNED),
  placed: z.partialRecord(sceneId, z.array(placementSchema).max(MAX_PLACED_PER_SCENE)),
  placedAt: z.partialRecord(sceneId, msEpoch),
  pets: z.array(catalogId).max(MAX_PETS),
  avatarUpdatedAt: msEpoch,
  petalsSpent: z.number().int().min(0).max(MAX_COINS),
})
export type WorldData = z.infer<typeof worldDataSchema>
