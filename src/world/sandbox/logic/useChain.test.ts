import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { applyTool, CHAIN_START, currentStage, isDone, nextTool, type UseChain } from './useChain'

const FRUIT: UseChain = {
  stages: [
    { id: 'crua', said: 'Una poma bonica.' },
    { id: 'neta', tool: 'aixeta', said: 'Neta!' },
    { id: 'tallada', tool: 'ganivet', said: 'A trossets!' },
    { id: 'cuita', tool: 'olla', said: 'Cuita!' },
    { id: 'emplatada', tool: 'plat', said: 'Emplatada!' },
  ],
}

describe('useChain', () => {
  it('runs wash, chop, cook, plate in order', () => {
    let state = CHAIN_START
    for (const tool of ['aixeta', 'ganivet', 'olla', 'plat']) {
      const r = applyTool(FRUIT, state, tool)
      expect(r.ok).toBe(true)
      state = r.state
    }
    expect(isDone(FRUIT, state)).toBe(true)
    expect(currentStage(FRUIT, state).id).toBe('emplatada')
  })

  it('a wrong tool changes nothing and says what it wants', () => {
    const r = applyTool(FRUIT, CHAIN_START, 'olla')
    expect(r).toEqual({ ok: false, state: CHAIN_START, expected: 'aixeta' })
    expect(nextTool(FRUIT, CHAIN_START)).toBe('aixeta')
  })

  it('a finished chain accepts nothing', () => {
    expect(applyTool(FRUIT, { at: 4 }, 'plat').ok).toBe(false)
    expect(nextTool(FRUIT, { at: 4 })).toBeUndefined()
  })

  it('property: any tool sequence never skips a stage', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('aixeta', 'ganivet', 'olla', 'plat', 'altre'), { maxLength: 20 }), (tools) => {
        let state = CHAIN_START
        for (const tool of tools) {
          const r = applyTool(FRUIT, state, tool)
          expect(r.state.at - state.at).toBeLessThanOrEqual(1)
          state = r.state
        }
        expect(state.at).toBeLessThanOrEqual(4)
      }),
    )
  })
})
