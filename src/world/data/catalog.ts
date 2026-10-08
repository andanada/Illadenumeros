import { z } from 'zod'
import { SCENE_IDS, type CatalogEntry } from '../model/types'
import { WEARABLES } from '../characters/wearables'

/**
 * Prices the data layer trusts. Wearables come from src/world/characters/wearables.ts; places register
 * their furniture, pets and food with `registerCatalog` (validated). The registry is replaced, never mutated.
 */
export const catalogEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40),
  kind: z.enum(['top', 'bottom', 'shoes', 'accessory', 'hair', 'furniture', 'pet', 'food']),
  name: z.string().min(1).max(60),
  price: z.number().int().min(0).max(100_000),
  scene: z.enum(SCENE_IDS).optional(),
})

const byId = (entries: readonly CatalogEntry[]): ReadonlyMap<string, CatalogEntry> => new Map(entries.map((e) => [e.id, e]))

let registry: ReadonlyMap<string, CatalogEntry> = byId(WEARABLES)

/** Adds (or replaces by id) entries. Invalid entries are ignored; returns how many were accepted. */
export function registerCatalog(entries: readonly CatalogEntry[]): number {
  const valid = entries.flatMap((e) => {
    const parsed = catalogEntrySchema.safeParse(e)
    return parsed.success ? [parsed.data] : []
  })
  registry = byId([...registry.values(), ...valid])
  return valid.length
}

export const catalogEntry = (id: string): CatalogEntry | undefined => registry.get(id)

/** Free = known to the catalogue with price 0 (the starter set: every default-avatar part, all hair). */
export const isFree = (id: string): boolean => catalogEntry(id)?.price === 0

/** For tests: back to the wearables only. */
export function resetCatalogForTest(): void {
  registry = byId(WEARABLES)
}
