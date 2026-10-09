import { FitProp } from '../../../scene/art'
import { Draggable } from '../../../scene/Draggable'
import { deliveryKind, type ShopState } from '../freePlay'
import { labelOf } from '../products'

const SLAT = '#D49A66'
const SLAT_DARK = '#B07A4A'

/** The supplier's wooden crate on the floor: what is still to go on the shelves peeks out of the top. */
export function DeliveryCrate({ shop }: { shop: ShopState }) {
  const boxed = [...new Set(shop.delivery)]
  return (
    <div className="relative w-full min-w-0 max-w-[17rem]">
      <ul aria-label="Caixa del repartidor" className="relative z-10 -mb-5 flex min-h-14 flex-nowrap items-end justify-center px-1">
        {boxed.length === 0 && <li className="mb-6 rounded-full bg-white/80 px-3 text-base font-semibold text-[var(--world-ink,#2b2440)]">Tot és al seu lloc!</li>}
        {boxed.map((product) => {
          const left = shop.delivery.filter((p) => p === product).length
          return (
            <li key={product} className="relative">
              <Draggable prop={{ id: `entrega-${product}`, label: labelOf(product), kind: deliveryKind(product) }} className="grid h-14 w-11 place-items-end justify-center">
                <FitProp id={product} box={40} />
              </Draggable>
              {left > 1 && (
                <span aria-hidden="true" className="pointer-events-none absolute -right-0.5 -top-1 grid size-6 place-items-center rounded-full bg-white text-sm font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]">
                  {left}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div
        aria-hidden="true"
        className="relative h-20 rounded-[0.9rem] shadow-[0_10px_0_rgba(43,36,64,0.12)]"
        style={{ background: `repeating-linear-gradient(${SLAT} 0 22px, ${SLAT_DARK} 22px 26px)` }}
      >
        <span className="absolute inset-y-0 left-3 w-3 rounded-sm" style={{ background: SLAT_DARK }} />
        <span className="absolute inset-y-0 right-3 w-3 rounded-sm" style={{ background: SLAT_DARK }} />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-2 rounded-md bg-[#FBF6EC]/90 px-2 text-sm font-bold tracking-wider text-[#94582F]">REPARTIDOR</span>
      </div>
    </div>
  )
}
