import type { ReactNode } from 'react'
import { PALETTE as P } from '../../../../art/palette'
import { fixturesOn, type FixtureSpec } from '../fixturesData'
import type { FloorId } from '../zones'

interface FxProps {
  spec: FixtureSpec
  children: ReactNode
}

/** A piece built into the house: sized from its floor's height (but never over half its width), so it keeps its shape on any screen. */
function Fx({ spec, children }: FxProps) {
  const { x, y, h, aspect } = spec
  return (
    <svg
      viewBox={`0 0 ${100 * aspect} 100`}
      aria-hidden="true"
      data-fixture={spec.id}
      className="pointer-events-none absolute overflow-visible"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, height: `min(${h * 100}cqh, ${h * 52}cqw)`, aspectRatio: String(aspect), transform: 'translate(-50%, -100%)', zIndex: 2 }}
    >
      {children}
    </svg>
  )
}

function Sofa() {
  return (
    <g>
      <ellipse cx="105" cy="97" rx="104" ry="5" fill="#2b2440" opacity="0.14" />
      <rect x="4" y="22" width="202" height="56" rx="26" fill={P.rosa.shade} />
      <rect x="10" y="6" width="190" height="52" rx="24" fill={P.rosa.base} />
      <rect x="22" y="44" width="80" height="34" rx="16" fill={P.rosa.light} />
      <rect x="108" y="44" width="80" height="34" rx="16" fill={P.rosa.light} />
      <rect x="0" y="38" width="28" height="50" rx="14" fill={P.rosa.base} />
      <rect x="182" y="38" width="28" height="50" rx="14" fill={P.rosa.base} />
      <rect x="14" y="84" width="10" height="12" rx="4" fill={P.xocolata.base} />
      <rect x="186" y="84" width="10" height="12" rx="4" fill={P.xocolata.base} />
    </g>
  )
}

function Counter() {
  return (
    <g>
      <ellipse cx="110" cy="97" rx="108" ry="4" fill="#2b2440" opacity="0.14" />
      <rect x="0" y="40" width="220" height="56" rx="6" fill={P.menta.base} />
      <rect x="0" y="40" width="70" height="56" rx="6" fill={P.menta.light} opacity="0.3" />
      {[8, 80, 152].map((x) => (
        <g key={x}>
          <rect x={x} y="52" width="60" height="40" rx="5" fill={P.menta.light} />
          <rect x={x + 44} y="64" width="5" height="14" rx="2.5" fill={P.mango.base} />
        </g>
      ))}
      <rect x="-4" y="30" width="228" height="14" rx="6" fill={P.neu.base} />
      <rect x="-4" y="38" width="228" height="6" rx="3" fill={P.neu.shade} />
      {/* sink */}
      <rect x="22" y="24" width="56" height="9" rx="4" fill={P.cel.light} />
      <path d="M62 24 L62 6 Q62 0 70 0 L76 0" stroke={P.carbo.light} strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* hob */}
      <ellipse cx="150" cy="30" rx="22" ry="5" fill={P.carbo.base} />
      <ellipse cx="190" cy="30" rx="18" ry="4.5" fill={P.carbo.base} />
      <ellipse cx="150" cy="29" rx="14" ry="3" fill={P.coral.shade} opacity="0.7" />
    </g>
  )
}

function Sink() {
  return (
    <g>
      <ellipse cx="45" cy="97" rx="44" ry="4" fill="#2b2440" opacity="0.14" />
      <rect x="6" y="36" width="78" height="60" rx="8" fill={P.cel.base} />
      <rect x="12" y="46" width="66" height="44" rx="6" fill={P.cel.light} />
      <rect x="0" y="26" width="90" height="14" rx="7" fill={P.neu.base} />
      <ellipse cx="45" cy="30" rx="26" ry="5" fill={P.cel.light} />
      <path d="M45 28 L45 8 Q45 2 54 2 L62 2" stroke={P.carbo.light} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Mirror() {
  return (
    <g>
      <rect x="0" y="0" width="70" height="86" rx="35" fill={P.mango.base} />
      <rect x="7" y="7" width="56" height="72" rx="28" fill={P.cel.light} />
      <path d="M18 56 Q30 20 48 18" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
    </g>
  )
}

function Shelf() {
  const books = [P.coral.base, P.cel.base, P.mango.base, P.menta.base, P.lila.base, P.rosa.base]
  return (
    <g>
      <rect x="0" y="0" width="160" height="150" rx="8" fill={P.xocolata.base} />
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="8" y={8 + r * 46} width="144" height="38" rx="4" fill={P.xocolata.shade} />
          {books.map((c, i) => (
            <rect key={c} x={14 + i * 22 + (r % 2) * 4} y={r === 1 ? 18 + r * 46 - 46 + 14 : 14 + r * 46} width="16" height={r === 1 ? 26 : 32} rx="3" fill={books[(i + r) % books.length]} />
          ))}
        </g>
      ))}
    </g>
  )
}

function Garden() {
  return (
    <g>
      <rect x="0" y="30" width="240" height="40" rx="12" fill={P.xocolata.shade} />
      <rect x="6" y="22" width="228" height="22" rx="10" fill={P.xocolata.base} />
      {[24, 64, 110, 160, 206].map((x, i) => (
        <circle key={x} cx={x} cy={26 + (i % 2) * 4} r="4" fill={P.xocolata.light} opacity="0.7" />
      ))}
    </g>
  )
}

const ART: Readonly<Record<string, () => ReactNode>> = {
  sofa: () => <Sofa />,
  encimera: () => <Counter />,
  mirall: () => <Mirror />,
  lavabo: () => <Sink />,
  prestatge: () => <Shelf />,
  jardinera: () => <Garden />,
}

/** The things built into each floor (the movable furniture lives in the pieces layer). */
export function FloorFixtures({ floor }: { floor: FloorId }) {
  return (
    <>
      {fixturesOn(floor).map((spec) => (
        <Fx key={spec.id} spec={spec}>
          {ART[spec.id]?.()}
        </Fx>
      ))}
    </>
  )
}
