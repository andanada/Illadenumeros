import { memo } from 'react'
import { swatch } from '../../../art/palette'
import { Shadow } from '../../../art/primitives'
import type { PaletteColor } from '../../../model/types'
import { FURNITURE_BY_ID } from './catalog'

export interface FurnitureArtProps {
  id: string
  color?: PaletteColor | undefined
  flip?: boolean | undefined
  lit?: boolean
  /** Height in px; omitted = fills the parent's height. */
  size?: number
  className?: string
}

/** A home piece as a standalone decorative svg, with the town's contact shadow under floor pieces. */
export const FurnitureArt = memo(function FurnitureArt({ id, color, flip = false, lit = false, size, className = '' }: FurnitureArtProps) {
  const def = FURNITURE_BY_ID[id]
  if (!def) return null
  const grounded = !def.wall && !def.flat
  const pad = grounded ? Math.max(8, def.h * 0.06) : 0
  const c = swatch(def.recolourable && color ? color : def.color)
  return (
    <svg
      viewBox={`0 0 ${def.w} ${def.h + pad}`}
      {...(size !== undefined ? { height: size, width: (size * def.w) / (def.h + pad) } : { height: '100%' })}
      aria-hidden="true"
      className={`pointer-events-none block overflow-visible ${className}`}
      data-furniture={def.id}
    >
      {grounded && <Shadow cx={def.w / 2} cy={def.h} rx={def.w * 0.42} long={def.w * 0.25} />}
      <g transform={flip ? `translate(${def.w} 0) scale(-1 1)` : undefined}>{def.render({ c, lit })}</g>
    </svg>
  )
})
