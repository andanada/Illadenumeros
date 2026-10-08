import { FitProp } from '../../scene/art'
import { Draggable } from '../../scene/Draggable'
import { DropZone } from '../../scene/DropZone'
import { deliveryKind, parseKind, restock, SHELF_CAPACITY, SHELF_IDS, SHELF_NAMES, shelfHasRoom, shelfKind, type ShopState } from './freePlay'
import { productById, withArticle } from './products'

const labelOf = (id: string): string => {
  const p = productById(id)
  return p ? withArticle(p) : id
}

export interface ShopShelvesProps {
  shop: ShopState
  onChange: (next: ShopState) => void
}

/** Three shelves to restock from the delivery box: drag, tap-then-tap, or the keyboard. */
export function ShopShelves({ shop, onChange }: ShopShelvesProps) {
  const boxed = [...new Set(shop.delivery)]
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[1.8rem] bg-[var(--world-xocolata,#8a5638)] p-3 shadow-[var(--world-shadow-lift)]">
        {SHELF_IDS.map((shelf) => (
          <DropZone
            key={shelf}
            id={shelf}
            label={SHELF_NAMES[shelf]}
            accepts={(prop) => prop.kind.startsWith('entrega:') && shelfHasRoom(shop, shelf)}
            onDrop={(prop) => {
              const parsed = parseKind(prop.kind)
              if (parsed?.from === 'entrega') onChange(restock(shop, shelf, parsed.product))
            }}
            className="mb-2 last:mb-0"
          >
            <ul aria-label={SHELF_NAMES[shelf]} className="flex min-h-20 items-end gap-1 border-b-8 border-[var(--world-xocolata-light,#b4805c)] px-1 pb-1" style={{ borderColor: '#B4805C' }}>
              {shop.shelves[shelf].map((product, index) => (
                <li key={`${product}-${index}`}>
                  <Draggable prop={{ id: `${shelf}-${index}`, label: `${labelOf(product)} del prestatge`, kind: shelfKind(shelf, index, product) }} className="grid size-16 place-items-center">
                    <FitProp id={product} box={52} />
                  </Draggable>
                </li>
              ))}
              {Array.from({ length: SHELF_CAPACITY - shop.shelves[shelf].length }, (_, i) => (
                <li key={`buit-${i}`} aria-hidden="true" className="size-16 rounded-xl bg-black/10" />
              ))}
            </ul>
          </DropZone>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-[1.6rem] bg-[var(--world-mango,#ffb834)] p-2 shadow-[var(--world-shadow-soft)]">
        <span className="px-2 text-lg font-bold text-[var(--world-ink,#2b2440)]">Caixa del repartidor</span>
        <ul aria-label="Caixa del repartidor" className="flex flex-1 flex-wrap gap-1">
          {boxed.length === 0 && <li className="text-lg font-semibold text-[var(--world-ink,#2b2440)]/70">Tot és al seu lloc!</li>}
          {boxed.map((product) => {
            const left = shop.delivery.filter((p) => p === product).length
            return (
              <li key={product} className="relative">
                <Draggable prop={{ id: `entrega-${product}`, label: labelOf(product), kind: deliveryKind(product) }} className="grid size-16 place-items-center rounded-2xl bg-white/50">
                  <FitProp id={product} box={48} />
                </Draggable>
                {left > 1 && (
                  <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-1 grid size-7 place-items-center rounded-full bg-white text-sm font-bold">
                    {left}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
