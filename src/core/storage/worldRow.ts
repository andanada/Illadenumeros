import { z } from 'zod'
import { worldDocSchema } from '../../world/model/types'

/**
 * The per-player `world` row (Dexie table `world`, primary key `id` = 'world'): the shared WorldDoc
 * contract plus `petalsSpent`, the MONOTONIC count of coins spent in the town.
 *
 * Coins ("monedes") = max(0, rewards.petals - petalsSpent). `rewards.petals` keeps meaning "earned"
 * (its schema and max-merge never change), so syncing a device that has more petals can never
 * resurrect coins already spent elsewhere: petalsSpent is max-merged too.
 */
export const WORLD_ROW_ID = 'world'

export const worldRowSchema = worldDocSchema.extend({
  petalsSpent: z.number().int().min(0).max(1_000_000_000),
})
export type WorldRow = z.infer<typeof worldRowSchema>

export const coinsOf = (petals: number, petalsSpent: number): number => Math.max(0, petals - petalsSpent)

type Listener = (dbName: string) => void
let listeners: readonly Listener[] = []

/** The world row of `dbName` was rewritten outside the town store (sync pull, backup, reset). */
export function onWorldStored(listener: Listener): () => void {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function emitWorldStored(dbName: string): void {
  for (const listener of listeners) {
    try {
      listener(dbName)
    } catch {
      // A listener must never break a sync or a restore.
    }
  }
}
