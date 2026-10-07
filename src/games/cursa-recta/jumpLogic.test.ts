import { describe, expect, it } from 'vitest'
import { makeTestItem } from '../shared/testUtils'
import { canJump, evaluatePath, minJumps, parseRaceTask, positionAfter, positionsOf, windowFor, type Jump } from './jumpLogic'

describe('jumpLogic', () => {
  it('computes the shortest path with tens first and overshoot', () => {
    expect(minJumps(37, 57)).toBe(2)
    expect(minJumps(37, 46)).toBe(2)
    expect(minJumps(37, 44)).toBe(4)
    expect(minJumps(37, 40)).toBe(3)
    expect(minJumps(10, 10)).toBe(0)
  })

  it('evaluates efficient and long paths', () => {
    const tens: Jump[] = [10, 10]
    expect(evaluatePath(37, 57, tens)).toMatchObject({ reached: true, efficient: true, suggestTens: false })
    const ones: Jump[] = Array.from({ length: 20 }, () => 1)
    expect(evaluatePath(37, 57, ones)).toMatchObject({ reached: true, efficient: false, suggestTens: true, ones: 20 })
    expect(evaluatePath(37, 57, [10]).reached).toBe(false)
  })

  it('does not suggest tens when the target is not reached', () => {
    expect(evaluatePath(0, 50, Array.from({ length: 6 }, () => 1 as Jump)).suggestTens).toBe(false)
  })

  it('tracks positions and keeps the line in range', () => {
    const jumps: Jump[] = [10, -1, 1]
    expect(positionsOf(20, jumps)).toEqual([20, 30, 29, 30])
    expect(positionAfter(20, jumps)).toBe(30)
    expect(canJump(5, -10)).toBe(false)
    expect(canJump(195, 10)).toBe(false)
    expect(canJump(50, -10)).toBe(true)
  })

  it('builds a padded window in multiples of ten that contains everything', () => {
    const w = windowFor([37, 47], 57)
    expect(w.lo).toBeLessThanOrEqual(37)
    expect(w.hi).toBeGreaterThanOrEqual(57)
    expect(w.lo % 10).toBe(0)
    const tiny = windowFor([5], 5)
    expect(tiny.hi - tiny.lo).toBeGreaterThanOrEqual(20)
  })

  it('parses jump and reading tasks', () => {
    expect(parseRaceTask(makeTestItem('A9', 'sub:15-7'))).toEqual({ kind: 'jump', start: 15, target: 8 })
    const read = makeTestItem('B2')
    const readTask = parseRaceTask(read)
    expect(readTask?.kind).toBe('read')
    expect(String(readTask?.target)).toBe(read.answer)
    const add = makeTestItem('B4')
    const addTask = parseRaceTask(add)
    expect(addTask?.kind).toBe('jump')
    expect(String(addTask?.target)).toBe(add.answer)
  })
})
