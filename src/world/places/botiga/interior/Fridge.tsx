import { PALETTE as P } from '../../../art/palette'
import { FitProp } from '../../../scene/art'
import { TapProp } from '../../../scene/Scene'
import { toggleFridge, type ShopState } from '../freePlay'

/** The drinks fridge: tap to swing the door open and peek inside. */
export function Fridge({ shop, onChange, className = '' }: { shop: ShopState; onChange: (next: ShopState) => void; className?: string }) {
  return (
    <TapProp
      prop={{ id: 'nevera', label: shop.fridgeOpen ? 'La nevera, oberta' : 'La nevera, tancada', kind: 'moble' }}
      sound={shop.fridgeOpen ? 'doorClose' : 'doorOpen'}
      onTap={() => onChange(toggleFridge(shop))}
      className={`relative h-40 w-24 shrink-0 overflow-visible rounded-[1.2rem] shadow-[var(--world-shadow-lift)] ${className}`}
      style={{ background: P.cel.light }}
    >
      <div className="grid h-full grid-rows-2 gap-1 overflow-hidden rounded-[1.2rem] p-2">
        <span className="flex items-end justify-center gap-1 border-b-4 border-white/70">
          <FitProp id="llet" box={36} />
          <FitProp id="taronja" box={26} />
        </span>
        <span className="flex items-end justify-center border-b-4 border-white/70">
          <FitProp id="croissant" box={36} />
        </span>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 origin-left rounded-[1.2rem] transition-transform duration-300"
        style={{ background: P.neu.base, transform: shop.fridgeOpen ? 'perspective(400px) rotateY(-75deg)' : 'none' }}
      >
        <span className="absolute inset-x-0 top-[38%] block h-1.5" style={{ background: P.neu.shade }} />
        <span className="absolute right-2.5 top-[14%] block h-7 w-2 rounded-full" style={{ background: P.cel.base }} />
        <span className="absolute right-2.5 top-[50%] block h-10 w-2 rounded-full" style={{ background: P.cel.base }} />
        <span className="absolute left-2.5 top-[8%] block size-5 rounded-full" style={{ background: P.coral.base }} />
        <span className="absolute left-2.5 top-[56%] block h-5 w-9 rounded-md" style={{ background: P.mango.light }} />
      </div>
    </TapProp>
  )
}
