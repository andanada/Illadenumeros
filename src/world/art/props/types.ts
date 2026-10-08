import type { CSSProperties, ReactNode } from 'react'
import type { PaletteColor } from '../../model/types'

/** Options every prop renderer accepts. Unused ones are ignored. */
export interface PropOptions {
  /** Recolour (only for props marked `recolourable`). */
  color?: PaletteColor
  /** Text on the prop (price tags, signs). */
  label?: string
}

/**
 * A drawable object of the town. Drawn in its own box (0,0)–(w,h), anchored bottom-centre:
 * the ground contact is at (w/2, h). Shadows are NOT included, so scenes can light them consistently
 * (use <Shadow cx={w/2} cy={h} rx={w*0.4} long={…}/> or let <PropArt shadow/> add one).
 */
export interface PropDef {
  /** Stable kebab-case id (used in placements and catalogues). */
  id: string
  /** Catalan name, also the accessible name. */
  name: string
  group: 'botiga' | 'diners' | 'carrer' | 'cel'
  w: number
  h: number
  recolourable?: boolean
  /** Floating things (sun, clouds, coins in hand) get no ground shadow. */
  floating?: boolean
  /** Façades: the door box in prop coordinates (tap target / zoom-in origin for the scene). */
  door?: { x: number; y: number; w: number; h: number }
  render: (o: PropOptions) => ReactNode
}

/** Shared text style for numbers and signs drawn inside SVG. */
export const SVG_TEXT: CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 700 }
