import { BlocksView } from './BlocksView'
import { DotsView } from './DotsView'
import { PALETTE, type VisualSize } from './shared'

const DOT_LIMIT = 20

function Side({ n, color, size, animate }: { n: number; color: string; size: VisualSize; animate: boolean }) {
  if (n > DOT_LIMIT) {
    return <BlocksView hundreds={Math.floor(n / 100)} tens={Math.floor((n % 100) / 10)} ones={n % 10} size="sm" animate={animate} />
  }
  return <DotsViewColoured n={n} color={color} size={size} animate={animate} />
}

/** Single group in a fixed colour (DotsView colours by group index, so shift with padding groups). */
function DotsViewColoured({ n, color, size, animate }: { n: number; color: string; size: VisualSize; animate: boolean }) {
  const index = color === PALETTE.a ? 0 : 1
  const groups = index === 0 ? [n] : [0, n]
  return (
    <div className={index === 1 ? '[&>div>div:first-child]:hidden' : ''}>
      <DotsView groups={groups} size={size === 'lg' ? 'md' : 'sm'} animate={animate} />
    </div>
  )
}

/** The Comparing Monster: its mouth always opens toward the bigger group. */
function Monster({ left, right }: { left: number; right: number }) {
  const dir = left === right ? 0 : left > right ? -1 : 1
  const mouth =
    dir === 0
      ? 'M28 66 Q50 62 72 66'
      : dir === 1
        ? 'M74 36 L26 52 L74 68 Q80 52 74 36 Z'
        : 'M26 36 L74 52 L26 68 Q20 52 26 36 Z'
  return (
    <svg width="104" height="110" viewBox="0 0 100 106" aria-hidden="true">
      <path d="M12 60 Q10 14 50 12 Q90 14 88 60 Q92 96 50 98 Q8 96 12 60 Z" fill={PALETTE.d} stroke="#fff" strokeWidth="5" />
      <path d="M24 16 L30 2 L38 14 M62 14 L70 2 L76 16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="30" r="8" fill="#fff" />
      <circle cx="64" cy="30" r="8" fill="#fff" />
      <circle cx={36 + dir * 2} cy="31" r="4" fill={PALETTE.ink} />
      <circle cx={64 + dir * 2} cy="31" r="4" fill={PALETTE.ink} />
      <path d={mouth} fill={dir === 0 ? 'none' : '#9f1239'} stroke={PALETTE.ink} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function CompareView({ left, right, size, animate }: { left: number; right: number; size: VisualSize; animate: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4" role="img" aria-label={`El Monstre Comparador mira el ${left} i el ${right}`}>
      <Side n={left} color={PALETTE.a} size={size} animate={animate} />
      <Monster left={left} right={right} />
      <Side n={right} color={PALETTE.b} size={size} animate={animate} />
    </div>
  )
}
