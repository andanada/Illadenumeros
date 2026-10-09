import { memo } from 'react'
import { PALETTE as P } from '../../../art/palette'
import type { PaletteColor } from '../../../model/types'
import { swatch } from '../../../art/palette'

export const CLIP_COLOURS: readonly PaletteColor[] = ['rosa', 'cel', 'mango', 'menta', 'lila', 'coral']

/** A hair clip (snap clip with a little bow), flat and outline-free, in a 40 × 30 box. */
export const ClipArt = memo(function ClipArt({ size = 32, color = 'rosa' }: { size?: number; color?: PaletteColor }) {
  const c = swatch(color)
  return (
    <svg viewBox="0 0 40 30" width={(size * 40) / 30} height={size} aria-hidden="true" className="pointer-events-none block overflow-visible">
      <rect x="3" y="14" width="34" height="11" rx="5.5" fill={c.shade} />
      <rect x="3" y="11" width="34" height="11" rx="5.5" fill={c.base} />
      <rect x="8" y="13.5" width="14" height="3" rx="1.5" fill={c.light} />
      <path d="M20 8 Q10 -2 8 7 Q10 14 20 8 Z" fill={P.neu.base} />
      <path d="M20 8 Q30 -2 32 7 Q30 14 20 8 Z" fill={P.neu.shade} />
      <circle cx="20" cy="8" r="3.4" fill={c.light} />
    </svg>
  )
})

/** The clip of the n-th slot / take: colours go round so groups are easy to tell apart. */
export const clipColour = (index: number): PaletteColor => CLIP_COLOURS[index % CLIP_COLOURS.length] ?? 'rosa'
