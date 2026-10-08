import fc from 'fast-check'
import { avatarSpecSchema, PALETTE_COLORS, type AvatarSpec } from '../../model/types'
import { defaultAvatar } from '../wearables'
import { ALL_OPTIONS, creatorReducer, initCreator, optionsFor, randomSpec, type CreatorAction } from './creatorReducer'

const base: AvatarSpec = defaultAvatar('mixa', 'lila')
const deepFreeze = <T,>(o: T): T => {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze)
    Object.freeze(o)
  }
  return o
}

describe('creatorReducer', () => {
  it('never mutates the previous state', () => {
    const s0 = deepFreeze(initCreator(base))
    const actions: CreatorAction[] = [
      { type: 'tab', tab: 'dalt' },
      { type: 'skin', skin: 's5' },
      { type: 'hair', style: 'cabell-trenes' },
      { type: 'color', slot: 'hair', color: 'coral' },
      { type: 'wear', slot: 'top', item: 'jaqueta' },
      { type: 'color', slot: 'top', color: 'menta' },
      { type: 'accessory', item: null },
      { type: 'accessory', item: 'corona' },
      { type: 'randomise', seed: 7 },
    ]
    expect(() => actions.reduce(creatorReducer, s0)).not.toThrow()
  })

  it('applies each kind of change', () => {
    let s = initCreator(base)
    s = creatorReducer(s, { type: 'skin', skin: 's6' })
    s = creatorReducer(s, { type: 'eyes', id: 'ulls-estel' })
    s = creatorReducer(s, { type: 'mouth', id: 'boca-oh' })
    s = creatorReducer(s, { type: 'wear', slot: 'shoes', item: 'botes-pluja' })
    s = creatorReducer(s, { type: 'color', slot: 'shoes', color: 'llima' })
    expect(s.spec).toMatchObject({ skin: 's6', eyes: 'ulls-estel', mouth: 'boca-oh', shoes: { item: 'botes-pluja', color: 'llima' } })
  })

  it('ignores unknown ids and colours', () => {
    const s = initCreator(base)
    expect(creatorReducer(s, { type: 'wear', slot: 'top', item: 'capa-de-superheroi' })).toBe(s)
    expect(creatorReducer(s, { type: 'hair', style: 'nope' })).toBe(s)
    expect(creatorReducer(s, { type: 'color', slot: 'top', color: 'fucsia' as never })).toBe(s)
  })

  it('remembers the accessory colour when switching it off and on', () => {
    let s = initCreator({ ...base, accessory: { item: 'llac', color: 'menta' } })
    s = creatorReducer(s, { type: 'accessory', item: null })
    expect(s.spec.accessory).toBeNull()
    s = creatorReducer(s, { type: 'color', slot: 'accessory', color: 'coral' })
    s = creatorReducer(s, { type: 'accessory', item: 'gorra' })
    expect(s.spec.accessory).toEqual({ item: 'gorra', color: 'coral' })
  })

  it('reset replaces the spec', () => {
    const other = defaultAvatar('blau', 'menta')
    expect(creatorReducer(initCreator(base), { type: 'reset', spec: other }).spec).toEqual(other)
  })

  it('randomise is deterministic, valid, keeps skin and counts spins', () => {
    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.string()), (seed) => {
        const s = creatorReducer(initCreator(base), { type: 'randomise', seed })
        const again = creatorReducer(initCreator(base), { type: 'randomise', seed })
        return (
          s.spins === 1 &&
          s.spec.skin === base.skin &&
          s.spec.top.color !== s.spec.bottom.color &&
          avatarSpecSchema.safeParse(s.spec).success &&
          JSON.stringify(s.spec) === JSON.stringify(again.spec)
        )
      }),
    )
  })
})

describe('optionsFor', () => {
  it('returns everything without an owned list', () => {
    expect(optionsFor(undefined, base)).toBe(ALL_OPTIONS)
  })

  it('keeps owned and worn items only, faces stay free', () => {
    const o = optionsFor(['samarreta', 'pantalons'], base)
    expect(o.top).toEqual(expect.arrayContaining(['samarreta', base.top.item]))
    expect(o.top).not.toContain('jaqueta')
    expect(o.eyes).toEqual(ALL_OPTIONS.eyes)
  })

  it('randomSpec falls back to the base when a category is empty', () => {
    const empty = { ...ALL_OPTIONS, top: [], accessory: [] }
    const spec = randomSpec(1, empty, base)
    expect(spec.top.item).toBe(base.top.item)
    expect(spec.accessory).toBeNull()
    expect(PALETTE_COLORS).toContain(spec.top.color)
  })
})
