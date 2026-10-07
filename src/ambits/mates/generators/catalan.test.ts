import { describe, expect, it } from 'vitest'
import { createRng } from '../../../core/rng'
import { countOf, de, deNumber, eachOne, howMany, pickDistinct, THINGS, type Noun } from './catalan'

const galeta = THINGS.find((t) => t.singular === 'galeta') as Noun
const adhesiu = THINGS.find((t) => t.singular === 'adhesiu') as Noun

describe('Catalan helpers', () => {
  it('agrees number and gender', () => {
    expect(countOf(1, galeta)).toBe('una galeta')
    expect(countOf(1, adhesiu)).toBe('un adhesiu')
    expect(countOf(3, galeta)).toBe('3 galetes')
    expect(howMany(galeta)).toBe('Quantes galetes')
    expect(howMany(adhesiu)).toBe('Quants adhesius')
    expect(eachOne(galeta)).toBe('cada una')
    expect(eachOne(adhesiu)).toBe('cada un')
  })

  it('elides "de" before vowels and before numbers read with a vowel', () => {
    expect(de('adhesius')).toBe('d’adhesius')
    expect(de('galetes')).toBe('de galetes')
    expect(deNumber(1)).toBe('d’1')
    expect(deNumber(11)).toBe('d’11')
    expect(deNumber(8)).toBe('de 8')
    expect(deNumber(1000)).toBe('de 1000')
  })

  it('picks distinct items deterministically', () => {
    const a = pickDistinct(createRng('s'), ['x', 'y', 'z'], 2)
    expect(new Set(a).size).toBe(2)
    expect(pickDistinct(createRng('s'), ['x', 'y', 'z'], 2)).toEqual(a)
  })
})
