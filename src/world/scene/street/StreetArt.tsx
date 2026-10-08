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

export function Hills({ width }: { width: number }) {
  const bumps = Math.ceil(width / 400) + 1
  const d = Array.from({ length: bumps }, (_, i) => `Q${i * 400 + 200} ${i % 2 === 0 ? 40 : 80} ${(i + 1) * 400} 120`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} 200`} width={width} height="200" preserveAspectRatio="none" className="block" aria-hidden="true">
      <path d={`M0 120 ${d} L${width} 200 L0 200Z`} fill={P.llima.light} />
    </svg>
  )
}
