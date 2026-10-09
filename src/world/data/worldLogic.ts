import { coinsOf, type WorldRow } from '../../core/storage/worldRow'
import { avatarSpecSchema, placementSchema, type AvatarSpec, type CatalogEntry, type Placement, type SceneId } from '../model/types'
import { catalogEntry, isFree } from './catalog'

/*
 * Pure town rules. Every function returns a NEW row (inputs are never mutated) or a reason in
 * Catalan-agnostic codes the UI can map to a friendly message.
 */

export type WorldFailure = 'invalid' | 'not-owned' | 'not-enough-coins' | 'unknown-item' | 'not-found' | 'no-player' | 'storage'
export type WorldResult = { ok: true; row: WorldRow } | { ok: false; reason: WorldFailure }
export type BuyResult = { ok: true; row: WorldRow; charged: number } | { ok: false; reason: WorldFailure }

export const MAX_PLACED_PER_SCENE = 200

/** Strictly after `previous`, so a change always wins the last-writer-wins merge against itself. */
const stamp = (previous: number | undefined, now: number): number => Math.max(Math.floor(now), (previous ?? -1) + 1)

const owns = (row: WorldRow, id: string): boolean => row.owned.includes(id)
const canUse = (row: WorldRow, id: string): boolean => owns(row, id) || isFree(id)

/** Buys at the catalogue price. Already owned: no charge (idempotent). Food is consumed, never owned. */
export function buy(row: WorldRow, entry: CatalogEntry, petals: number): BuyResult {
  const known = catalogEntry(entry.id)
  if (!known || known.price !== entry.price || known.kind !== entry.kind) return { ok: false, reason: 'unknown-item' }
  const consumable = known.kind === 'food'
  if (!consumable && owns(row, known.id)) return { ok: true, row, charged: 0 }
  if (coinsOf(petals, row.petalsSpent) < known.price) return { ok: false, reason: 'not-enough-coins' }
  const owned = consumable ? row.owned : [...row.owned, known.id].sort()
  return { ok: true, row: { ...row, owned, petalsSpent: row.petalsSpent + known.price }, charged: known.price }
}

/** Wearable parts must be owned or free; face features (eyes, mouth) are identity and always allowed. */
export function setAvatar(row: WorldRow, spec: AvatarSpec, now: number): WorldResult {
  const parsed = avatarSpecSchema.safeParse(spec)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const a = parsed.data
  const parts = [a.hair.style, a.top.item, a.bottom.item, a.shoes.item, ...(a.accessory ? [a.accessory.item] : [])]
  const current = new Set([row.avatar.hair.style, row.avatar.top.item, row.avatar.bottom.item, row.avatar.shoes.item, row.avatar.accessory?.item])
  // What she already wears stays wearable (e.g. a default part no longer in the catalogue).
  if (!parts.every((id) => canUse(row, id) || current.has(id))) return { ok: false, reason: 'not-owned' }
  return { ok: true, row: { ...row, avatar: a, avatarUpdatedAt: stamp(row.avatarUpdatedAt, now) } }
}

const withScene = (row: WorldRow, scene: SceneId, list: Placement[], now: number): WorldRow => ({
  ...row,
  placed: { ...row.placed, [scene]: list },
  placedAt: { ...row.placedAt, [scene]: stamp(row.placedAt[scene], now) },
})

export function place(row: WorldRow, scene: SceneId, placement: Placement, now: number): WorldResult {
  const parsed = placementSchema.safeParse(placement)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  if (!canUse(row, parsed.data.item)) return { ok: false, reason: 'not-owned' }
  const list = row.placed[scene] ?? []
  if (list.length >= MAX_PLACED_PER_SCENE || list.some((p) => p.uid === parsed.data.uid)) return { ok: false, reason: 'invalid' }
  return { ok: true, row: withScene(row, scene, [...list, parsed.data], now) }
}

export type PlacementPatch = Partial<Pick<Placement, 'x' | 'y' | 'z' | 'flip' | 'color'>>

export function move(row: WorldRow, scene: SceneId, uid: string, patch: PlacementPatch, now: number): WorldResult {
  const list = row.placed[scene] ?? []
  const current = list.find((p) => p.uid === uid)
  if (!current) return { ok: false, reason: 'not-found' }
  const parsed = placementSchema.safeParse({ ...current, ...patch, uid, item: current.item })
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  return { ok: true, row: withScene(row, scene, list.map((p) => (p.uid === uid ? parsed.data : p)), now) }
}

export function remove(row: WorldRow, scene: SceneId, uid: string, now: number): WorldResult {
  const list = row.placed[scene] ?? []
  if (!list.some((p) => p.uid === uid)) return { ok: false, reason: 'not-found' }
  return { ok: true, row: withScene(row, scene, list.filter((p) => p.uid !== uid), now) }
}

/** A pet must be a catalogue pet, bought (owned) or free. Adopting twice changes nothing. */
export function adopt(row: WorldRow, petId: string): WorldResult {
  if (catalogEntry(petId)?.kind !== 'pet') return { ok: false, reason: 'unknown-item' }
  if (!canUse(row, petId)) return { ok: false, reason: 'not-owned' }
  if (row.pets.includes(petId)) return { ok: true, row }
  return { ok: true, row: { ...row, pets: [...row.pets, petId].sort() } }
}

/** A free gift (the daily board's surprise): owned without charging. Idempotent; food is never owned. */
export function grant(row: WorldRow, itemId: string): WorldResult {
  const known = catalogEntry(itemId)
  if (!known || known.kind === 'food') return { ok: false, reason: 'unknown-item' }
  if (owns(row, known.id)) return { ok: true, row }
  return { ok: true, row: { ...row, owned: [...row.owned, known.id].sort() } }
}
