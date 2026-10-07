import { describe, expect, it } from 'vitest'
import { DIAGNOSTIC_ANCHORS, MATES_SKILLS } from '../../ambits/mates/skills'
import { currentAnchor, placementFrom, recordDiagnostic, startDiagnostic, type DiagnosticState } from './diagnostic'

const answerAnchor = (state: DiagnosticState, results: boolean[], fast = true): DiagnosticState =>
  results.reduce((s, correct) => recordDiagnostic(s, { correct, fast }), state)

describe('diagnostic', () => {
  it('starts at "sumar fins a 10", never at the 4th-grade level', () => {
    const state = startDiagnostic([...DIAGNOSTIC_ANCHORS])
    expect(currentAnchor(state)).toBe('A4')
  })

  it('3/3 fast jumps two anchors ahead and marks the skipped one as passed', () => {
    const state = answerAnchor(startDiagnostic([...DIAGNOSTIC_ANCHORS]), [true, true, true])
    expect(currentAnchor(state)).toBe('A8')
    expect(state.results.A4).toBe('superada')
    expect(state.results.A5).toBe('superada')
  })

  it('2/3 marks the anchor as partial and advances one', () => {
    const state = answerAnchor(startDiagnostic([...DIAGNOSTIC_ANCHORS]), [true, false, true])
    expect(state.results.A4).toBe('parcial')
    expect(currentAnchor(state)).toBe('A5')
  })

  it('stops climbing at the first failed anchor', () => {
    const state = answerAnchor(startDiagnostic([...DIAGNOSTIC_ANCHORS]), [false, false, true])
    expect(state.results.A4).toBe('fallada')
    expect(state.done).toBe(true)
    expect(currentAnchor(state)).toBeUndefined()
  })

  it('finishes at the end of the chain and reaches the last anchor and never asks more than 30 questions', () => {
    let state = startDiagnostic([...DIAGNOSTIC_ANCHORS])
    while (!state.done) state = recordDiagnostic(state, { correct: true, fast: false })
    expect(state.asked).toBeLessThanOrEqual(30)
    expect(Object.values(state.results).every((r) => r === 'superada')).toBe(true)
  })

  it('places passed anchors and their prerequisites as "consolidant", failed ones as "aprenent"', () => {
    let state = answerAnchor(startDiagnostic([...DIAGNOSTIC_ANCHORS]), [true, true, true])
    state = answerAnchor(state, [true, false, false])
    const placement = placementFrom(state, MATES_SKILLS)
    expect(placement.A4?.status).toBe('consolidant')
    expect(placement.A3?.status).toBe('consolidant')
    expect(placement.A1?.status).toBe('consolidant')
    expect(placement.A8?.status).toBe('aprenent')
    expect(placement.B7).toBeUndefined()
  })
})
