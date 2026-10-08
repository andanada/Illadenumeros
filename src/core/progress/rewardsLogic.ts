import { decorById } from '../../features/decor/catalog'
import { badgeOf, regularOf, RARITY_WEIGHT, STICKERS, stickerById, type Sticker } from '../../features/stickers/catalog'
import type { Rewards } from '../storage/db'

/** Petals given when a whole sticker series is complete. */
export const SERIES_BONUS_PETALS = 25

/** Petals still free to spend: what was earned minus the price of what was bought (never below 0). */
export function petalBalance(rewards: Pick<Rewards, 'petals' | 'decorOwned'>): number {
  const spent = rewards.decorOwned.reduce((sum, id) => sum + (decorById(id)?.price ?? 0), 0)
  return Math.max(0, rewards.petals - spent)
}

export type BuyResult = { ok: true; rewards: Rewards } | { ok: false; reason: 'desconegut' | 'ja-comprat' | 'petals' }

export function buyDecor(rewards: Rewards, id: string): BuyResult {
  const item = decorById(id)
  if (!item) return { ok: false, reason: 'desconegut' }
  if (rewards.decorOwned.includes(id)) return { ok: false, reason: 'ja-comprat' }
  if (petalBalance(rewards) < item.price) return { ok: false, reason: 'petals' }
  return { ok: true, rewards: { ...rewards, decorOwned: [...rewards.decorOwned, id] } }
}

/** Ids currently placed that the child really owns and that still exist (ignores anything stale). */
export const placedItems = (rewards: Pick<Rewards, 'decorOwned' | 'decorPlaced'>): string[] =>
  rewards.decorPlaced.filter((id) => rewards.decorOwned.includes(id) && decorById(id) !== undefined)

/** Puts an owned item in its spot (replacing the one there) or takes it out when it is already placed. */
export function togglePlaced(rewards: Rewards, id: string): Rewards {
  const item = decorById(id)
  if (!item || !rewards.decorOwned.includes(id)) return rewards
  const current = placedItems(rewards)
  if (current.includes(id)) return { ...rewards, decorPlaced: current.filter((p) => p !== id) }
  const others = current.filter((p) => decorById(p)?.spot !== item.spot)
  return { ...rewards, decorPlaced: [...others, id] }
}

export interface StickerGrant {
  rewards: Rewards
  /** Newly owned sticker ids, the one asked for first, then the series badge if it completed a series. */
  gained: string[]
}

/** Adds a sticker; if that completes its series the master badge and a petal bonus follow. Idempotent. */
export function addSticker(rewards: Rewards, id: string): StickerGrant {
  const sticker = stickerById(id)
  if (!sticker || rewards.stickers.includes(id)) return { rewards, gained: [] }
  let next: Rewards = { ...rewards, stickers: [...rewards.stickers, id] }
  const gained = [id]
  const badge = badgeOf(sticker.series)
  const complete = regularOf(sticker.series).every((s) => next.stickers.includes(s.id))
  if (sticker.source !== 'serie' && badge && complete && !next.stickers.includes(badge.id)) {
    next = { ...next, stickers: [...next.stickers, badge.id], petals: next.petals + SERIES_BONUS_PETALS }
    gained.push(badge.id)
  }
  return { rewards: next, gained }
}

/** Chest pool: not owned, won from games, weighted by rarity. `roll` in [0, 1). */
export function pickChestSticker(owned: readonly string[], roll: number): Sticker | undefined {
  const pool = STICKERS.filter((s) => s.source === 'joc' && !owned.includes(s.id))
  const total = pool.reduce((sum, s) => sum + RARITY_WEIGHT[s.rarity], 0)
  if (total <= 0) return undefined
  let target = Math.min(Math.max(roll, 0), 0.999999) * total
  for (const s of pool) {
    target -= RARITY_WEIGHT[s.rarity]
    if (target < 0) return s
  }
  return pool[pool.length - 1]
}
