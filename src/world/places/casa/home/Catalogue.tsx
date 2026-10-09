import { useEffect, useState } from 'react'
import { isFree } from '../../../data'
import { Draggable } from '../../../scene/Draggable'
import { furnitureFor, withArticle } from '../furniture/catalog'
import { FurnitureArt } from '../furniture/FurnitureArt'
import type { FurnitureDef, RoomId } from '../furniture/types'

export const CATALOGUE_KIND = 'moble-cataleg'
export const catalogueProp = (def: FurnitureDef) => ({ id: `cat:${def.id}`, label: withArticle(def), kind: CATALOGUE_KIND })
export const itemOfProp = (id: string): string => id.replace(/^cat:/, '')

export interface CatalogueProps {
  room: RoomId
  coins: number
  owned: readonly string[]
  note: string
  onBuy: (id: string) => void
  /** Put it in the room without dragging (a free spot). */
  onPlace: (id: string) => void
  onClose: () => void
}

/** Cards that fit across the screen: pages instead of a scroller, so a dragged card is never clipped. */
const fits = (): number => (typeof window === 'undefined' ? 6 : Math.max(2, Math.floor((window.innerWidth - 120) / 140)))

function useCardsPerPage(): number {
  const [n, setN] = useState(fits)
  useEffect(() => {
    const onResize = (): void => setN(fits())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return n
}

const pill = 'min-h-11 rounded-full px-4 text-lg font-bold shadow-[var(--world-shadow-soft)] active:translate-y-0.5'

function Card({ def, have, coins, onBuy, onPlace }: { def: FurnitureDef; have: boolean; coins: number; onBuy: () => void; onPlace: () => void }) {
  const art = (
    <div className="grid h-16 w-28 place-items-end justify-center">
      <FurnitureArt id={def.id} size={Math.min(60, 26 + def.h / 5)} />
    </div>
  )
  return (
    <li className="flex w-32 shrink-0 flex-col items-center gap-0.5 rounded-[1.4rem] bg-white/90 p-1.5 shadow-[var(--world-shadow-soft)]">
      {have ? (
        <Draggable prop={catalogueProp(def)} name={`${def.name}: arrossega’l a l’habitació`} sound="lift" className="grid place-items-center rounded-2xl">
          {art}
        </Draggable>
      ) : (
        <div className="opacity-90">{art}</div>
      )}
      <p className="text-center text-base font-bold leading-tight text-[var(--world-ink,#2b2440)]">{def.name}</p>
      {have ? (
        <button type="button" onClick={onPlace} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
          Posa’l
        </button>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          aria-label={`Compra ${withArticle(def)} per ${def.price} monedes`}
          className={`${pill} flex items-center gap-1 ${coins >= def.price ? 'bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]' : 'bg-[#EFE6F5] text-[var(--world-text-soft,#6b5f80)]'}`}
        >
          <span aria-hidden="true">🪙</span>
          {def.price}
        </button>
      )}
    </li>
  )
}

/** The furniture catalogue: buy with coins (only errands give coins), then drag or place in the room. */
export function Catalogue({ room, coins, owned, note, onBuy, onPlace, onClose }: CatalogueProps) {
  const perPage = useCardsPerPage()
  const all = furnitureFor(room)
  const pages = Math.max(1, Math.ceil(all.length / perPage))
  const [page, setPage] = useState(0)
  const current = Math.min(page, pages - 1)
  const shown = all.slice(current * perPage, current * perPage + perPage)
  const arrow = 'grid size-14 shrink-0 place-items-center rounded-full bg-white text-3xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)] disabled:opacity-40'
  return (
    <section aria-label="Catàleg de mobles" className="absolute inset-x-0 bottom-0 z-[800] rounded-t-[2rem] bg-[#FFF3DC]/95 pb-3 pt-2 portrait:pb-[6.5rem] shadow-[0_-10px_30px_rgba(43,36,64,0.18)]">
      <div className="flex items-center justify-between gap-2 px-4">
        <h2 className="text-2xl font-bold text-[var(--world-ink,#2b2440)]">Mobles i decoració</h2>
        <p aria-live="polite" className="min-w-0 flex-1 truncate text-center text-base font-semibold text-[var(--world-text-soft,#6b5f80)]">
          {note}
        </p>
        <button type="button" onClick={onClose} className={`${pill} bg-white text-[var(--world-ink,#2b2440)]`}>
          Tanca
        </button>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 px-2">
        <button type="button" aria-label="Mobles anteriors" disabled={current === 0} onClick={() => setPage(current - 1)} className={arrow}>
          ‹
        </button>
        <ul aria-label={`Pàgina ${current + 1} de ${pages}`} className="flex min-w-0 justify-center gap-3 pb-2 pt-1">
          {shown.map((def) => (
            <Card key={def.id} def={def} have={owned.includes(def.id) || isFree(def.id)} coins={coins} onBuy={() => onBuy(def.id)} onPlace={() => onPlace(def.id)} />
          ))}
        </ul>
        <button type="button" aria-label="Més mobles" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className={arrow}>
          ›
        </button>
      </div>
    </section>
  )
}
