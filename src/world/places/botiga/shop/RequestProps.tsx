import { PALETTE as P } from '../../../art/palette'
import { Piece } from '../../../sandbox/art/roomArt'
import type { Rect } from '../../../sandbox/logic/zones'
import { basketRect, cratePile, offRect } from '../basket/basketSpec'
import { drawerRect, handRect } from '../change/changeSpec'
import type { BotigaMode } from '../errands/botigaMode'

/** Woven wicker: two crossing soft stripes over honey. */
const WICKER = 'repeating-linear-gradient(45deg, rgba(196,122,44,0.35) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(196,122,44,0.25) 0 6px, transparent 6px 12px), #E9A54B'
const pct = (r: Rect, pad: number): React.CSSProperties => ({ left: `${(r.x - pad) * 100}%`, top: `${(r.y - pad * 0.6) * 100}%`, width: `${(r.w + pad * 2) * 100}%`, height: `${(r.h + pad * 1.2) * 100}%` })

/** The basket the things are carried into: wicker behind the ten-frame slots, and a handle over the top. */
function Wicker({ rect }: { rect: Rect }) {
  return (
    <div aria-hidden="true" data-prop="cistella" className="pointer-events-none absolute" style={{ ...pct(rect, 0.012), zIndex: 20 }}>
      <span className="absolute inset-0 rounded-[1.2rem] shadow-[var(--world-shadow-lift)]" style={{ background: WICKER }} />
      <span className="absolute -top-[16%] left-1/2 block h-[34%] w-[62%] -translate-x-1/2 rounded-t-full border-[8px] border-b-0" style={{ borderColor: '#C47A2C' }} />
      <span className="absolute inset-[7%] rounded-[0.9rem] bg-[#FFF3DC]/85" />
    </div>
  )
}

/** The wooden box for the things that are taken out of the basket. */
function WoodBox({ rect }: { rect: Rect }) {
  return (
    <div aria-hidden="true" data-prop="caixa-sobrants" className="pointer-events-none absolute" style={{ ...pct(rect, 0.012), zIndex: 20 }}>
      <span className="absolute inset-0 rounded-[0.9rem] shadow-[var(--world-shadow-lift)]" style={{ background: `repeating-linear-gradient(${P.xocolata.light} 0 22px, ${P.xocolata.base} 22px 26px)` }} />
      <span className="absolute inset-[7%] rounded-[0.7rem] bg-[#F4D3A6]/80" />
    </div>
  )
}

/** The till drawer lying open: dark compartments under the coins and notes. */
function DrawerTray({ compact }: { compact: boolean }) {
  return (
    <div aria-hidden="true" data-prop="calaix" className="pointer-events-none absolute" style={{ ...pct(drawerRect(compact), 0.012), zIndex: 20 }}>
      <span className="absolute inset-0 rounded-[1.1rem] shadow-[var(--world-shadow-lift)]" style={{ background: P.carbo.base }} />
      <span className="absolute inset-[6%] rounded-[0.8rem]" style={{ background: 'repeating-linear-gradient(90deg, #4a4566 0 31%, #3b3656 31% 33%)' }} />
      <span className="absolute -top-[14%] left-[6%] rounded-full bg-white px-3 text-sm font-bold text-[#3a2d63]">El calaix</span>
    </div>
  )
}

/** The customer's open hand: a soft pad under the slots where the change goes. */
function HandPad({ compact }: { compact: boolean }) {
  return (
    <div aria-hidden="true" data-prop="ma" className="pointer-events-none absolute" style={{ ...pct(handRect(compact), 0.01), zIndex: 20 }}>
      <span className="absolute inset-0 rounded-[1.4rem]" style={{ background: P.rosa.light, boxShadow: `inset 0 -6px 0 ${P.rosa.base}` }} />
    </div>
  )
}

/** The crate the goods spilled from. */
function Crate({ compact }: { compact: boolean }) {
  const pile = cratePile(compact)
  return (
    <Piece x={pile.x + pile.w * 0.5} y={pile.y + 0.07} h={0.2} ratio={1.2} z={30}>
      <rect x="4" y="38" width="112" height="58" rx="8" fill={P.xocolata.shade} />
      <rect x="4" y="34" width="112" height="58" rx="8" fill={P.xocolata.light} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="12" y={42 + i * 14} width="96" height="8" rx="3" fill={P.xocolata.base} />
      ))}
      <rect x="4" y="28" width="112" height="12" rx="6" fill={P.xocolata.base} />
    </Piece>
  )
}

/** The decor a request needs on the shop floor (only while it is open): crate and basket, or the drawer and the hand. */
export function RequestProps({ mode, compact = false }: { mode: BotigaMode; compact?: boolean }) {
  if (mode.kind === 'basket') {
    return (
      <>
        {mode.task.mode === 'take' ? <WoodBox rect={offRect(mode.task, compact)} /> : <Crate compact={compact} />}
        <Wicker rect={basketRect(mode.task, compact)} />
      </>
    )
  }
  return mode.kind === 'change' ? (
    <>
      <DrawerTray compact={compact} />
      <HandPad compact={compact} />
    </>
  ) : null
}
