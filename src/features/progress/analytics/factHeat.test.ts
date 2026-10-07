import { describe, expect, it } from 'vitest'
import { newFactState, type FactState } from '../../../core/engine/leitner'
import { buildFactGrid, factCellText, formatSeconds, type FactCell } from './factHeat'

const fact = (key: string, patch: Partial<FactState>): FactState => ({ ...newFactState(key, 0), attempts: 1, ...patch })

describe('buildFactGrid', () => {
  it('builds a 10 x 10 grid of unpractised cells for an empty history', () => {
    const grid = buildFactGrid('mul', {})
    expect(grid).toHaveLength(10)
    expect(grid.every((row) => row.length === 10)).toBe(true)
    expect(grid.flat().every((c) => !c.practised)).toBe(true)
    expect(grid.flat().every((c) => c.modes.precisio.tone === 'buit' && c.modes.caixa.tone === 'buit' && c.modes.fluidesa.tone === 'buit')).toBe(true)
  })

  it('reads the commutative key for both cells (3 x 7 and 7 x 3)', () => {
    const grid = buildFactGrid('mul', { 'mul:3x7': fact('mul:3x7', { attempts: 4, correct: 3, box: 2 }) })
    expect(grid[2]?.[6]?.key).toBe('mul:3x7')
    expect(grid[6]?.[2]?.key).toBe('mul:3x7')
    expect(grid[6]?.[2]?.practised).toBe(true)
  })

  it('uses the add keys for the addition grid', () => {
    const grid = buildFactGrid('add', { 'add:4+9': fact('add:4+9', { attempts: 2, correct: 2 }) })
    expect(grid[8]?.[3]?.key).toBe('add:4+9')
    expect(grid[8]?.[3]?.practised).toBe(true)
  })

  it('buckets accuracy and gives each tone a distinct symbol', () => {
    const states = {
      'mul:2x2': fact('mul:2x2', { attempts: 10, correct: 9 }),
      'mul:2x3': fact('mul:2x3', { attempts: 10, correct: 6 }),
      'mul:2x4': fact('mul:2x4', { attempts: 10, correct: 2 }),
    }
    const grid = buildFactGrid('mul', states)
    const tones = [grid[1]?.[1], grid[1]?.[2], grid[1]?.[3]].map((c) => c?.modes.precisio)
    expect(tones.map((t) => t?.tone)).toEqual(['alta', 'mitjana', 'baixa'])
    expect(new Set(tones.map((t) => t?.symbol)).size).toBe(3)
  })

  it('maps the Leitner box 0..5', () => {
    const grid = buildFactGrid('mul', { 'mul:5x5': fact('mul:5x5', { box: 5, attempts: 3, correct: 3 }) })
    expect(grid[4]?.[4]?.modes.caixa).toMatchObject({ tone: 'caixa-5', symbol: '5' })
  })

  it('marks fluent facts using the 1.5x leniency', () => {
    const fluent = fact('mul:6x7', { box: 3, attempts: 5, correct: 5, recentRts: [5000, 5500, 5800] })
    const slow = fact('mul:6x8', { box: 3, attempts: 5, correct: 5, recentRts: [9000, 9500, 9800] })
    const grid = buildFactGrid('mul', { 'mul:6x7': fluent, 'mul:6x8': slow })
    expect(grid[5]?.[6]?.modes.fluidesa.tone).toBe('fluent')
    expect(grid[5]?.[7]?.modes.fluidesa.tone).toBe('no-fluent')
  })

  it('survives a fact with zero attempts and corrupt numbers', () => {
    const grid = buildFactGrid('add', { 'add:1+1': fact('add:1+1', { attempts: 0, correct: 0 }) })
    expect(grid[0]?.[0]?.practised).toBe(false)
  })
})

describe('factCellText', () => {
  it('reads like the spec', () => {
    const grid = buildFactGrid('mul', { 'mul:7x8': fact('mul:7x8', { attempts: 6, correct: 5, box: 3, recentRts: [4200] }) })
    expect(factCellText('mul', grid[6]?.[7] as FactCell)).toBe('7 × 8: 5 encerts de 6, caixa 3, 4,2 s')
  })
  it('uses the singular and the plus sign', () => {
    const grid = buildFactGrid('add', { 'add:2+3': fact('add:2+3', { attempts: 1, correct: 1, box: 1, recentRts: [1000] }) })
    expect(factCellText('add', grid[1]?.[2] as FactCell)).toBe('2 + 3: 1 encert d’1, caixa 1, 1,0 s')
  })
  it('says it has not been practised yet', () => {
    const grid = buildFactGrid('mul', {})
    expect(factCellText('mul', grid[0]?.[0] as FactCell)).toBe('1 × 1: encara no practicat')
  })
})

describe('formatSeconds', () => {
  it('uses a decimal comma', () => {
    expect(formatSeconds(4200)).toBe('4,2 s')
  })
})
