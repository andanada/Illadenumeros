import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import {
  getOff,
  getOn,
  parseMissing,
  seatPlace,
  seatsFromItem,
  seatsRequest,
  seatsValue,
  SEATS,
  solutionOnBoard,
  startCrowd,
} from './seatsLogic'

const base: Item = {
  id: 'x',
  skillId: 'A4',
  text: '7 + 5 = ?',
  speech: '',
  answer: '12',
  choices: [{ value: '12' }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['a', 'b', 'c'],
  cpaStage: 'concret',
  operands: { a: 7, b: 5, op: '+' },
}

describe('seats: two ten-frames of windows', () => {
  it('fills each frame top row first, then the bottom row, then the second frame', () => {
    expect(seatPlace(0)).toEqual({ frame: 0, row: 0, col: 0 })
    expect(seatPlace(4)).toEqual({ frame: 0, row: 0, col: 4 })
    expect(seatPlace(5)).toEqual({ frame: 0, row: 1, col: 0 })
    expect(seatPlace(10)).toEqual({ frame: 1, row: 0, col: 0 })
    expect(seatPlace(19)).toEqual({ frame: 1, row: 1, col: 4 })
  })
})

describe('seats task from an item', () => {
  it('on, missing and off', () => {
    expect(seatsFromItem(base)).toMatchObject({ mode: 'on', a: 7, b: 5, start: 7, waiting: 7 })
    const missing = seatsFromItem({ ...base, text: '8 + ? = 10', answer: '2', operands: { a: 8, b: 2, op: '+' } })
    expect(missing).toMatchObject({ mode: 'missing', start: 8 })
    expect(missing && seatsValue(missing, 10)).toBe(2)
    const off = seatsFromItem({ ...base, text: '8 − 3 = ?', answer: '5', operands: { a: 8, b: 3, op: '-' } })
    expect(off).toMatchObject({ mode: 'off', start: 8, waiting: 0 })
    expect(off && solutionOnBoard(off)).toBe(5)
  })

  it('reads A3 / A10 texts without operands', () => {
    expect(parseMissing('10 = 3 + ?')).toEqual({ a: 3, b: 7, t: 10, unknown: 'second' })
    expect(parseMissing('3 + ? = 11')).toEqual({ a: 3, b: 8, t: 11, unknown: 'second' })
    expect(parseMissing('? + 2 = 9')).toEqual({ a: 7, b: 2, t: 9, unknown: 'first' })
    expect(parseMissing('9 + ? = 3')).toBeUndefined()
    expect(parseMissing('Quants n’hi ha?')).toBeUndefined()
    expect(seatsFromItem({ ...base, text: '10 = 3 + ?', answer: '7', operands: undefined })).toMatchObject({ mode: 'missing', a: 3, b: 7 })
    expect(seatsFromItem({ ...base, text: '? + 2 = 9', answer: '7', operands: undefined })).toBeUndefined()
  })

  it('refuses what does not fit in the bus', () => {
    expect(seatsFromItem({ ...base, operands: { a: 15, b: 9, op: '+' }, answer: '24' })).toBeUndefined()
    expect(seatsFromItem({ ...base, operands: { a: 30, b: 5, op: '-' }, answer: '25' })).toBeUndefined()
    expect(seatsFromItem({ ...base, operands: { a: 3, b: 4, op: '×' }, answer: '12' })).toBeUndefined()
    expect(seatsFromItem({ ...base, answer: 'dotze' })).toBeUndefined()
  })

  it('speaks Catalan requests with the expression', () => {
    const on = seatsFromItem(base)
    if (!on) throw new Error('sense tasca')
    expect(seatsRequest(on).text).toMatch(/^7 \+ 5: hi ha 7 passatgers i en pugen 5/)
    expect(seatsRequest(on).speech).toMatch(/7 més 5/)
    expect(seatsRequest({ ...on, mode: 'off', a: 1, b: 1 }).text).toMatch(/hi ha 1 passatger i en baixen 1/)
    expect(seatsRequest({ ...on, mode: 'missing', a: 8, b: 2 }).text).toMatch(/8 \+ \? = 10/)
  })
})

describe('crowd: nobody is ever lost', () => {
  const task = { mode: 'on' as const, a: 2, b: 1, start: 2, waiting: 3 }
  it('gets on in queue order and off from the window tapped', () => {
    const c0 = startCrowd(task, 'v')
    expect(c0.onBoard).toHaveLength(2)
    const c1 = getOn(c0)
    expect(c1.onBoard).toEqual(['v-s0', 'v-s1', 'v-w0'])
    expect(c1.atStop).toEqual(['v-w1', 'v-w2'])
    const c2 = getOff(c1, 'v-s0')
    expect(c2.onBoard).toEqual(['v-s1', 'v-w0'])
    expect(c2.atStop[0]).toBe('v-s0')
    expect(c2.onBoard.length + c2.atStop.length).toBe(5)
    expect(getOff(c2, 'ningú')).toBe(c2)
    expect(getOff(c2).atStop[0]).toBe('v-w0')
  })

  it('stays inside the bus and the stop', () => {
    expect(getOn({ onBoard: [], atStop: [] })).toEqual({ onBoard: [], atStop: [] })
    const full = { onBoard: Array.from({ length: SEATS }, (_, i) => `p${i}`), atStop: ['q'] }
    expect(getOn(full)).toBe(full)
    expect(getOff({ onBoard: [], atStop: ['q'] })).toEqual({ onBoard: [], atStop: ['q'] })
  })
})
