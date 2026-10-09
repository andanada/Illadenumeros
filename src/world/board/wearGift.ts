import type { AvatarSpec, CatalogEntry } from '../model/types'

/** Clothing kinds a gift can be worn in. */
export const isWearable = (entry: Pick<CatalogEntry, 'kind'>): boolean => entry.kind === 'top' || entry.kind === 'bottom' || entry.kind === 'shoes' || entry.kind === 'accessory'

/** «Posa-t’ho!»: her look with the gift on (same colour she wore in that slot). Other kinds: unchanged. */
export function wearGift(spec: AvatarSpec, entry: Pick<CatalogEntry, 'id' | 'kind'>): AvatarSpec {
  switch (entry.kind) {
    case 'top':
    case 'bottom':
    case 'shoes':
      return { ...spec, [entry.kind]: { item: entry.id, color: spec[entry.kind].color } }
    case 'accessory':
      return { ...spec, accessory: { item: entry.id, color: spec.accessory?.color ?? 'mango' } }
    default:
      return spec
  }
}
