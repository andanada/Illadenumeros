import { describe, expect, it } from 'vitest'
import { digitFromKey, matchTyped } from './typedAnswer'

describe('matchTyped', () => {
  it('picks a unique exact match at once', () => {
    expect(matchTyped('7', ['7', '8', '12'])).toEqual({ kind: 'pick', value: '7' })
  })
  it('waits when a longer answer starts with the typed digits', () => {
    expect(matchTyped('1', ['1', '12', '9'])).toEqual({ kind: 'wait', value: '1' })
    expect(matchTyped('12', ['1', '12', '9'])).toEqual({ kind: 'pick', value: '12' })
  })
  it('waits for a prefix without exact match and gives up when nothing fits', () => {
    expect(matchTyped('1', ['12', '9'])).toEqual({ kind: 'wait' })
    expect(matchTyped('5', ['12', '9'])).toEqual({ kind: 'none' })
    expect(matchTyped('', ['12'])).toEqual({ kind: 'none' })
  })
})

describe('digitFromKey', () => {
  it('accepts single digits only', () => {
    expect(digitFromKey('4')).toBe('4')
    expect(digitFromKey('Enter')).toBeUndefined()
    expect(digitFromKey('44')).toBeUndefined()
  })
})
