import { describe, expect, it } from 'vitest'
import { recordDiagnostic, startDiagnostic } from '../../core/engine/diagnostic'
import { diagnosticAnswer, stripSteps } from './diagnosticLogic'

describe('diagnosticAnswer', () => {
  it('marks answers under 1.5x the target as fast', () => {
    expect(diagnosticAnswer({ correct: true, rtMs: 4000, fluencyTargetMs: 3000 })).toEqual({ correct: true, fast: true })
    expect(diagnosticAnswer({ correct: true, rtMs: 5000, fluencyTargetMs: 3000 }).fast).toBe(false)
  })

  it('keeps wrong answers as not correct', () => {
    expect(diagnosticAnswer({ correct: false, rtMs: 100, fluencyTargetMs: 3000 }).correct).toBe(false)
  })
})

describe('stripSteps', () => {
  it('marks the current anchor and done ones', () => {
    let s = startDiagnostic(['A4', 'A5', 'A8'])
    expect(stripSteps(s).map((x) => x.status)).toEqual(['current', 'todo', 'todo'])
    for (let i = 0; i < 3; i++) s = recordDiagnostic(s, { correct: true, fast: false })
    expect(stripSteps(s).map((x) => x.status)).toEqual(['done', 'current', 'todo'])
  })

  it('counts a skipped anchor as done after three fast answers', () => {
    let s = startDiagnostic(['A4', 'A5', 'A8'])
    for (let i = 0; i < 3; i++) s = recordDiagnostic(s, { correct: true, fast: true })
    expect(stripSteps(s).map((x) => x.status)).toEqual(['done', 'done', 'current'])
  })
})
