import { registerCatalog } from '../../../data'
import type { CatalogEntry } from '../../../model/types'
import { DECOR } from './decor'
import { SEATING } from './seating'
import { STORAGE } from './storage'
import type { FurnitureDef, RoomId } from './types'

/** Every piece of the home, cheapest first. */
export const FURNITURE: readonly FurnitureDef[] = [...SEATING, ...STORAGE, ...DECOR].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'ca'))

export const FURNITURE_BY_ID: Readonly<Record<string, FurnitureDef>> = Object.fromEntries(FURNITURE.map((f) => [f.id, f]))

/** Prices the data layer trusts (bought with coins; price 0 = starter pieces, free). */
export const CASA_CATALOG: readonly CatalogEntry[] = FURNITURE.map((f) => ({ id: f.id, kind: 'furniture', name: f.name, price: f.price, scene: 'casa' }))

/** Registers the home's furniture prices (idempotent: entries are replaced by id). */
export const registerCasaCatalog = (): number => registerCatalog(CASA_CATALOG)

/** The pieces for a room's catalogue page: the ones suggested for it first, then the rest. */
export const furnitureFor = (room: RoomId): readonly FurnitureDef[] => [...FURNITURE.filter((f) => f.room === room), ...FURNITURE.filter((f) => f.room !== room)]

const FEMININE = new Set(['cadira', 'taula', 'tauleta', 'butaca', 'catifa-rodona', 'catifa-ratlles', 'lampada-peu', 'planta-test', 'prestatgeria', 'peixera', 'garlanda-llums'])

/** "el sofà", "la cadira", "l’armari" (for announcements: "Has posat el sofà a la sala"). */
export function withArticle(def: FurnitureDef): string {
  const name = def.name.charAt(0).toLowerCase() + def.name.slice(1)
  if (/^[aeiouàèéíòóú]/i.test(name)) return `l’${name}`
  return `${FEMININE.has(def.id) ? 'la' : 'el'} ${name}`
}
