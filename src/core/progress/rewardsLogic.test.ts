import { describe, expect, it } from 'vitest'
import { DECOR, SPOTS } from '../../features/decor/catalog'
import { regularOf, SERIES, STICKERS } from '../../features/stickers/catalog'
import { emptyRewards, type Rewards } from '../storage/db'
import { addSticker, buyDecor, petalBalance, pickChestSticker, placedItems, SERIES_BONUS_PETALS, togglePlaced } from './rewardsLogic'

const rich = (): Rewards => ({ ...emptyRewards(), petals: 500 })

describe('catalogues', () => {
  it('has at least 60 new stickers and 20 decoration items with valid unique ids', () => {
    const ids = STICKERS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(STICKERS.filter((s) => s.source !== 'serie').length).toBeGreaterThanOrEqual(36 + 60)
    expect(DECOR.length).toBeGreaterThanOrEqual(20)
    for (const id of [...ids, ...DECOR.map((d) => d.id)]) expect(id).toMatch(/^[a-z0-9-]{1,32}$/)
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length)
    for (const d of DECOR) expect(SPOTS).toContain(d.spot)
  })

  it('every series has a master badge and stickers', () => {
    for (const series of SERIES) {
      expect(regularOf(series.id).length, series.id).toBeGreaterThan(0)
      expect(STICKERS.some((s) => s.series === series.id && s.source === 'serie'), series.id).toBe(true)
    }
  })
})

describe('buying and placing', () => {
  it('spends petals only through the balance, never below zero', () => {
    const item = DECOR[0]
    if (!item) throw new Error('sense catàleg')
    const bought = buyDecor(rich(), item.id)
    expect(bought.ok).toBe(true)
    if (bought.ok) {
      expect(petalBalance(bought.rewards)).toBe(500 - item.price)
      expect(bought.rewards.petals).toBe(500)
      expect(buyDecor(bought.rewards, item.id)).toEqual({ ok: false, reason: 'ja-comprat' })
    }
    expect(buyDecor(emptyRewards(), item.id)).toEqual({ ok: false, reason: 'petals' })
    expect(buyDecor(rich(), 'no-existeix')).toEqual({ ok: false, reason: 'desconegut' })
  })

  it('one item per spot: placing another replaces it; toggling removes it; not owned does nothing', () => {
    const [a, b] = DECOR.filter((d) => d.spot === 'llit')
    if (!a || !b) throw new Error('sense llits')
    const owned: Rewards = { ...rich(), decorOwned: [a.id, b.id] }
    const withA = togglePlaced(owned, a.id)
    expect(placedItems(withA)).toEqual([a.id])
    expect(placedItems(togglePlaced(withA, b.id))).toEqual([b.id])
    expect(placedItems(togglePlaced(withA, a.id))).toEqual([])
    expect(togglePlaced(rich(), a.id)).toEqual(rich())
  })

  it('does not mutate its input', () => {
    const before = rich()
    const frozen = JSON.stringify(before)
    buyDecor(before, DECOR[0]?.id ?? '')
    togglePlaced(before, DECOR[0]?.id ?? '')
    expect(JSON.stringify(before)).toBe(frozen)
  })
})

describe('stickers and series', () => {
  it('completing a series adds its badge and a bonus once', () => {
    const series = regularOf('mar')
    const last = series[series.length - 1]
    if (!last) throw new Error('sense sèrie')
    const almost: Rewards = { ...emptyRewards(), stickers: series.slice(0, -1).map((s) => s.id) }
    const done = addSticker(almost, last.id)
    expect(done.gained).toEqual([last.id, 'serie-mar'])
    expect(done.rewards.petals).toBe(SERIES_BONUS_PETALS)
    expect(addSticker(done.rewards, last.id).gained).toEqual([])
  })

  it('ignores unknown ids', () => {
    expect(addSticker(emptyRewards(), 'zzz').gained).toEqual([])
  })

  it('chest picks only game stickers not owned, weighted, and ends when all are owned', () => {
    const pick = pickChestSticker([], 0.5)
    expect(pick?.source).toBe('joc')
    const all = STICKERS.filter((s) => s.source === 'joc').map((s) => s.id)
    expect(pickChestSticker(all, 0.2)).toBeUndefined()
    expect(pickChestSticker(all.slice(1), 0.99)?.id).toBe(all[0])
  })
})
