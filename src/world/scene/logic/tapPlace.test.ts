import { describe, expect, it } from 'vitest'
import { capitalise, EMPTY_HAND, tapPlaceReducer, toPlace } from './tapPlace'

describe('tapPlaceReducer', () => {
  it('pick then place drops and announces it', () => {
    const picked = tapPlaceReducer(EMPTY_HAND, { type: 'pick', propId: 'p1', label: 'la poma' })
    expect(picked.state.held?.propId).toBe('p1')
    expect(picked.announce).toMatch(/Has agafat la poma/)
    const placed = tapPlaceReducer(picked.state, { type: 'place', zoneId: 'cistella', zoneLabel: 'la cistella', accepted: true })
    expect(placed.effect).toEqual({ type: 'drop', propId: 'p1', zoneId: 'cistella' })
    expect(placed.state).toEqual(EMPTY_HAND)
    expect(placed.announce).toBe('Has posat la poma a la cistella.')
  })

  it('a refused place gives it back kindly', () => {
    const picked = tapPlaceReducer(EMPTY_HAND, { type: 'pick', propId: 'p1', label: 'la poma' }).state
    const step = tapPlaceReducer(picked, { type: 'place', zoneId: 'nevera', zoneLabel: 'la nevera', accepted: false })
    expect(step.effect).toEqual({ type: 'reject', propId: 'p1' })
    expect(step.announce).toMatch(/^La poma no va a la nevera/)
  })

  it('picking the same prop again or cancelling lets go; placing with an empty hand does nothing', () => {
    const picked = tapPlaceReducer(EMPTY_HAND, { type: 'pick', propId: 'p1', label: 'la poma' }).state
    expect(tapPlaceReducer(picked, { type: 'pick', propId: 'p1', label: 'la poma' }).state).toEqual(EMPTY_HAND)
    expect(tapPlaceReducer(picked, { type: 'cancel' }).announce).toMatch(/deixat anar/)
    expect(tapPlaceReducer(EMPTY_HAND, { type: 'cancel' }).announce).toBe('')
    expect(tapPlaceReducer(EMPTY_HAND, { type: 'place', zoneId: 'x', zoneLabel: 'x', accepted: true }).effect).toBeUndefined()
    expect(tapPlaceReducer(picked, { type: 'pick', propId: 'p2', label: 'el pa' }).state.held?.propId).toBe('p2')
  })

  it('contracts a + el / els', () => {
    expect(toPlace('el plat')).toBe('al plat')
    expect(toPlace('els prestatges')).toBe('als prestatges')
    expect(toPlace('la cistella')).toBe('a la cistella')
  })

  it('capitalises', () => {
    expect(capitalise('')).toBe('')
    expect(capitalise('la')).toBe('La')
  })
})
