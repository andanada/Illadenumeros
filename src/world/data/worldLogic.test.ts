import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { WorldRow } from '../../core/storage/worldRow'
import type { CatalogEntry } from '../model/types'
import { registerCatalog, resetCatalogForTest } from './catalog'
import { defaultWorld } from './defaultWorld'
import { adopt, buy, grant, move, place, remove, setAvatar } from './worldLogic'

const SOFA: CatalogEntry = { id: 'sofa', kind: 'furniture', name: 'Sofà', price: 20, scene: 'casa' }
const GAT: CatalogEntry = { id: 'gat-gris', kind: 'pet', name: 'Gat', price: 15 }
const PA: CatalogEntry = { id: 'pa', kind: 'food', name: 'Pa', price: 2 }
const GORRA: CatalogEntry = { id: 'gorra-free', kind: 'accessory', name: 'Gorra', price: 0 }

const base = (): WorldRow => defaultWorld({ character: 'blau', color: 'menta' })
const sofaAt = (uid: string) => ({ uid, item: 'sofa', x: 0.2, y: 0.3, z: 1 })

beforeEach(() => {
  registerCatalog([SOFA, GAT, PA, GORRA])
})
afterEach(resetCatalogForTest)

describe('buy', () => {
  it('charges the price, adds the item and never mutates the input', () => {
    const row = Object.freeze(base())
    const r = buy(row, SOFA, 25)
    expect(r).toEqual({ ok: true, row: { ...row, owned: ['sofa'], petalsSpent: 20 }, charged: 20 })
  })

  it('refuses without enough coins (coins = petals - spent)', () => {
    const row = { ...base(), petalsSpent: 10 }
    expect(buy(row, SOFA, 29)).toEqual({ ok: false, reason: 'not-enough-coins' })
    expect(buy(row, SOFA, 30).ok).toBe(true)
  })

  it('is idempotent for something already owned (no second charge)', () => {
    const once = buy(base(), SOFA, 100)
    if (!once.ok) throw new Error('should buy')
    expect(buy(once.row, SOFA, 100)).toEqual({ ok: true, row: once.row, charged: 0 })
  })

  it('food is consumed: charged every time, never owned', () => {
    const r = buy(base(), PA, 5)
    expect(r).toMatchObject({ ok: true, charged: 2, row: { owned: [], petalsSpent: 2 } })
  })

  it('refuses entries that are not in the catalogue or whose price differs from it', () => {
    expect(buy(base(), { ...SOFA, id: 'drac' }, 999)).toEqual({ ok: false, reason: 'unknown-item' })
    expect(buy(base(), { ...SOFA, price: 0 }, 999)).toEqual({ ok: false, reason: 'unknown-item' })
  })

  it('coins never go negative (property)', () => {
    fc.assert(
      fc.property(fc.nat(100), fc.array(fc.constantFrom(SOFA, GAT, PA), { maxLength: 12 }), (petals, list) => {
        const end = list.reduce((row, e) => {
          const r = buy(row, e, petals)
          return r.ok ? r.row : row
        }, base())
        expect(end.petalsSpent).toBeLessThanOrEqual(petals)
      }),
    )
  })
})

describe('setAvatar', () => {
  it('accepts free and owned parts and stamps a newer avatarUpdatedAt', () => {
    const row = { ...base(), owned: ['corona'], avatarUpdatedAt: 500 }
    const spec = { ...row.avatar, accessory: { item: 'corona', color: 'mango' as const } }
    const r = setAvatar(row, spec, 100)
    expect(r).toEqual({ ok: true, row: { ...row, avatar: spec, avatarUpdatedAt: 501 } })
  })

  it('refuses a part that is neither owned nor free, and an invalid spec', () => {
    const row = base()
    expect(setAvatar(row, { ...row.avatar, accessory: { item: 'corona', color: 'mango' } }, 1)).toEqual({ ok: false, reason: 'not-owned' })
    expect(setAvatar(row, { ...row.avatar, skin: 's9' } as never, 1)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('face features are identity: any eyes and mouth are allowed', () => {
    const row = base()
    expect(setAvatar(row, { ...row.avatar, eyes: 'ulls-ovals', mouth: 'boca-gat' }, 9).ok).toBe(true)
  })
})

describe('placements', () => {
  const owning = (): WorldRow => ({ ...base(), owned: ['sofa'] })

  it('places an owned item and stamps the scene time', () => {
    const r = place(owning(), 'casa', sofaAt('u1'), 50)
    expect(r).toEqual({ ok: true, row: { ...owning(), placed: { casa: [sofaAt('u1')] }, placedAt: { casa: 50 } } })
  })

  it('refuses unowned items, duplicated uids and invalid placements', () => {
    expect(place(base(), 'casa', sofaAt('u1'), 1)).toEqual({ ok: false, reason: 'not-owned' })
    const one = place(owning(), 'casa', sofaAt('u1'), 1)
    if (!one.ok) throw new Error('should place')
    expect(place(one.row, 'casa', sofaAt('u1'), 2)).toEqual({ ok: false, reason: 'invalid' })
    expect(place(owning(), 'casa', { ...sofaAt('u2'), x: 2 }, 1)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('moves and removes by uid, always with a strictly newer scene time', () => {
    const one = place(owning(), 'casa', sofaAt('u1'), 100)
    if (!one.ok) throw new Error('should place')
    const moved = move(one.row, 'casa', 'u1', { x: 0.9, flip: true }, 10)
    expect(moved).toMatchObject({ ok: true, row: { placed: { casa: [{ ...sofaAt('u1'), x: 0.9, flip: true }] }, placedAt: { casa: 101 } } })
    expect(move(one.row, 'casa', 'nope', { x: 0.1 }, 10)).toEqual({ ok: false, reason: 'not-found' })
    expect(move(one.row, 'casa', 'u1', { x: -1 }, 10)).toEqual({ ok: false, reason: 'invalid' })
    const removed = remove(one.row, 'casa', 'u1', 200)
    expect(removed).toMatchObject({ ok: true, row: { placed: { casa: [] }, placedAt: { casa: 200 } } })
    expect(remove(one.row, 'botiga', 'u1', 200)).toEqual({ ok: false, reason: 'not-found' })
  })
})

describe('adopt', () => {
  it('adopts an owned or free pet once', () => {
    const r = adopt({ ...base(), owned: ['gat-gris'] }, 'gat-gris')
    expect(r).toMatchObject({ ok: true, row: { pets: ['gat-gris'] } })
    if (r.ok) expect(adopt(r.row, 'gat-gris')).toEqual({ ok: true, row: r.row })
  })

  it('refuses a pet that is not bought, or not a pet at all', () => {
    expect(adopt(base(), 'gat-gris')).toEqual({ ok: false, reason: 'not-owned' })
    expect(adopt({ ...base(), owned: ['sofa'] }, 'sofa')).toEqual({ ok: false, reason: 'unknown-item' })
  })
})

describe('grant (free gift)', () => {
  it('adds a catalogue item without charging, never mutating the input', () => {
    const row = Object.freeze(base())
    const r = grant(row, 'sofa')
    expect(r).toEqual({ ok: true, row: { ...row, owned: ['sofa'] } })
    expect(row.owned).toEqual([])
    if (r.ok) expect(r.row.petalsSpent).toBe(row.petalsSpent)
  })

  it('is idempotent and keeps the owned list sorted', () => {
    const first = grant({ ...base(), owned: ['zebra'] }, 'sofa')
    if (!first.ok) throw new Error('grant failed')
    expect(first.row.owned).toEqual(['sofa', 'zebra'])
    expect(grant(first.row, 'sofa')).toEqual({ ok: true, row: first.row })
  })

  it('refuses unknown items and food (food is never owned)', () => {
    expect(grant(base(), 'no-existeix')).toEqual({ ok: false, reason: 'unknown-item' })
    expect(grant(base(), 'pa')).toEqual({ ok: false, reason: 'unknown-item' })
  })
})
