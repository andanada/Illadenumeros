import { describe, expect, it } from 'vitest'
import { makeTestItem } from '../shared/testUtils'
import {
  boardCells,
  completeBoard,
  emptyBoard,
  placeCounter,
  planFromItem,
  stepOf,
  toggleCross,
  trayCount,
  type BoardPlan,
} from './frameLogic'

const add: BoardPlan = { mode: 'add', first: 7, second: 5 }
const sub: BoardPlan = { mode: 'sub', first: 12, second: 4 }

describe('frameLogic', () => {
  it('builds an addition in two colours then asks for the answer', () => {
    let state = emptyBoard
    expect(stepOf(add, state)).toBe('build-first')
    expect(trayCount(add, state)).toBe(7)
    for (let i = 0; i < 7; i++) state = placeCounter(add, state)
    expect(stepOf(add, state)).toBe('build-second')
    expect(trayCount(add, state)).toBe(5)
    for (let i = 0; i < 5; i++) state = placeCounter(add, state)
    expect(stepOf(add, state)).toBe('answer')
    expect(placeCounter(add, state)).toBe(state)
    const cells = boardCells(add, state)
    expect(cells.filter((c) => c === 'c1')).toHaveLength(7)
    expect(cells.filter((c) => c === 'c2')).toHaveLength(5)
    expect(cells.filter((c) => c === 'empty')).toHaveLength(8)
  })

  it('subtracts by crossing exactly `second` counters', () => {
    expect(completeBoard(sub).crossed).toEqual([8, 9, 10, 11])
    let state = { placed: 12, crossed: [] as readonly number[] }
    expect(stepOf(sub, state)).toBe('cross')
    for (const i of [0, 1, 2, 3]) state = toggleCross(sub, state, i)
    expect(stepOf(sub, state)).toBe('answer')
    expect(toggleCross(sub, state, 5)).toBe(state)
    state = toggleCross(sub, state, 0)
    expect(state.crossed).not.toContain(0)
    expect(boardCells(sub, state).filter((c) => c === 'crossed')).toHaveLength(3)
  })

  it('does not cross empty cells', () => {
    expect(toggleCross(sub, { placed: 3, crossed: [] }, 5).crossed).toEqual([])
  })

  it('does not mutate previous states', () => {
    const before = { placed: 2, crossed: [] as readonly number[] }
    placeCounter(add, before)
    expect(before.placed).toBe(2)
  })

  it('derives plans from generated items', () => {
    expect(planFromItem(makeTestItem('A4', 'add:3+5'))).toMatchObject({ mode: 'add' })
    expect(planFromItem(makeTestItem('A6', 'sub:9-4'))).toEqual({ mode: 'sub', first: 9, second: 4 })
    const count = makeTestItem('A1')
    expect(planFromItem(count)).toEqual({ mode: 'count', first: Number(count.answer), second: 0 })
  })
})
