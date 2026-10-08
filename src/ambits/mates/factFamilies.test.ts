import { describe, expect, it } from 'vitest'
import { factFamily } from './factFamilies'
import { factsForSkill } from './facts'
import { factOwner } from './operations'

const ALL = ['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'C4', 'C5', 'C7', 'D2', 'D3', 'D4'].flatMap(factsForSkill)

describe('fact families', () => {
  it('8 + 5 belongs with 13 - 5 and 13 - 8', () => {
    expect(new Set(factFamily('add:5+8'))).toEqual(new Set(['sub:13-5', 'sub:13-8']))
  })

  it('13 - 5 belongs with 5 + 8 and 13 - 8', () => {
    expect(new Set(factFamily('sub:13-5'))).toEqual(new Set(['add:5+8', 'sub:13-8']))
  })

  it('7 x 8 belongs with 56 : 7 and 56 : 8; 56 : 7 with 7 x 8 and 56 : 8', () => {
    expect(new Set(factFamily('mul:7x8'))).toEqual(new Set(['div:56:7', 'div:56:8']))
    expect(new Set(factFamily('div:56:7'))).toEqual(new Set(['mul:7x8', 'div:56:8']))
  })

  it('doubles have a single partner (the other order is the same fact)', () => {
    expect(factFamily('add:6+6')).toEqual(['sub:12-6'])
    expect(factFamily('mul:7x7')).toEqual(['div:49:7'])
  })

  it('friends of 10 connect to the 10 sums and subtractions', () => {
    expect(new Set(factFamily('c10:3'))).toEqual(new Set(['add:3+7', 'sub:10-3', 'sub:10-7']))
  })

  it('zero and one facts connect to their inverse divisions', () => {
    expect(factFamily('mul:0x5')).toEqual(['div:0:5'])
    expect(new Set(factFamily('mul:1x6'))).toEqual(new Set(['div:6:1', 'div:6:6']))
  })

  it('never lists the fact itself, only tracked facts, and is symmetric', () => {
    for (const key of ALL) {
      const family = factFamily(key)
      expect(family).not.toContain(key)
      for (const partner of family) {
        expect(factOwner(partner), `${key} -> ${partner}`).toBeDefined()
        if (!key.startsWith('c10:') && !partner.startsWith('c10:')) expect(factFamily(partner), `${partner} <- ${key}`).toContain(key)
      }
    }
  })
})
