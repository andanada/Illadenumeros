import { describe, expect, it } from 'vitest'
import { createRng } from '../../core/rng'
import { makeTestItem } from '../shared/testUtils'
import { countPairs, generateBubbleField, parseBubbleTask, type BubbleTask } from './bubbleField'
import { judgePair, toggleSelection } from './pairLogic'

describe('generateBubbleField', () => {
  it('always has exactly one valid pair, no stray duplicates and 3-4 decoys (make-ten)', () => {
    for (let a = 1; a <= 9; a++) {
      for (let seed = 0; seed < 30; seed++) {
        const task: BubbleTask = { total: 10, a, friend: 10 - a }
        const field = generateBubbleField(task, createRng(`s${seed}`))
        const values = field.map((b) => b.value)
        expect(countPairs(values, 10)).toBe(1)
        const decoys = field.filter((b) => b.role === 'decoy')
        expect(decoys.length).toBeGreaterThanOrEqual(3)
        expect(decoys.length).toBeLessThanOrEqual(4)
        const decoyValues = decoys.map((d) => d.value)
        expect(new Set(decoyValues).size).toBe(decoyValues.length)
        expect(field.filter((b) => b.role === 'target')).toHaveLength(1)
        expect(field.filter((b) => b.role === 'friend')).toHaveLength(1)
      }
    }
  })

  it('works for smaller totals (decomposing 5..9)', () => {
    for (let total = 5; total <= 9; total++) {
      const task: BubbleTask = { total, a: 2, friend: total - 2 }
      const field = generateBubbleField(task, createRng(`t${total}`))
      expect(countPairs(field.map((b) => b.value), total)).toBe(1)
    }
  })

  it('keeps bubbles inside the field and on distinct slots', () => {
    const field = generateBubbleField({ total: 10, a: 5, friend: 5 }, createRng('pos'))
    for (const b of field) {
      expect(b.x).toBeGreaterThan(0)
      expect(b.x).toBeLessThan(100)
      expect(b.y).toBeGreaterThan(0)
      expect(b.y).toBeLessThan(100)
    }
    expect(new Set(field.map((b) => b.id)).size).toBe(field.length)
  })
})

describe('parseBubbleTask', () => {
  it('reads A5 ten friends', () => {
    expect(parseBubbleTask(makeTestItem('A5', 'c10:7'))).toEqual({ total: 10, a: 7, friend: 3 })
  })

  it('reads A3 decompositions from the text', () => {
    const item = makeTestItem('A3')
    const task = parseBubbleTask(item)
    expect(task).toBeDefined()
    expect(String(task?.friend)).toBe(item.answer)
  })

  it('reads A8 as a bridge through ten', () => {
    const item = makeTestItem('A8', 'add:6+8')
    const task = parseBubbleTask(item)
    expect(task?.total).toBe(10)
    expect(task?.a).toBe(8)
    expect(task?.friend).toBe(2)
    expect(task?.bridge).toEqual({ rest: 4, sum: 14 })
    expect(String(task?.bridge?.sum)).toBe(item.answer)
  })
})

describe('pair logic', () => {
  const task: BubbleTask = { total: 10, a: 7, friend: 3 }
  const field = generateBubbleField(task, createRng('judge'))
  const target = field.find((b) => b.role === 'target')!
  const friend = field.find((b) => b.role === 'friend')!
  const decoy = field.find((b) => b.role === 'decoy')!

  it('judges pairs', () => {
    expect(judgePair(target, friend, task)).toBe('match')
    expect(judgePair(target, decoy, task)).toBe('wrong-with-target')
    const other = field.filter((b) => b.role === 'decoy')[1]!
    expect(judgePair(decoy, other, task)).toBe('wrong-other')
  })

  it('toggles selection with a maximum of two', () => {
    expect(toggleSelection(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleSelection(['a', 'b'], 'c')).toEqual(['c'])
  })
})
