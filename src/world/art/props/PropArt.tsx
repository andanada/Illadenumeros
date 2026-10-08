import { memo } from 'react'
import type { PaletteColor } from '../../model/types'
import { Shadow } from '../primitives'
import { PROPS_BY_ID } from './registry'

export interface PropArtProps {
  id: string
  /** Rendered height in px (width follows the prop's aspect). Default: the prop's natural height. */
  size?: number
  color?: PaletteColor
  label?: string
  /** Add the house contact + long shadow under grounded props. Default true. */
  shadow?: boolean
  /** Accessible name; defaults to the prop's Catalan name. Pass '' for decorative. */
  title?: string
  className?: string
}

/**
 * A prop as a standalone <svg>. Inside a larger SVG scene, use the def directly instead:
 * `<g transform="translate(x y)">{PROPS_BY_ID[id].render({ color })}</g>`.
 */
export const PropArt = memo(function PropArt({ id, size, color, label, shadow = true, title, className }: PropArtProps) {
  const def = PROPS_BY_ID[id]
  if (!def) return null
  const pad = shadow && !def.floating ? Math.max(8, def.h * 0.06) : 0
  const height = size ?? def.h
  const name = title ?? def.name
  return (
    <svg
      viewBox={`0 0 ${def.w} ${def.h + pad}`}
      height={height}
      width={(height * def.w) / (def.h + pad)}
      className={className}
      role={name ? 'img' : undefined}
      aria-label={name || undefined}
      aria-hidden={name ? undefined : true}
      data-prop={def.id}
      style={{ overflow: 'visible' }}
    >
      {pad > 0 && <Shadow cx={def.w / 2} cy={def.h} rx={def.w * 0.42} long={def.w * 0.3} />}
      {def.render({ color, label })}
    </svg>
  )
})
