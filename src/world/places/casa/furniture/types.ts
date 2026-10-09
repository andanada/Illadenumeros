import type { ReactNode } from 'react'
import type { Swatch } from '../../../art/palette'
import type { PaletteColor } from '../../../model/types'

export type RoomId = 'sala' | 'habitacio' | 'cuina'

export interface FurnitureRender {
  /** Main colour (recolourable pieces) — the piece's default otherwise. */
  c: Swatch
  /** Lamps: switched on. */
  lit: boolean
}

/**
 * A piece of furniture or decoration of the home, drawn in its own (0,0)–(w,h) box, anchored bottom-centre
 * like every town prop. Sizes are in "room units": a room is 600 units tall.
 */
export interface FurnitureDef {
  id: string
  name: string
  /** Coins (0 = starter, free). */
  price: number
  w: number
  h: number
  /** Default colour; recolourable pieces can cycle through the palette. */
  color: PaletteColor
  recolourable?: boolean
  /** Hangs on the wall (no floor shadow). */
  wall?: boolean
  /** Flat on the floor (rugs): always behind the rest. */
  flat?: boolean
  /** Interactions: lamps switch on and off, the bed puts her to sleep. */
  action?: 'lamp' | 'bed'
  /** Room it is shown first for in the catalogue. */
  room: RoomId
  render: (o: FurnitureRender) => ReactNode
}
