import { PALETTE } from './shared'

const FROSTINGS = ['#ff4fa3', '#6ec1ff', '#ffd23f', '#5eead4'] as const

export const frostingColor = (i: number): string => FROSTINGS[i % FROSTINGS.length] ?? PALETTE.a

/** Cute cupcake sticker (decorative). `tone` picks the frosting colour. */
export function Cupcake({ size = 48, tone = 0, faded = false }: { size?: number | string; tone?: number; faded?: boolean }) {
  const frosting = frostingColor(tone)
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" opacity={faded ? 0.35 : 1} className="drop-shadow-sm">
      <path d="M12 30 L17 54 Q30 58 43 54 L48 30 Z" fill="#e8b27d" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 32 L24 53 M30 32 L30 55 M38 32 L36 53" stroke="#c98d55" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 32 Q6 20 18 17 Q20 6 30 8 Q42 6 42 17 Q54 20 51 32 Q30 38 9 32 Z" fill={frosting} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="30" cy="9" r="4.5" fill="#ef4444" stroke="#fff" strokeWidth="2" />
      <ellipse cx="22" cy="20" rx="6" ry="3" fill="#fff" opacity="0.55" transform="rotate(-25 22 20)" />
    </svg>
  )
}

/** Wrapped candy sticker (decorative). */
export function Candy({ size = 48, tone = 0, faded = false }: { size?: number | string; tone?: number; faded?: boolean }) {
  const colour = frostingColor(tone)
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" opacity={faded ? 0.35 : 1} className="drop-shadow-sm">
      <path d="M4 18 L16 30 L4 42 Z M56 18 L44 30 L56 42 Z" fill={colour} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="30" cy="30" r="17" fill={colour} stroke="#fff" strokeWidth="4" />
      <path d="M19 26 Q30 14 41 26" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="23" cy="22" rx="5" ry="3" fill="#fff" opacity="0.65" transform="rotate(-30 23 22)" />
    </svg>
  )
}

/** Round plate seen from above: rim, inner dish. Items are placed on top by the parent. */
export function PlateShape({ size = 120, highlight = false }: { size?: number; highlight?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0">
      <circle cx="50" cy="52" r="46" fill={PALETTE.ink} opacity="0.12" />
      <circle cx="50" cy="50" r="46" fill={highlight ? '#fff7cc' : '#fff'} stroke={highlight ? PALETTE.c : '#cbd5e1'} strokeWidth="4" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
    </svg>
  )
}

/** Positions of `n` items inside a plate of `size` px, as offsets from its centre. */
export function platePositions(n: number, size: number): { x: number; y: number }[] {
  if (n <= 0) return []
  if (n === 1) return [{ x: 0, y: 0 }]
  const ring = size * 0.26
  const inner = n > 7 ? n - 7 : 0
  const outerCount = n - inner
  const outer = Array.from({ length: outerCount }, (_, i) => {
    const a = (i / outerCount) * Math.PI * 2 - Math.PI / 2
    return { x: Math.cos(a) * ring, y: Math.sin(a) * ring }
  })
  const centre = Array.from({ length: inner }, (_, i) => {
    const a = (i / Math.max(inner, 1)) * Math.PI * 2
    return { x: Math.cos(a) * ring * 0.4, y: Math.sin(a) * ring * 0.4 }
  })
  return [...outer, ...centre]
}
