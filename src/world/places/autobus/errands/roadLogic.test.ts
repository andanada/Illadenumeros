import { describe, expect, it } from 'vitest'
import type { Item } from '../../../../core/ambit/types'
import { arrived, canDrive, roadFromItem, roadRequest, roadWindow, solutionJumps, stopsDriven } from './roadLogic'

const base: Item = {
  id: 'x',
  skillId: 'B5',
  text: '26 + 7 = ?',
  speech: '',
  answer: '33',
  choices: [{ value: '33' }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['a', 'b', 'c'],
  cpaStage: 'concret',
  operands: { a: 26, b: 7, op: '+' },
}

describe('road: the bus line is a number line', () => {
  it('go: a ± b drives from a', () => {
    expect(roadFromItem(base)).toMatchObject({ mode: 'go', start: 26, target: 33 })
    expect(roadFromItem({ ...base, text: '61 − 5 = ?', answer: '56', operands: { a: 61, b: 5, op: '-' } })).toMatchObject({
      mode: 'go',
      start: 61,
      target: 56,
      op: '-',
    })
  })

  it('count: a + ? = t drives to the friend and asks how many stops', () => {
    expect(roadFromItem({ ...base, text: '30 + ? = 47', answer: '17', operands: { a: 30, b: 17, op: '+' } })).toMatchObject({
      mode: 'count',
      start: 30,
      target: 47,
    })
    expect(roadFromItem({ ...base, text: '3 + ? = 11', answer: '8', operands: undefined })).toMatchObject({
      mode: 'count',
      start: 3,
      target: 11,
    })
  })

  it('? + b = t drives back to where she got on', () => {
    const t = roadFromItem({ ...base, text: '? + 2 = 9', answer: '7', operands: undefined })
    expect(t).toMatchObject({ mode: 'go', start: 9, target: 7, unknownStart: true })
    if (!t) throw new Error('sense tasca')
    expect(roadRequest(t).text).toMatch(/^\? \+ 2 = 9: he fet 2 parades/)
  })

  it('read: the arrow on the line becomes a friend at an unnumbered stop', () => {
    const t = roadFromItem({
      ...base,
      text: 'Quin número assenyala la fletxa?',
      answer: '125',
      operands: undefined,
      visual: { kind: 'numberLine', from: 120, to: 130, start: 120, target: 125 },
    })
    expect(t).toMatchObject({ mode: 'read', start: 120, target: 125, window: { lo: 120, hi: 130 } })
    if (!t) throw new Error('sense tasca')
    expect(canDrive(t, 130, 1)).toBe(false)
    expect(canDrive(t, 120, -1)).toBe(false)
    expect(canDrive(t, 120, 10)).toBe(true)
    expect(roadWindow(t, [120, 140])).toEqual({ lo: 120, hi: 130 })
    expect(roadRequest(t).text).toMatch(/parada sense número/)
  })

  it('refuses what is not on the line', () => {
    expect(roadFromItem({ ...base, answer: 'trenta-tres' })).toBeUndefined()
    expect(roadFromItem({ ...base, operands: { a: 3, b: 4, op: '×' }, answer: '12' })).toBeUndefined()
    expect(roadFromItem({ ...base, operands: { a: 190, b: 20, op: '+' }, answer: '210' })).toBeUndefined()
    expect(roadFromItem({ ...base, operands: undefined, text: 'Quants n’hi ha?' })).toBeUndefined()
  })

  it('drives, counts stops, and knows the shortest way (tens first)', () => {
    const t = roadFromItem(base)
    if (!t) throw new Error('sense tasca')
    expect(arrived(t, [1, 1, 1, 1, 1, 1, 1])).toBe(true)
    expect(arrived(t, [10, -1, -1, -1])).toBe(true)
    expect(stopsDriven(t, [10, -1])).toBe(9)
    expect(solutionJumps(26, 33)).toEqual([1, 1, 1, 1, 1, 1, 1])
    expect(solutionJumps(93, 76)).toEqual([-10, -1, -1, -1, -1, -1, -1, -1])
    expect(solutionJumps(5, 5)).toEqual([])
    expect(canDrive(t, 0, -1)).toBe(false)
    expect(roadWindow(t, [26])).toEqual({ lo: 20, hi: 40 })
  })

  it('speaks the trip in Catalan', () => {
    const go = roadFromItem(base)
    if (!go) throw new Error('sense tasca')
    expect(roadRequest(go).text).toMatch(/^Som a la parada 26\. Vull baixar 7 parades endavant: 26 \+ 7/)
    expect(roadRequest(go).speech).toMatch(/26 més 7/)
    expect(roadRequest({ ...go, op: '-' }).text).toMatch(/enrere: 26 − 7/)
    expect(roadRequest({ ...go, mode: 'count', target: 33 }).text).toMatch(/Quantes parades hi ha fins a la 33\?/)
  })
})
