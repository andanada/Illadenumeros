import fc from 'fast-check'
import { PALETTE_COLORS, SCENE_IDS, SKIN_TONES } from '../../world/model/types'

/** fast-check generators of world docs (valid, with a few out-of-contract values mixed in). */

const catalogId = fc.constantFrom('sofa', 'llum', 'catifa', 'samarreta-ratlles', 'nyx', 'melo', 'Bad Id', 'a--b', 'x'.repeat(41))
const color = fc.constantFrom(...PALETTE_COLORS, 'verd')
const scene = fc.constantFrom(...SCENE_IDS, 'lluna')
const time = fc.constantFrom(0, 1, 5, 1_000, -1, 2.5)
const worn = fc.record({ item: catalogId, color })

const avatar = fc.record({
  skin: fc.constantFrom(...SKIN_TONES, 's9'),
  hair: fc.record({ style: catalogId, color }),
  eyes: catalogId,
  mouth: catalogId,
  top: worn,
  bottom: worn,
  shoes: worn,
  accessory: fc.option(worn, { nil: null }),
})

const placement = fc.record(
  {
    uid: fc.constantFrom('u1', 'u2', 'u3', '', 'x'.repeat(41)),
    item: catalogId,
    color,
    x: fc.constantFrom(0, 0.25, 1, 1.5),
    y: fc.constantFrom(0, 0.5, 1, -0.1),
    z: fc.constantFrom(0, 3, 999, 1000, 1.5),
    flip: fc.boolean(),
  },
  { requiredKeys: ['uid', 'item', 'x', 'y', 'z'] },
)

export const worldData = fc.record({
  id: fc.constantFrom('world', 'world', 'world', 'me'),
  avatar,
  owned: fc.array(catalogId, { maxLength: 5 }),
  placed: fc.dictionary(scene, fc.array(placement, { maxLength: 3 }), { maxKeys: 3 }),
  placedAt: fc.dictionary(scene, time, { maxKeys: 3 }),
  pets: fc.array(catalogId, { maxLength: 3 }),
  avatarUpdatedAt: time,
  petalsSpent: fc.oneof(fc.nat(500), fc.constant(-1), fc.constant(1.5)),
})

const nonNeg = (v: unknown): number => (typeof v === 'number' && v >= 0 ? Math.floor(v) : 0)
const sortedSet = (v: unknown): string[] => [...new Set(Array.isArray(v) ? (v as string[]) : [])].sort()
const inSceneOrder = (v: unknown): Record<string, unknown> => {
  const record = (v ?? {}) as Record<string, unknown>
  return Object.fromEntries(SCENE_IDS.flatMap((s) => (s in record ? [[s, record[s]]] : [])))
}

/** A world doc already in canonical form (what a real device stores), so merge(x, x) is x. */
export const canonicalWorld = (d: Record<string, unknown>): Record<string, unknown> => ({
  ...d,
  id: 'world',
  owned: sortedSet(d.owned),
  pets: sortedSet(d.pets),
  placed: inSceneOrder(d.placed),
  placedAt: inSceneOrder(d.placedAt),
  petalsSpent: nonNeg(d.petalsSpent),
  avatarUpdatedAt: nonNeg(d.avatarUpdatedAt),
})
