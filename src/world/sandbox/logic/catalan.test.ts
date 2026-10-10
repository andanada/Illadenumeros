import { describe, expect, it } from 'vitest'
import { ofPlace, placedSaid, takenSaid, toPlace } from './catalan'

describe('catalan contractions', () => {
  it('a + el = al, de + el = del, others stay apart', () => {
    expect(toPlace('el sofà')).toBe('al sofà')
    expect(ofPlace('el sofà')).toBe('del sofà')
    expect(ofPlace('els bancs')).toBe('dels bancs')
    expect(toPlace('la taula')).toBe('a la taula')
    expect(ofPlace('la taula')).toBe('de la taula')
  })
})

describe('counting sentences', () => {
  it('says where a thing went and how many there are', () => {
    expect(placedSaid('una poma', 'la cistella', 7)).toBe('Has posat una poma a la cistella: ara hi ha 7.')
    expect(placedSaid('una poma', 'el plat', undefined)).toBe('Has posat una poma al plat.')
    expect(takenSaid('una poma', 'la cistella', 6)).toBe('Has tret una poma de la cistella: ara hi ha 6.')
  })
})
