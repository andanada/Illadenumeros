import { z } from 'zod'

/*
 * The per-player town document (kind 'world', key 'world'). Copied from the client
 * (src/world/model/types.ts + src/core/sync/worldSchemas.ts): the server is deployed on its own,
 * so it never imports client code. A contract test checks that both copies accept the same docs.
 *
 * `petalsSpent` is the MONOTONIC count of coins spent in the town. Coins shown to the child are
 * `max(0, rewards.petals - world.petalsSpent)`: petals stay "earned" (max-merged as before) and
 * spending never lowers them, so a max-merge of rewards can never resurrect spent coins.
 */

export const SKIN_TONES = ['s1', 's2', 's3', 's4', 's5', 's6'] as const
export const PALETTE_COLORS = ['coral', 'mango', 'llima', 'menta', 'cel', 'lila', 'rosa', 'xocolata', 'neu', 'carbo'] as const
export const SCENE_IDS = ['casa', 'botiga', 'autobus', 'perruqueria', 'fleca', 'granja', 'pizzeria', 'recreatius', 'mercat'] as const
export type SceneId = (typeof SCENE_IDS)[number]

export const CATALOG_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** Owned + placements of a busy town fit easily; a merge that outgrows it is rejected (422). */
export const MAX_WORLD_BYTES = 64 * 1024
export const MAX_OWNED = 2000
export const MAX_PETS = 50
export const MAX_PLACED_PER_SCENE = 200

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

/** zod 3: a record with an enum key is partial and rejects unknown keys. */
export const worldDataSchema = z.object({
  id: z.literal('world'),
  avatar: avatarSchema,
  owned: z.array(catalogId).max(MAX_OWNED),
  placed: z.record(sceneId, z.array(placementSchema).max(MAX_PLACED_PER_SCENE)),
  placedAt: z.record(sceneId, msEpoch),
  pets: z.array(catalogId).max(MAX_PETS),
  avatarUpdatedAt: msEpoch,
  petalsSpent: z.number().int().min(0).max(1_000_000_000),
})
export type WorldData = z.infer<typeof worldDataSchema>
export type Placement = z.infer<typeof placementSchema>
