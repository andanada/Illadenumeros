import { useState } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { TapProp } from '../../../scene/Scene'

/** The kitchen's built-in units on the back wall: cupboards, the hob (tap: fire on/off) and the fridge (tap: open). */
export function KitchenFixtures() {
  const [fire, setFire] = useState(false)
  const [open, setOpen] = useState(false)
  return (
    <div className="pointer-events-none absolute bottom-[30%] right-[3%] flex h-[34%] items-end gap-[1.5%]" style={{ zIndex: 15 }}>
      <svg viewBox="0 0 240 150" className="h-[52%] w-auto self-start" aria-hidden="true">
        <rect x="0" y="0" width="240" height="70" rx="12" fill={P.menta.base} />
        <rect x="10" y="10" width="68" height="50" rx="8" fill={P.menta.light} />
        <rect x="86" y="10" width="68" height="50" rx="8" fill={P.menta.light} />
        <rect x="162" y="10" width="68" height="50" rx="8" fill={P.menta.light} />
        {[70, 146, 222].map((x) => (
          <rect key={x} x={x - 14} y="30" width="8" height="16" rx="3" fill={P.mango.base} />
        ))}
      </svg>
      <TapProp
        prop={{ id: 'fogons', label: fire ? 'Els fogons, encesos' : 'Els fogons, apagats', kind: 'moble' }}
        sound={fire ? 'doorClose' : 'whoosh'}
        onTap={() => setFire((f) => !f)}
        className="pointer-events-auto h-full"
      >
        <svg viewBox="0 0 160 170" className="h-full w-auto" aria-hidden="true">
          <rect x="0" y="40" width="160" height="130" rx="12" fill={P.neu.base} />
          <rect x="132" y="40" width="28" height="130" rx="10" fill={P.neu.shade} />
          <rect x="16" y="74" width="104" height="70" rx="10" fill={P.carbo.light} />
          <rect x="26" y="84" width="84" height="40" rx="6" fill={fire ? '#FFB27A' : P.carbo.base} />
          <rect x="-4" y="30" width="168" height="14" rx="6" fill={P.carbo.base} />
          <ellipse cx="44" cy="30" rx="22" ry="5" fill={fire ? P.coral.base : P.carbo.light} />
          <ellipse cx="116" cy="30" rx="22" ry="5" fill={fire ? P.mango.base : P.carbo.light} />
          <path d="M84 30 L84 6 Q84 0 92 0 L140 0 Q148 0 148 6 L148 30 Z" fill={P.coral.base} />
          <rect x="78" y="0" width="76" height="8" rx="4" fill={P.coral.shade} />
          {fire && <path d="M104 -4 q-6 -10 2 -18 M122 -4 q6 -10 -2 -18" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />}
          {[40, 64, 88].map((x) => (
            <circle key={x} cx={x} cy="58" r="6" fill={P.carbo.light} />
          ))}
        </svg>
      </TapProp>
      <TapProp
        prop={{ id: 'nevera-casa', label: open ? 'La nevera, oberta' : 'La nevera, tancada', kind: 'moble' }}
        sound={open ? 'doorClose' : 'doorOpen'}
        onTap={() => setOpen((o) => !o)}
        className="pointer-events-auto relative h-[150%] w-[min(8vw,6rem)] overflow-visible rounded-[1.2rem] shadow-[var(--world-shadow-lift)]"
        style={{ background: P.cel.light }}
      >
        <div className="grid h-full grid-rows-3 gap-1 p-2" aria-hidden="true">
          <span className="rounded-md" style={{ background: P.coral.light }} />
          <span className="rounded-md" style={{ background: P.mango.light }} />
          <span className="rounded-md" style={{ background: P.llima.light }} />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 origin-left rounded-[1.2rem] transition-transform duration-300"
          style={{ background: P.rosa.base, transform: open ? 'perspective(400px) rotateY(-75deg)' : 'none' }}
        >
          <span className="absolute inset-x-0 top-[34%] block h-1.5" style={{ background: P.rosa.shade }} />
          <span className="absolute right-2 top-[12%] block h-7 w-2 rounded-full bg-white/80" />
          <span className="absolute right-2 top-[46%] block h-10 w-2 rounded-full bg-white/80" />
          <span className="absolute left-3 top-[54%] block size-6 rounded-full" style={{ background: P.mango.base }} />
        </div>
      </TapProp>
    </div>
  )
}
