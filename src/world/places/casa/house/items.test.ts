import { describe, expect, it } from 'vitest'
import { applyTool, CHAIN_START, isDone, type ChainState } from '../../../sandbox/logic/useChain'
import { HOUSE_DEFS, HOUSE_START } from './items'

const defs = Object.fromEntries(HOUSE_DEFS.map((d) => [d.id, d]))

describe('house items', () => {
  it('every start item has a definition and a unique uid', () => {
    expect(new Set(HOUSE_START.map((s) => s.uid)).size).toBe(HOUSE_START.length)
    for (const s of HOUSE_START) expect(defs[s.def], s.def).toBeDefined()
  })

  it('every tool a chain asks for exists as a pickup, and every chain can be finished in order', () => {
    const tools = new Set(HOUSE_DEFS.filter((d) => d.pickup && d.tool).map((d) => d.tool))
    for (const d of HOUSE_DEFS) {
      if (!d.use) continue
      let state: ChainState = CHAIN_START
      for (const st of d.use.stages.slice(1)) {
        expect(tools.has(st.tool), `${d.id}:${st.tool}`).toBe(true)
        const r = applyTool(d.use, state, st.tool ?? '')
        expect(r.ok).toBe(true)
        if (r.ok) state = r.state
      }
      expect(isDone(d.use, state)).toBe(true)
    }
  })

  it('the wrong tool never advances a chain', () => {
    const tub = defs.banyera?.use
    if (!tub) throw new Error('banyera')
    expect(applyTool(tub, CHAIN_START, 'sabo').ok).toBe(false)
    expect(applyTool(tub, CHAIN_START, 'galleda').ok).toBe(true)
  })

  it('the plant needs three waterings', () => {
    const plant = defs.planta?.use
    if (!plant) throw new Error('planta')
    let state: ChainState = CHAIN_START
    for (let i = 0; i < 3; i++) {
      const r = applyTool(plant, state, 'regadora')
      if (!r.ok) throw new Error('reg')
      state = r.state
    }
    expect(isDone(plant, state)).toBe(true)
  })
})
