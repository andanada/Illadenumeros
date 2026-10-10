import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorld } from '../../../data'
import type { Placement } from '../../../model/types'
import { worldSfx } from '../../../scene/worldSfx'
import { CASA_CATALOG, FURNITURE_BY_ID, withArticle } from '../furniture/catalog'
import { isHouseUid, migrate, newHouseUid, nextColour, nudge, starterLayout, type Direction } from './zones'

export interface House {
  ready: boolean
  coins: number
  owned: readonly string[]
  /** Every piece of the house (all floors). */
  pieces: readonly Placement[]
  selected: Placement | undefined
  select: (uid: string | undefined) => void
  /** Lamps switched on. */
  lit: readonly string[]
  toggleLamp: (uid: string) => void
  night: boolean
  setNight: (night: boolean) => void
  /** A short friendly line after an action («Et falten 5 monedes»). */
  note: string
  buy: (id: string) => Promise<boolean>
  placeNew: (id: string, at: { x: number; y: number }) => Promise<void>
  moveTo: (uid: string, at: { x: number; y: number }) => void
  nudgeSelected: (dir: Direction) => void
  flipSelected: () => void
  recolourSelected: () => void
  storeSelected: () => void
}

const SCENE = 'casa' as const

const withArticleOf = (id: string): string => {
  const def = FURNITURE_BY_ID[id]
  return def ? withArticle(def) : id
}

/** The child's home: what is where (persisted per scene 'casa'), plus the passing state (lamps, night). */
export function useHouse(): House {
  const world = useWorld()
  const [selectedUid, setSelectedUid] = useState<string | undefined>(undefined)
  const [lit, setLit] = useState<readonly string[]>([])
  const [night, setNight] = useState(false)
  const [note, setNote] = useState('')
  const seeded = useRef(false)
  const migrating = useRef(false)
  const salt = useRef(0)
  const pieces = world.placed.casa ?? []

  // First visit: the home is furnished with the free starter pieces (once).
  useEffect(() => {
    if (!world.ready || world.placed.casa !== undefined || seeded.current) return
    seeded.current = true
    void (async () => {
      for (const p of starterLayout(Date.now())) await world.place(SCENE, p)
    })()
  }, [world])

  // Pieces saved by the old three-room home are rewritten once in the house's scheme (new first, then the old one goes).
  useEffect(() => {
    if (!world.ready || migrating.current) return
    const old = (world.placed.casa ?? []).filter((p) => !isHouseUid(p.uid))
    if (old.length === 0) return
    migrating.current = true
    void (async () => {
      for (const p of old) {
        salt.current += 1
        const result = await world.place(SCENE, migrate(p, salt.current, Date.now()))
        if (result.ok) await world.remove(SCENE, p.uid)
      }
      migrating.current = false
    })()
  }, [world])

  const selected = pieces.find((p) => p.uid === selectedUid)

  const buy = async (id: string): Promise<boolean> => {
    const entry = CASA_CATALOG.find((e) => e.id === id)
    if (!entry) return false
    const result = await world.buy(entry)
    if (result.ok) {
      worldSfx.kaching()
      setNote(result.charged > 0 ? `Has comprat ${withArticleOf(id)}! Ara posa-ho on vulguis.` : '')
      return true
    }
    worldSfx.boing()
    setNote(result.reason === 'not-enough-coins' ? `Et falten ${entry.price - world.coins} monedes. Ajuda la família per guanyar-ne!` : 'Ara no s’ha pogut comprar. Torna-ho a provar.')
    return false
  }

  const placeNew = async (id: string, at: { x: number; y: number }): Promise<void> => {
    salt.current += 1
    const uid = newHouseUid(Date.now(), salt.current)
    const z = Math.min(999, pieces.reduce((m, p) => Math.max(m, p.z + 1), 0))
    const result = await world.place(SCENE, { uid, item: id, x: at.x, y: at.y, z })
    if (result.ok) setSelectedUid(uid)
    else setNote('Aquí ja no hi cap res més.')
  }

  const moveTo = useCallback((uid: string, at: { x: number; y: number }): void => void world.move(SCENE, uid, at), [world])

  const withSelected = (fn: (p: Placement) => void): void => {
    if (selected) fn(selected)
  }

  return {
    ready: world.ready,
    coins: world.coins,
    owned: world.owned,
    pieces,
    selected,
    select: setSelectedUid,
    lit,
    toggleLamp: (uid) => setLit((l) => (l.includes(uid) ? l.filter((u) => u !== uid) : [...l, uid])),
    night,
    setNight,
    note,
    buy,
    placeNew,
    moveTo,
    nudgeSelected: (dir) => withSelected((p) => moveTo(p.uid, nudge(p, dir))),
    flipSelected: () => withSelected((p) => void world.move(SCENE, p.uid, { flip: !p.flip })),
    recolourSelected: () =>
      withSelected((p) => {
        const def = FURNITURE_BY_ID[p.item]
        if (def?.recolourable) void world.move(SCENE, p.uid, { color: nextColour(p.color, def.color) })
      }),
    storeSelected: () =>
      withSelected((p) => {
        worldSfx.whoosh()
        setSelectedUid(undefined)
        void world.remove(SCENE, p.uid)
      }),
  }
}
