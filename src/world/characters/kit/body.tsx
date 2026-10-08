import type { CSSProperties, ReactNode } from 'react'
import { INK, type Swatch } from '../../art/palette'
import { ARM_LEN, ARM_W, HEAD_PATH, type Geometry, type Look, type Sleeve } from './geometry'

export function Head({ skin }: { skin: Swatch }) {
  return (
    <g>
      <circle cx={40} cy={106} r={12} fill={skin.base} />
      <circle cx={160} cy={106} r={12} fill={skin.shade} />
      <circle cx={42} cy={106} r={5.5} fill={skin.shade} />
      <path d={HEAD_PATH} fill={skin.base} />
      {/* Flat turned-away side of the face, right/bottom, lit from the upper left. */}
      <path d="M150 70 C166 96 160 136 128 148 C150 128 156 100 150 70 Z" fill={skin.shade} opacity={0.45} />
    </g>
  )
}

const SLEEVE_LEN: Readonly<Record<Sleeve, number>> = { none: 0, short: 20, long: ARM_LEN - 4 }

export interface ArmProps {
  x: number
  y: number
  angle: number
  skin: Swatch
  sleeve: Sleeve
  cloth: Swatch
  /** Extra CSS class (wave / cheer loops). */
  loop?: string
  /** Held item, drawn upright at the hand. */
  holding?: ReactNode
}

/**
 * One arm hanging from (x, y). Rotation goes through CSS (transform-box: view-box) so pose
 * changes ease with a bouncy transition and loops can run without JS.
 */
export function Arm({ x, y, angle, skin, sleeve, cloth, loop, holding }: ArmProps) {
  const pivot: CSSProperties = { transformBox: 'view-box', transformOrigin: `${x}px ${y}px` }
  const sleeveLen = SLEEVE_LEN[sleeve]
  const hy = y + ARM_LEN
  return (
    <g className="world-arm" style={{ ...pivot, transform: `rotate(${angle}deg)` }}>
      <g className={loop} style={pivot}>
        <rect x={x - ARM_W / 2} y={y - 6} width={ARM_W} height={ARM_LEN} rx={ARM_W / 2} fill={skin.base} />
        {sleeveLen > 0 && <rect x={x - ARM_W / 2 - 2} y={y - 10} width={ARM_W + 4} height={sleeveLen + 10} rx={(ARM_W + 4) / 2} fill={cloth.base} />}
        {sleeveLen > 0 && <rect x={x - ARM_W / 2 - 2} y={y + sleeveLen - 6} width={ARM_W + 4} height={6} rx={3} fill={cloth.shade} />}
        {holding !== undefined && (
          <g data-slot="hand" transform={`rotate(${-angle} ${x} ${hy + 6})`}>
            <g transform={`translate(${x} ${hy + 6})`}>{holding}</g>
          </g>
        )}
        <circle cx={x} cy={hy} r={10.5} fill={skin.base} />
      </g>
    </g>
  )
}

/** Bare legs (always drawn; bottoms and shoes cover them). */
export function Legs({ g, skin }: { g: Geometry; skin: Swatch }) {
  const top = g.hipY - 6
  const h = g.footY - 4 - top
  return (
    <g>
      <rect x={g.legL - g.legW / 2} y={top} width={g.legW} height={h} rx={g.legW / 2} fill={skin.base} />
      <rect x={g.legR - g.legW / 2} y={top} width={g.legW} height={h} rx={g.legW / 2} fill={skin.shade} />
    </g>
  )
}

/** Sitting: knees come towards the viewer, two round foreshortened thighs over the hips. */
export function Knees({ g, fill, shade }: { g: Geometry; fill: string; shade: string }) {
  return (
    <g>
      <ellipse cx={g.legL - 2} cy={g.hipY - 2} rx={16} ry={12} fill={fill} />
      <ellipse cx={g.legR + 2} cy={g.hipY - 2} rx={16} ry={12} fill={shade} />
    </g>
  )
}

/** Neck, peeking between head and collar. */
export function Neck({ g, skin }: { g: Geometry; skin: Swatch }) {
  return <rect x={90} y={g.torsoTop + g.lift - 12} width={20} height={20} rx={8} fill={skin.shade} />
}

/** Rosy cheeks, always on (part of the house style). */
export function Blush({ look }: { look: Look }) {
  const dx = look.x * 2.5
  return (
    <g opacity={0.5}>
      <ellipse cx={62 + dx} cy={121} rx={10} ry={6} fill={INK.blush} />
      <ellipse cx={138 + dx} cy={121} rx={10} ry={6} fill={INK.blush} />
    </g>
  )
}
