import { z } from 'zod'
import type { Rect } from './logic/zones'

const fraction = z.number().min(0).max(1)

/** Options of `spawn` / `place`, validated where a place calls them. */
export const placeSchema = z.object({ room: z.string().min(1), at: z.object({ x: fraction, y: fraction }) })
export const spawnSchema = placeSchema.extend({
  uid: z.string().min(1).max(60).optional(),
  qty: z.number().int().min(1).max(999).optional(),
  zone: z.string().min(1).optional(),
})
export type PlaceOptions = z.infer<typeof placeSchema>
export type SpawnOptions = z.infer<typeof spawnSchema>

/**
 * A counting zone: a basket, bowl, tray, cash drawer or the clips on a head. It lays what is put in it
 * out in neat slots and reports what it holds. It shows no number unless `showCount` is set.
 */
export interface ZoneDef {
  readonly id: string
  readonly room: string
  /** Fractions of the stage. */
  readonly rect: Rect
  /** Catalan with article: «la cistella». */
  readonly label: string
  /** Which defs it takes (default: all). */
  readonly accepts?: (defId: string) => boolean
  readonly capacity?: number
  readonly cols?: number
  /** Announce «ara hi ha N» to screen readers when something lands (default true). */
  readonly announceCount?: boolean
  /** Draw the number on the zone (default false: counting is the child's job). */
  readonly showCount?: boolean
  /** Hide the dashed outline when nobody carries anything (default false). */
  readonly quiet?: boolean
  /** A thing just landed in the zone. */
  readonly onDrop?: (event: { zone: string; uid: string; def: string; count: number }) => void
  /** The zone's contents changed (also when things leave or are removed). */
  readonly onChange?: (event: { zone: string; counts: Readonly<Record<string, number>>; total: number }) => void
}

export interface ChangeEvent {
  readonly zone: string
  readonly counts: Readonly<Record<string, number>>
  readonly total: number
}
