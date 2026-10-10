import { describe, expect, it } from 'vitest'
import { makeItem, type ItemState, type Items } from './itemsState'
import { resolveItemTap, type DefLookup } from './resolveTap'
import type { UseChain } from './useChain'

const FRUIT: UseChain = {
  stages: [
    { id: 'crua', said: 'Una poma.' },
    { id: 'neta', tool: 'aixeta', said: 'Neta!' },
    { id: 'tallada', tool: 'ganivet', said: 'A trossets!' },
  ],
}

const defs: DefLookup = {
  poma: { pickup: true, use: FRUIT },
  ganivet: { pickup: true, tool: 'ganivet' },
  aixeta: { pickup: true, tool: 'aixeta' },
  nevera: { container: true },
  ou: { surprise: true },
  roca: {},
}

const floor = { t: 'floor', room: 'sala', at: { x: 0.5, y: 0.8 } } as const
const mk = (): Items => ({
  poma: makeItem('poma', 'poma', floor),
  ganivet: makeItem('ganivet', 'ganivet', floor),
  aixeta: makeItem('aixeta', 'aixeta', floor),
  nevera: makeItem('nevera', 'nevera', floor),
  ou: makeItem('ou', 'ou', floor),
  roca: makeItem('roca', 'roca', floor),
  suc: makeItem('suc', 'poma', { t: 'in', box: 'nevera' }),
})

const change = (items: Items, uid: string, patch: Partial<ItemState>): Items => {
  const cur = items[uid]
  if (!cur) throw new Error(uid)
  return { ...items, [uid]: { ...cur, ...patch } }
}
const held = (items: Items, uid: string): Items => change(items, uid, { loc: { t: 'held', by: 'laia' } })
const opened = (items: Items): Items => change(items, 'nevera', { open: true })

describe('resolveItemTap', () => {
  it('a free hand picks up pickable things', () => {
    expect(resolveItemTap(mk(), defs, 'laia', 'poma')).toEqual({ kind: 'pickup', uid: 'poma' })
  })

  it('containers open and close; a closed box hides its contents', () => {
    expect(resolveItemTap(mk(), defs, 'laia', 'nevera')).toEqual({ kind: 'toggle', uid: 'nevera' })
    expect(resolveItemTap(mk(), defs, 'laia', 'suc')).toMatchObject({ kind: 'reject' })
    const open = opened(mk())
    expect(resolveItemTap(open, defs, 'laia', 'suc')).toEqual({ kind: 'pickup', uid: 'suc' })
  })

  it('surprises take taps', () => {
    expect(resolveItemTap(mk(), defs, 'laia', 'ou')).toEqual({ kind: 'surprise', uid: 'ou' })
  })

  it('the right tool in hand advances the target, the wrong one explains', () => {
    const items = held(mk(), 'aixeta')
    expect(resolveItemTap(items, defs, 'laia', 'poma')).toEqual({ kind: 'apply', uid: 'poma', tool: 'aixeta', toolUid: 'aixeta' })
    const wrong = held(mk(), 'ganivet')
    expect(resolveItemTap(wrong, defs, 'laia', 'poma')).toEqual({ kind: 'hint', uid: 'poma', needs: 'aixeta' })
  })

  it('a free hand tapping a thing that wants a tool hints at the tool only when it cannot be picked', () => {
    const plain: DefLookup = { ...defs, poma: { use: FRUIT } }
    expect(resolveItemTap(mk(), plain, 'laia', 'poma')).toEqual({ kind: 'hint', uid: 'poma', needs: 'aixeta' })
  })

  it('tapping what you hold puts it down; a held item into an open box goes in', () => {
    const items = held(mk(), 'poma')
    expect(resolveItemTap(items, defs, 'laia', 'poma')).toEqual({ kind: 'putdown', uid: 'poma' })
    expect(resolveItemTap(items, defs, 'laia', 'nevera')).toEqual({ kind: 'toggle', uid: 'nevera' })
    const open = opened(items)
    expect(resolveItemTap(open, defs, 'laia', 'nevera')).toEqual({ kind: 'putin', uid: 'nevera', held: 'poma' })
  })

  it('things that do nothing just wiggle', () => {
    expect(resolveItemTap(mk(), defs, 'laia', 'roca')).toEqual({ kind: 'poke', uid: 'roca' })
  })
})
