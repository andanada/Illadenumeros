import { describe, expect, it } from 'vitest'
import { ofPlace, toPlace } from './catalan'

describe('catalan contractions', () => {
  it('a + el = al, de + el = del, others stay apart', () => {
    expect(toPlace('el sofà')).toBe('al sofà')
    expect(ofPlace('el sofà')).toBe('del sofà')
    expect(ofPlace('els bancs')).toBe('dels bancs')
    expect(toPlace('la taula')).toBe('a la taula')
    expect(ofPlace('la taula')).toBe('de la taula')
  })
})
