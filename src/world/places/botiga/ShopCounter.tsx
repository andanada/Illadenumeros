import { PALETTE as P } from '../../art/palette'
import { FitProp, Pet } from '../../scene/art'
import { DropZone } from '../../scene/DropZone'
import { useScene } from '../../scene/SceneContext'
import { TapProp } from '../../scene/Scene'
import { worldSfx } from '../../scene/worldSfx'
import { clearTill, parseKind, petCat, ringUp, tillDisplay, toggleFridge, type ShopState } from './freePlay'

export interface ShopCounterProps {
  shop: ShopState
  onChange: (next: ShopState) => void
}

const CAT_POSE = { sleep: 'sleep', awake: 'idle', stretch: 'happy' } as const
const CAT_SOUND = { sleep: 'meow', awake: 'purr', stretch: 'squish' } as const
const CAT_NAME = { sleep: 'La gata Mixa, dormint', awake: 'La gata Mixa, desperta', stretch: 'La gata Mixa, contenta' } as const

/** The till (drop products to ring them up, tap to empty it), the fridge and the shop cat. */
export function ShopCounter({ shop, onChange }: ShopCounterProps) {
  const scene = useScene()
  return (
    <div className="flex flex-wrap items-end justify-center gap-3">
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
          className="flex flex-col items-center rounded-[1.4rem] bg-[var(--world-coral,#ff6b5b)] p-3 shadow-[var(--world-shadow-lift)]"
        >
          <span className="rounded-lg bg-[#1f3b2d] px-3 py-1 font-mono text-2xl font-bold tabular-nums text-[#7dff9a]">{tillDisplay(shop)}</span>
          <span aria-hidden="true" className="mt-2 grid grid-cols-3 gap-1">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="block size-4 rounded bg-white/70" />
            ))}
          </span>
          <span aria-hidden="true" className="mt-1 flex h-7 gap-0.5">
            {shop.till.slice(-4).map((id, i) => (
              <FitProp key={`${id}-${i}`} id={id} box={26} />
            ))}
          </span>
        </TapProp>
      </DropZone>

      <TapProp
        prop={{ id: 'gata', label: CAT_NAME[shop.cat], kind: 'animal' }}
        sound={CAT_SOUND[shop.cat]}
        onTap={() => onChange(petCat(shop))}
        className="grid min-h-16 place-items-center"
      >
        <Pet id="mixa" pose={CAT_POSE[shop.cat]} size={96} title="" />
      </TapProp>

      <TapProp
        prop={{ id: 'nevera', label: shop.fridgeOpen ? 'La nevera, oberta' : 'La nevera, tancada', kind: 'moble' }}
        sound={shop.fridgeOpen ? 'doorClose' : 'doorOpen'}
        onTap={() => onChange(toggleFridge(shop))}
        className="relative h-44 w-28 overflow-hidden rounded-[1.4rem] shadow-[var(--world-shadow-lift)]"
        style={{ background: P.cel.light }}
      >
        <div className="grid h-full grid-rows-2 gap-1 p-2">
          <span className="flex items-end justify-center gap-1 border-b-4 border-white/70">
            <FitProp id="llet" box={40} />
            <FitProp id="taronja" box={30} />
          </span>
          <span className="flex items-end justify-center border-b-4 border-white/70">
            <FitProp id="croissant" box={40} />
          </span>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 origin-left rounded-[1.4rem] transition-transform duration-300"
          style={{ background: P.neu.base, transform: shop.fridgeOpen ? 'perspective(400px) rotateY(-75deg)' : 'none' }}
        >
          <span className="absolute inset-x-0 top-[38%] block h-1.5" style={{ background: P.neu.shade }} />
          <span className="absolute right-3 top-[14%] block h-8 w-2 rounded-full" style={{ background: P.cel.base }} />
          <span className="absolute right-3 top-[50%] block h-12 w-2 rounded-full" style={{ background: P.cel.base }} />
          <span className="absolute left-3 top-[8%] grid size-7 place-items-center rounded-full text-sm" style={{ background: P.coral.base }}>❄</span>
        </div>
      </TapProp>
    </div>
  )
}
