import { z } from 'zod'

/**
 * Shared contract of the town ("El Poble dels Números").
 * Art (src/world/art, src/world/characters), scenes/places (src/world/scene, src/world/places)
 * and data (src/world/data) all depend on these shapes and nothing else of each other.
 * Catalogue ids are free strings validated by pattern, so new clothes/furniture never need a schema change.
 */

const catalogId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40)

export const SKIN_TONES = ['s1', 's2', 's3', 's4', 's5', 's6'] as const
export const PALETTE_COLORS = ['coral', 'mango', 'llima', 'menta', 'cel', 'lila', 'rosa', 'xocolata', 'neu', 'carbo'] as const

export const paletteColorSchema = z.enum(PALETTE_COLORS)
export type PaletteColor = z.infer<typeof paletteColorSchema>

const wornSchema = z.object({ item: catalogId, color: paletteColorSchema })
export type Worn = z.infer<typeof wornSchema>

export const avatarSpecSchema = z.object({
  skin: z.enum(SKIN_TONES),
  hair: z.object({ style: catalogId, color: paletteColorSchema }),
  eyes: catalogId,
  mouth: catalogId,
  top: wornSchema,
  bottom: wornSchema,
  shoes: wornSchema,
  accessory: wornSchema.nullable(),
})
export type AvatarSpec = z.infer<typeof avatarSpecSchema>

/** Something placed in a scene (furniture, toys, plants). x/y are fractions 0..1 of the scene size. */
export const placementSchema = z.object({
  uid: z.string().min(1).max(40),
  item: catalogId,
  color: paletteColorSchema.optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  z: z.number().int().min(0).max(999),
  flip: z.boolean().optional(),
})
export type Placement = z.infer<typeof placementSchema>

export const SCENE_IDS = ['casa', 'botiga', 'autobus', 'perruqueria', 'fleca', 'granja', 'pizzeria', 'recreatius', 'mercat'] as const
export const sceneIdSchema = z.enum(SCENE_IDS)
export type SceneId = z.infer<typeof sceneIdSchema>

/** One document per player. Coins are NOT here: they reuse `rewards.petals` (shown as "monedes"). */
export const worldDocSchema = z.object({
  id: z.literal('world'),
  avatar: avatarSpecSchema,
  /** Catalogue ids bought (clothes, furniture, pets). Merge = union. */
  owned: z.array(catalogId).max(2000),
  /** Placed objects per scene. Merge = last writer wins per scene (placedAt). */
  placed: z.partialRecord(sceneIdSchema, z.array(placementSchema).max(200)),
  placedAt: z.partialRecord(sceneIdSchema, z.number().int().min(0)),
  /** Adopted companions (the old mascots: nyx, mixa, blau, nuvol, melo). Merge = union. */
  pets: z.array(catalogId).max(50),
  avatarUpdatedAt: z.number().int().min(0),
})
export type WorldDoc = z.infer<typeof worldDocSchema>

/** What a shop shelf or wardrobe sells. Prices in coins (= petals). */
export interface CatalogEntry {
  id: string
  kind: 'top' | 'bottom' | 'shoes' | 'accessory' | 'hair' | 'furniture' | 'pet' | 'food'
  name: string
  price: number
  /** Scene where furniture can be placed; undefined = anywhere at home. */
  scene?: SceneId
}
