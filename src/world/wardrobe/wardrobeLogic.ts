import { STARTER_WEARABLES, WEARABLES_BY_ID } from '../characters'
import type { WorldFailure } from '../data'
import type { AvatarSpec } from '../model/types'

/** Pure rules of the wardrobe (L’armari). Inputs are never mutated. */

/** What she can wear for free: what she bought plus the starter set everybody owns. */
export function wardrobeOwned(bought: readonly string[]): readonly string[] {
  return [...new Set([...bought, ...STARTER_WEARABLES])]
}

/** Every worn part id: hair, top, bottom, shoes and the accessory (if any). */
export function wornIds(spec: AvatarSpec): readonly string[] {
  return [spec.hair.style, spec.top.item, spec.bottom.item, spec.shoes.item, ...(spec.accessory ? [spec.accessory.item] : [])]
}

/** Price to show on a tile: only for priced clothes she does not own yet. */
export function priceTag(id: string, owned: readonly string[]): number | undefined {
  const entry = WEARABLES_BY_ID[id]
  if (!entry || entry.price <= 0 || owned.includes(id)) return undefined
  return entry.price
}

/** Parts she is trying on that still need buying (what she started with always stays wearable). */
export function unownedWorn(spec: AvatarSpec, owned: readonly string[], started: AvatarSpec): readonly string[] {
  const before = new Set(wornIds(started))
  return wornIds(spec).filter((id) => !before.has(id) && priceTag(id, owned) !== undefined)
}

export type BuyOutcome = { ok: true; charged: number } | { ok: false; reason: WorldFailure }

export const NOT_ENOUGH = 'No tens prou monedes encara: fes encàrrecs!'

/** What the wardrobe says after trying to buy `name`. Never scolding. */
export function buyFeedback(outcome: BuyOutcome, name: string): string {
  if (outcome.ok) return `Comprat! ${name} ja és al teu armari.`
  if (outcome.reason === 'not-enough-coins') return NOT_ENOUGH
  return 'Ui, no s’ha pogut comprar. Torna-ho a provar!'
}
