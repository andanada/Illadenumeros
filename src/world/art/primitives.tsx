import { memo, useMemo, type SVGProps } from 'react'
import { INK } from './palette'
import { blobPath, softRectPath, sparklePath, type BlobOptions, type SoftRectOptions } from './paths'

type PathAttrs = Omit<SVGProps<SVGPathElement>, 'd' | 'ref'>

/** Organic lumpy shape. Memoised: the path is computed once per seed/size. */
export const Blob = memo(function Blob({ cx, cy, rx, ry, points, wobble, seed, ...rest }: BlobOptions & PathAttrs) {
  const d = useMemo(() => blobPath({ cx, cy, rx, ry, points, wobble, seed }), [cx, cy, rx, ry, points, wobble, seed])
  return <path d={d} {...rest} />
})

/** Rounded rectangle with a hand-cut wobble on its sides. */
export const Soft = memo(function Soft({ x, y, w, h, r, wobble, seed, ...rest }: SoftRectOptions & PathAttrs) {
  const d = useMemo(() => softRectPath({ x, y, w, h, r, wobble, seed }), [x, y, w, h, r, wobble, seed])
  return <path d={d} {...rest} />
})

/**
 * Light comes from the upper left, so every object casts a soft contact pool plus a long flat
 * shadow stretching to the lower right. Both are translucent ink, never black, never blurred
 * (no filters: cheap on tablets).
 */
export interface ShadowProps {
  /** Centre of the contact point on the ground. */
  cx: number
  cy: number
  /** Half width of the object footprint. */
  rx: number
  /** Length of the long shadow (0 = contact pool only). */
  long?: number
  opacity?: number
}

export const Shadow = memo(function Shadow({ cx, cy, rx, long = 0, opacity = 1 }: ShadowProps) {
  const ry = Math.max(2, rx * 0.16)
  return (
    <g aria-hidden="true" opacity={opacity} pointerEvents="none">
      {long > 0 && (
        <path
          d={`M${cx - rx * 0.85} ${cy} Q${cx} ${cy + ry * 1.8} ${cx + rx * 0.85} ${cy} L${cx + rx * 0.85 + long} ${cy + long * 0.32} Q${cx + long * 0.85} ${cy + long * 0.32 + ry * 2.4} ${cx - rx * 0.6 + long * 0.7} ${cy + long * 0.3} Z`}
          fill={INK.shadow}
          opacity={0.07}
        />
      )}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={INK.shadow} opacity={0.14} />
    </g>
  )
})

export interface SparkleProps {
  cx: number
  cy: number
  size: number
  fill?: string
  opacity?: number
}

/** Four-point twinkle used for magic, shine on glass, coins and "new" badges. */
export const Sparkle = memo(function Sparkle({ cx, cy, size, fill = INK.white, opacity = 1 }: SparkleProps) {
  return <path d={sparklePath(cx, cy, size)} fill={fill} opacity={opacity} aria-hidden="true" />
})
