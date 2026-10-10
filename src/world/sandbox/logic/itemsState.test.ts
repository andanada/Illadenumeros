import { describe, expect, it } from 'vitest'
import { canTakeFrom, itemsHeldBy, itemsIn, itemsInRoom, itemsReducer, makeItem, type Items } from './itemsState'

const start: Items = {
  nevera: makeItem('nevera', 'nevera', { t: 'floor', room: 'sala', at: { x: 0.8, y: 0.8 } }),
  poma: makeItem('poma', 'poma', { t: 'in', box: 'nevera' }),
  platan: makeItem('platan', 'platan', { t: 'floor', room: 'sala', at: { x: 0.3, y: 0.8 } }),
}

describe('itemsState', () => {
  it('a closed box does not hand out its contents; opening does', () => {
    expect(canTakeFrom(start, 'poma')).toBe(false)
    const open = itemsReducer(start, { type: 'toggle', uid: 'nevera' })
    expect(canTakeFrom(open, 'poma')).toBe(true)
    expect(itemsIn(open, 'nevera').map((i) => i.uid)).toEqual(['poma'])
  })

  it('pick, carry and drop in another room', () => {
    let s = itemsReducer(start, { type: 'pick', uid: 'platan', by: 'laia' })
    expect(itemsHeldBy(s, 'laia').map((i) => i.uid)).toEqual(['platan'])
    expect(itemsInRoom(s, 'sala').map((i) => i.uid)).toEqual(['nevera'])
    s = itemsReducer(s, { type: 'drop', uid: 'platan', room: 'jardi', at: { x: 0.2, y: 0.8 } })
    expect(itemsInRoom(s, 'jardi').map((i) => i.uid)).toEqual(['platan'])
    expect(itemsHeldBy(s, 'laia')).toEqual([])
  })

  it('giving moves the item to the receiver; gone items cannot be picked', () => {
    const given = itemsReducer(itemsReducer(start, { type: 'pick', uid: 'platan', by: 'laia' }), { type: 'hand', uid: 'platan', to: 'pilar' })
    expect(itemsHeldBy(given, 'pilar')).toHaveLength(1)
    const gone = itemsReducer(start, { type: 'gone', uid: 'platan' })
    expect(itemsReducer(gone, { type: 'pick', uid: 'platan', by: 'laia' }).platan?.loc.t).toBe('gone')
  })

  it('stashing puts a carried thing back inside an open box', () => {
    const s = itemsReducer(itemsReducer(start, { type: 'pick', uid: 'platan', by: 'laia' }), { type: 'stash', uid: 'platan', box: 'nevera' })
    expect(itemsIn(s, 'nevera').map((i) => i.uid).sort()).toEqual(['platan', 'poma'])
  })

  it('does not mutate and ignores unknown uids', () => {
    const before = JSON.stringify(start)
    itemsReducer(start, { type: 'poke', uid: 'platan' })
    expect(JSON.stringify(start)).toBe(before)
    expect(itemsReducer(start, { type: 'poke', uid: 'x' })).toBe(start)
  })
})
