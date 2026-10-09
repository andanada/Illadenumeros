import { FitProp } from '../../scene/art'
import { Draggable } from '../../scene/Draggable'
import { DropZone } from '../../scene/DropZone'
import { parseKind, restock, SHELF_CAPACITY, SHELF_IDS, SHELF_NAMES, shelfHasRoom, shelfKind, type ShopState } from './freePlay'
import { labelOf } from './products'

export interface ShopShelvesProps {
  shop: ShopState
  onChange: (next: ShopState) => void
}

const WOOD = '#B9784A'
const WOOD_DARK = '#94582F'
const WOOD_LIGHT = '#D9A274'
const BACK = '#F6DDB9'
const TAG_COLOURS = ['#FF6B5B', '#36C5A2', '#4DA6EC'] as const

/** Shelf sign on top of the unit. */
function Crown() {
  return (
    <div aria-hidden="true" className="relative mx-auto -mb-1 flex h-9 w-[70%] items-center justify-center rounded-t-[1.2rem]" style={{ background: WOOD_DARK }}>
      <span className="rounded-full px-3 text-base font-bold tracking-[0.18em] text-[#FFE6BF]">FRUITA · PA</span>
    </div>
  )
}

/**
 * The shop's wooden shelf unit: three boards of compartments to restock from the delivery crate.
 * Drag, tap-then-tap, or the keyboard. Each board is a drop place.
 */
export function ShopShelves({ shop, onChange }: ShopShelvesProps) {
  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <Crown />
      <div className="rounded-[1.4rem] p-2.5 pb-1 shadow-[var(--world-shadow-lift)]" style={{ background: WOOD }}>
        <div className="rounded-[0.9rem] px-1.5 pt-1" style={{ background: BACK }}>
          {SHELF_IDS.map((shelf, row) => (
            <DropZone
              key={shelf}
              id={shelf}
              label={SHELF_NAMES[shelf]}
              accepts={(prop) => prop.kind.startsWith('entrega:') && shelfHasRoom(shop, shelf)}
              onDrop={(prop) => {
                const parsed = parseKind(prop.kind)
                if (parsed?.from === 'entrega') onChange(restock(shop, shelf, parsed.product))
              }}
              className="rounded-[0.8rem]"
            >
              <ul aria-label={SHELF_NAMES[shelf]} className="grid grid-cols-5 items-end gap-0.5 px-0.5 pt-1">
                {shop.shelves[shelf].map((product, index) => (
                  <li key={`${product}-${index}`} className="grid place-items-center">
                    <Draggable prop={{ id: `${shelf}-${index}`, label: `${labelOf(product)} del prestatge`, kind: shelfKind(shelf, index, product) }} className="grid size-14 place-items-end justify-center">
                      <FitProp id={product} box={46} />
                    </Draggable>
                  </li>
                ))}
                {Array.from({ length: SHELF_CAPACITY - shop.shelves[shelf].length }, (_, i) => (
                  <li key={`buit-${i}`} aria-hidden="true" className="mx-auto mb-0.5 h-12 w-[86%] rounded-t-xl" style={{ background: 'rgba(148, 88, 47, 0.12)' }} />
                ))}
              </ul>
              {/* The board, with a little price tag on its front lip. */}
              <div aria-hidden="true" className="relative -mx-1.5 h-4 rounded-md" style={{ background: WOOD_LIGHT, boxShadow: `inset 0 -5px 0 ${WOOD_DARK}` }}>
                <span className="absolute left-[12%] top-1 h-3 w-7 rounded-sm" style={{ background: TAG_COLOURS[row % TAG_COLOURS.length] }} />
              </div>
            </DropZone>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="flex justify-between px-4">
        <span className="block h-3 w-6 rounded-b-md" style={{ background: WOOD_DARK }} />
        <span className="block h-3 w-6 rounded-b-md" style={{ background: WOOD_DARK }} />
      </div>
    </div>
  )
}
