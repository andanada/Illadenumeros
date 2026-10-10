import { PALETTE as P } from '../../../art/palette'
import { Piece } from '../../../sandbox/art/roomArt'
import { stackOf } from '../../../sandbox/StageContext'
import { BOOTH_SPOT, CLAW_SPOT, COUNTER_SPOT, EXIT_DOOR, HOCKEY_SPOT } from './layout'

/** The claw machine: pink cabinet, glass box with toys, a claw on its rail and the prize chute. Feet at the bottom. */
function ClawArt({ lit }: { lit: boolean }) {
  return (
    <Piece x={CLAW_SPOT.x} y={CLAW_SPOT.y} h={0.4} ratio={0.74} z={stackOf(CLAW_SPOT.y) - 6}>
      <rect x="2" y="6" width="70" height="94" rx="12" fill={P.rosa.base} />
      <rect x="44" y="6" width="28" height="94" rx="12" fill={P.rosa.shade} opacity="0.5" />
      <rect x="0" y="0" width="74" height="16" rx="8" fill={P.mango.base} />
      <rect x="10" y="22" width="54" height="46" rx="8" fill={lit ? '#FFF3B0' : '#CBB7E6'} />
      <rect x="10" y="22" width="54" height="5" fill={P.carbo.light} />
      <path d="M36 27 V44" stroke={P.carbo.light} strokeWidth="2.5" />
      <path d="M28 44 q8 -6 16 0 l-3 9 h-10 z" fill={P.neu.shade} />
      <circle cx="20" cy="62" r="5" fill={P.coral.base} />
      <circle cx="32" cy="63" r="4.5" fill={P.mango.base} />
      <circle cx="44" cy="62" r="5" fill={P.menta.base} />
      <circle cx="54" cy="63" r="4" fill={P.cel.base} />
      <path d="M14 30 l12 -3" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <rect x="8" y="74" width="58" height="12" rx="6" fill={P.carbo.base} />
      <circle cx="22" cy="80" r="3.4" fill={P.coral.base} />
      <circle cx="34" cy="80" r="3.4" fill={P.mango.base} />
      <rect x="44" y="89" width="22" height="9" rx="3" fill={P.carbo.base} />
    </Piece>
  )
}

/** The photo booth: striped curtain, a lens above and a sign. */
function BoothArt() {
  return (
    <Piece x={BOOTH_SPOT.x} y={BOOTH_SPOT.y} h={0.38} ratio={0.66} z={stackOf(BOOTH_SPOT.y) - 6}>
      <rect x="2" y="6" width="62" height="94" rx="10" fill={P.cel.base} />
      <rect x="0" y="0" width="66" height="18" rx="9" fill={P.cel.shade} />
      <text x="33" y="13" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="var(--font-display)">
        FOTOS
      </text>
      <circle cx="33" cy="30" r="7" fill={P.carbo.base} />
      <circle cx="33" cy="30" r="4" fill={P.cel.light} />
      <rect x="10" y="42" width="46" height="58" rx="4" fill={P.rosa.base} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${10 + i * 12} 42 h6 v58 h-6 z`} fill={i % 2 ? '#fff' : P.coral.base} />
      ))}
      <rect x="6" y="94" width="54" height="6" rx="3" fill={P.carbo.base} opacity="0.4" />
    </Piece>
  )
}

/** The air-hockey table, seen from the player's side: a glowing rink with two goals and a divider. */
function HockeyArt({ lit }: { lit: boolean }) {
  return (
    <Piece x={HOCKEY_SPOT.x} y={HOCKEY_SPOT.y} h={0.2} ratio={1.9} z={stackOf(HOCKEY_SPOT.y - 0.04)}>
      <rect x="6" y="24" width="178" height="54" rx="14" fill={P.cel.shade} />
      <rect x="12" y="16" width="166" height="50" rx="12" fill={lit ? P.cel.light : P.cel.base} />
      <rect x="18" y="22" width="154" height="38" rx="8" fill="#fff" opacity="0.5" />
      <path d="M95 22 V60" stroke={P.cel.base} strokeWidth="3" strokeDasharray="5 4" />
      <circle cx="95" cy="41" r="9" fill="none" stroke={P.cel.base} strokeWidth="3" />
      <rect x="14" y="30" width="10" height="22" rx="4" fill={P.carbo.base} />
      <rect x="166" y="30" width="10" height="22" rx="4" fill={P.carbo.base} />
      <circle cx="52" cy="41" r="8" fill={P.coral.base} />
      <circle cx="138" cy="41" r="8" fill={P.mango.base} />
      <rect x="22" y="76" width="10" height="20" rx="4" fill={P.carbo.base} />
      <rect x="158" y="76" width="10" height="20" rx="4" fill={P.carbo.base} />
    </Piece>
  )
}

/** The prize counter: a wooden front with shelves of toys behind it. */
function CounterArt() {
  return (
    <Piece x={COUNTER_SPOT.x} y={COUNTER_SPOT.y} h={0.27} ratio={1} z={stackOf(COUNTER_SPOT.y)}>
      <rect x="0" y="0" width="100" height="62" rx="6" fill={P.xocolata.base} />
      <rect x="5" y="5" width="90" height="24" rx="4" fill={P.xocolata.light} />
      <rect x="5" y="33" width="90" height="24" rx="4" fill={P.xocolata.light} />
      <circle cx="20" cy="22" r="7" fill={P.coral.base} />
      <rect x="40" y="10" width="14" height="19" rx="4" fill={P.menta.base} />
      <circle cx="74" cy="22" r="7" fill={P.mango.base} />
      <circle cx="22" cy="50" r="7" fill={P.rosa.base} />
      <rect x="46" y="38" width="16" height="19" rx="4" fill={P.cel.base} />
      <rect x="0" y="58" width="100" height="42" rx="8" fill={P.coral.base} />
      <rect x="0" y="58" width="100" height="11" rx="5" fill={P.coral.shade} />
      <rect x="8" y="76" width="84" height="15" rx="5" fill="#fff" opacity="0.35" />
    </Piece>
  )
}

function Puf({ x, color }: { x: number; color: string }) {
  return (
    <Piece x={x} y={0.9} h={0.1} ratio={1} z={stackOf(0.9) - 4}>
      <ellipse cx="50" cy="92" rx="38" ry="8" fill="#2B2440" opacity="0.18" />
      <rect x="14" y="30" width="72" height="62" rx="26" fill={color} />
      <ellipse cx="50" cy="32" rx="34" ry="12" fill={color} />
      <ellipse cx="50" cy="30" rx="22" ry="7" fill="#fff" opacity="0.3" />
    </Piece>
  )
}

/** The exit sign over the door: a green board with an arrow. */
function ExitSign() {
  return (
    <Piece x={EXIT_DOOR.at.x} y={EXIT_DOOR.at.y - 0.3} h={0.07} ratio={1.8}>
      <rect x="0" y="10" width="180" height="80" rx="20" fill={P.menta.base} />
      <path d="M40 50 H130 M105 28 L132 50 L105 72" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Piece>
  )
}

/**
 * Everything fixed in the arcade except the cabinets (tappable, in their own layer). Each piece sits at its
 * depth, so people walk in front of and behind it.
 */
export function ArcadeFixtures({ lit }: { lit: boolean }) {
  return (
    <>
      <ExitSign />
      <ClawArt lit={lit} />
      <BoothArt />
      <CounterArt />
      <HockeyArt lit={lit} />
      <Puf x={0.84} color={P.coral.base} />
      <Puf x={0.93} color={P.cel.base} />
    </>
  )
}
