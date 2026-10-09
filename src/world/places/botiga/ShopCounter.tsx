import type { ReactNode } from 'react'
import { PALETTE as P } from '../../art/palette'
import { FitProp, Pet, PropArt } from '../../scene/art'
import { DropZone } from '../../scene/DropZone'
import { useScene } from '../../scene/SceneContext'
import { TapProp } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import { clearTill, parseKind, petCat, ringUp, tillDisplay, type ShopState } from './freePlay'

export interface ShopFixtureProps {
  shop: ShopState
  onChange: (next: ShopState) => void
}

/** Light wooden worktop: long boards with soft grain, seen from the customer side. */
const WORKTOP =
  'repeating-linear-gradient(180deg, transparent 0 46px, rgba(181,120,73,0.28) 46px 49px), radial-gradient(ellipse 60px 5px at 30% 30%, rgba(255,255,255,0.35), transparent), linear-gradient(#F4D3A6, #EBC08E)'

const CAT_POSE = { sleep: 'sleep', awake: 'idle', stretch: 'happy' } as const
const CAT_SOUND = { sleep: 'meow', awake: 'purr', stretch: 'squish' } as const
const CAT_NAME = { sleep: 'La gata Mixa, dormint', awake: 'La gata Mixa, desperta', stretch: 'La gata Mixa, contenta' } as const

/** The wooden counter in the foreground: things stand on its top, its front panel runs down to the floor. */
export function CounterTop({ children, className = '', wrap = false }: { children: ReactNode; className?: string; wrap?: boolean }) {
  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* The worktop seen from the customer side: everything on the counter stands on it. */}
      <div
        className={`relative z-10 flex items-end gap-x-3 gap-y-3 rounded-t-[1.6rem] px-3 pb-4 pt-3 ${wrap ? 'flex-wrap justify-center' : 'flex-nowrap justify-between'}`}
        style={{ background: WORKTOP, boxShadow: 'inset 0 10px 0 #D9A06C, inset 0 14px 0 rgba(43,36,64,0.08)' }}
      >
        {children}
      </div>
      <div aria-hidden="true" className="relative h-5 shrink-0" style={{ background: '#E9B07C', boxShadow: 'inset 0 -6px 0 #C98D5E' }} />
      <div aria-hidden="true" className="relative min-h-10 flex-1 overflow-hidden" style={{ background: P.coral.base }}>
        <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(90deg, ${P.coral.base} 0 46px, ${P.neu.base} 46px 92px)`, opacity: 0.9 }} />
        <div className="absolute inset-x-0 top-0 h-2" style={{ background: 'rgba(43,36,64,0.14)' }} />
      </div>
    </div>
  )
}

/** The till: drop shelf products to ring them up; tap it to empty it. */
export function Till({ shop, onChange }: ShopFixtureProps) {
  const scene = useScene()
  return (
    <DropZone
      id="caixa-registradora"
      label="la caixa registradora"
      accepts={(prop) => prop.kind.startsWith('prestatge:')}
      onDrop={(prop) => {
        const parsed = parseKind(prop.kind)
        if (parsed?.from !== 'prestatge') return
        worldSfx.beep()
        onChange(ringUp(shop, parsed.shelf, parsed.index))
      }}
    >
      <TapProp
        prop={{ id: 'caixa-registradora', label: `La caixa registradora, marca ${tillDisplay(shop)}`, kind: 'moble' }}
        sound="beep"
        onTap={() => {
          // Holding a product: this tap rings it up (the zone handles it), it does not empty the till.
          if (shop.till.length === 0 || scene.held) return
          worldSfx.kaching()
          onChange(clearTill(shop))
        }}
        className="relative flex flex-col items-center"
      >
        <PropArt id="caixa-registradora" size={84} label={tillDisplay(shop).replace(' €', '')} title="" shadow={false} />
        {shop.till.length > 0 && (
          <span aria-hidden="true" className="absolute -left-3 bottom-1 flex h-8 items-end gap-0.5 rounded-lg bg-white/85 px-1">
            {shop.till.slice(-3).map((id, i) => (
              <FitProp key={`${id}-${i}`} id={id} box={24} />
            ))}
          </span>
        )}
      </TapProp>
    </DropZone>
  )
}

/** Mixa, the shop cat, asleep on the counter. Tap to wake / stroke her. */
export function ShopCat({ shop, onChange, size = 84 }: ShopFixtureProps & { size?: number }) {
  return (
    <TapProp prop={{ id: 'gata', label: CAT_NAME[shop.cat], kind: 'animal' }} sound={CAT_SOUND[shop.cat]} onTap={() => onChange(petCat(shop))} className="grid min-h-16 place-items-end">
      <Pet id="mixa" pose={CAT_POSE[shop.cat]} size={size} title="" />
    </TapProp>
  )
}

/** The brass counter bell: ding! (and, with nobody waiting, it calls the next neighbour). */
export function CounterBell({ onRing }: { onRing?: () => void }) {
  return (
    <TapProp prop={{ id: 'timbre', label: 'El timbre del taulell', kind: 'moble' }} sound="doorbell" {...(onRing ? { onTap: onRing } : {})} className="grid min-h-16 min-w-16 place-items-end justify-center">
      <svg viewBox="0 0 60 44" width="56" height="41" aria-hidden="true">
        <rect x="26" y="0" width="8" height="8" rx="3" fill={P.mango.shade} />
        <path d="M8 34 Q8 8 30 8 Q52 8 52 34 Z" fill={P.mango.base} />
        <path d="M30 8 Q52 8 52 34 L40 34 Q42 14 30 8 Z" fill={P.mango.shade} />
        <path d="M17 22 Q20 14 28 12" stroke={P.mango.light} strokeWidth="4" strokeLinecap="round" fill="none" />
        <rect x="2" y="33" width="56" height="9" rx="4" fill={P.xocolata.base} />
      </svg>
    </TapProp>
  )
}
