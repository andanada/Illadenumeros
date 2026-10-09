import { PALETTE as P } from '../../art/palette'

/**
 * Street-only drawings on top of the art library: scaffolding + "Obrim aviat!" sign over places that are not
 * open yet (never a padlock), and the far hills. All decorative: the hotspots carry the names.
 */

function Scaffold({ w, h }: { w: number; h: number }) {
  const count = Math.max(2, Math.round(w / 70))
  const poles = Array.from({ length: count + 1 }, (_, i) => 8 + (i * (w - 16)) / count)
  const boards = [0.35, 0.6, 0.85].map((f) => h * f)
  return (
    <g>
      {poles.map((x) => (
        <rect key={x} x={x - 4} y={h * 0.2} width="8" height={h * 0.8} rx="3" fill={P.mango.shade} />
      ))}
      {boards.map((y) => (
        <rect key={y} x="0" y={y} width={w} height="12" rx="4" fill={P.mango.base} />
      ))}
    </g>
  )
}

export function ClosedOverlay({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <Scaffold w={w} h={h} />
      <g transform={`translate(${w / 2} ${h * 0.28}) rotate(-4)`}>
        <rect x="-74" y="-26" width="148" height="52" rx="18" fill={P.neu.base} />
        <text x="0" y="8" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="23" fill={P.lila.shade}>
          Obrim aviat!
        </text>
      </g>
    </svg>
  )
}

/** Muted colours per unbuilt lot, so the future street already has a little personality. */
const LOT_TINTS = [P.rosa, P.mango, P.menta, P.cel, P.lila] as const

/**
 * A lot whose place is not built yet: a soft building shape with a crane arm and a site fence. The
 * scaffolding and the «Obrim aviat!» sign go on top (ClosedOverlay). Decorative only.
 */
export function FutureLot({ w, h, tint = 0 }: { w: number; h: number; tint?: number }) {
  const sw = LOT_TINTS[tint % LOT_TINTS.length] ?? P.rosa
  const top = h * 0.22
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <rect x={w * 0.08} y={top} width={w * 0.84} height={h - top} rx="22" fill={sw.light} />
      <rect x={w * 0.08} y={top} width={w * 0.84} height={h * 0.08} rx="12" fill={sw.base} />
      {[0.2, 0.42, 0.64].map((fx) => (
        <rect key={fx} x={w * fx} y={h * 0.42} width={w * 0.14} height={h * 0.13} rx="10" fill={P.neu.base} opacity="0.7" />
      ))}
      <rect x={w * 0.4} y={h * 0.7} width={w * 0.2} height={h * 0.3} rx="12" fill={sw.shade} opacity="0.55" />
      <rect x={w * 0.84} y={h * 0.02} width="10" height={top} rx="4" fill={P.mango.shade} />
      <rect x={w * 0.5} y={h * 0.02} width={w * 0.44} height="10" rx="4" fill={P.mango.base} />
      <rect x={w * 0.56} y={h * 0.02} width="3" height={h * 0.12} fill={P.carbo.light} />
      <rect x={w * 0.53} y={h * 0.13} width="16" height="12" rx="3" fill={P.coral.base} />
      {Array.from({ length: Math.max(3, Math.round(w / 46)) }, (_, i) => (
        <rect key={i} x={6 + i * 46} y={h - 40} width="36" height="40" rx="6" fill={i % 2 ? P.neu.base : P.coral.light} />
      ))}
    </svg>
  )
}

export function Hills({ width }: { width: number }) {
  const bumps = Math.ceil(width / 400) + 1
  const d = Array.from({ length: bumps }, (_, i) => `Q${i * 400 + 200} ${i % 2 === 0 ? 40 : 80} ${(i + 1) * 400} 120`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} 200`} width={width} height="200" preserveAspectRatio="none" className="block" aria-hidden="true">
      <path d={`M0 120 ${d} L${width} 200 L0 200Z`} fill={P.llima.light} />
    </svg>
  )
}
