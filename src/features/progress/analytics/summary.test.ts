import { describe, expect, it } from 'vitest'
import type { SkillNode } from '../../../core/ambit/types'
import { newSkillState, type SkillState } from '../../../core/engine/mastery'
import { levelEquivalent, playedStreak, daysPlayedThisWeek, totalMinutes, trendWord } from './summary'
import { dayIndex } from './time'
import { att, DAY, NOW } from './testData'

const skills: SkillNode[] = [
  ...['A1', 'A2', 'A3', 'A4', 'A5'].map((id) => ({ id, code: id, grade: 1 as const, title: id, prereqs: [], hasFacts: false, games: [], fluencyTargetMs: 1 })),
  ...['B1', 'B2'].map((id) => ({ id, code: id, grade: 2 as const, title: id, prereqs: [], hasFacts: false, games: [], fluencyTargetMs: 1 })),
]
const st = (id: string, status: SkillState['status']): SkillState => ({ ...newSkillState(id), status, attempts: 5 })
const day = (offset: number) => dayIndex(NOW - offset * DAY)

describe('levelEquivalent', () => {
  it('has no level without any activity', () => {
    const level = levelEquivalent(skills, {})
    expect(level.workingGrade).toBeUndefined()
    expect(level.text).toMatch(/Encara no hi ha prou activitat/)
  })
  it('describes the working grade and the share mastered one grade below', () => {
    const states = { A1: st('A1', 'dominada'), A2: st('A2', 'dominada'), A3: st('A3', 'dominada'), A4: st('A4', 'consolidant'), B1: st('B1', 'aprenent') }
    const level = levelEquivalent(skills, states)
    expect(level.workingGrade).toBe(2)
    expect(level.text).toBe('Ara treballa continguts de 2n i ja domina el 60 % de 1r.')
  })
  it('talks about the same grade when the child is still in 1r', () => {
    const level = levelEquivalent(skills, { A1: st('A1', 'dominada'), A2: st('A2', 'aprenent') })
    expect(level.workingGrade).toBe(1)
    expect(level.text).toBe('Ara treballa continguts de 1r i ja domina el 20 % d’aquest curs.')
  })
  it('celebrates when everything is mastered', () => {
    const all = Object.fromEntries(skills.map((s) => [s.id, st(s.id, 'dominada')]))
    expect(levelEquivalent(skills, all).text).toMatch(/Domina tots els continguts de 2n/)
  })
  it('reports per grade percentages', () => {
    const level = levelEquivalent(skills, { A1: st('A1', 'dominada') })
    expect(level.perGrade[0]).toMatchObject({ grade: 1, total: 5, mastered: 1, pct: 20 })
  })
})

describe('streak and week', () => {
  it('is 0 without days', () => {
    expect(playedStreak(new Set(), NOW)).toBe(0)
  })
  it('counts consecutive days ending today', () => {
    expect(playedStreak(new Set([day(0), day(1), day(2), day(4)]), NOW)).toBe(3)
  })
  it('keeps the streak alive if the last play was yesterday', () => {
    expect(playedStreak(new Set([day(1), day(2)]), NOW)).toBe(2)
  })
  it('breaks after a gap of two days', () => {
    expect(playedStreak(new Set([day(2), day(3)]), NOW)).toBe(0)
  })
  it('counts the days played since Monday (NOW is a Wednesday)', () => {
    expect(daysPlayedThisWeek(new Set([day(0), day(2), day(3)]), NOW)).toBe(2)
  })
})

describe('totalMinutes and trendWord', () => {
  it('is 0 without attempts', () => {
    expect(totalMinutes([])).toBe(0)
  })
  it('sums session minutes', () => {
    expect(totalMinutes([att(NOW), att(NOW + 60_000)])).toBeGreaterThan(1)
  })
  it('describes trends calmly', () => {
    expect(trendWord(0.8, 0.6)).toBe('puja')
    expect(trendWord(0.6, 0.8)).toBe('baixa una mica')
    expect(trendWord(0.7, 0.71)).toBe('estable')
    expect(trendWord(undefined, 0.5)).toBe('sense dades')
  })
})
