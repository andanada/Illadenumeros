import { describe, expect, it } from 'vitest'
import { newFactState, type FactState } from '../engine/leitner'
import { newSkillState, type SkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'
import type { Profile, Rewards } from '../storage/db'
import {
  attemptFromPull,
  attemptToPush,
  backfillSkillTimes,
  factFromDoc,
  factToDoc,
  profileToInput,
  rewardsFromDoc,
  rewardsToDoc,
  settingsFromDoc,
  settingsToDoc,
  skillFromDoc,
  skillToDoc,
} from './docs'
import { checkOutgoingAttempt, checkOutgoingDoc } from './schemas'

const skill: SkillState = { ...newSkillState('A4'), attempts: 3, correct: 2, sessions: ['s1'], recent: [true], updatedAt: 500 }
const fact: FactState = { ...newFactState('add:3+5', 10), attempts: 2, correct: 1, lastSeen: 1_234.6 }
const rewards: Rewards = { id: 'me', petals: 9, stickers: ['sol'], daysPlayed: ['2026-10-01'], missionsDone: [] }
const profile: Profile = { id: 'me', name: 'Laia', character: 'nyx', color: 'rosa', diagnosticDone: true, createdAt: 77 }
const attempt: Attempt = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  ambitId: 'mates',
  skillId: 'A4',
  factKey: 'add:3+5',
  correct: true,
  rtMs: 900,
  hintsUsed: 0,
  cpaStage: 'concret',
  gameId: 'duel-llampec',
  sessionId: 's1',
  createdAt: 1_000,
}

describe('docs: local -> server', () => {
  it('skill: key = skillId, updatedAt outside data, accepted by the server schema', () => {
    const doc = skillToDoc(skill)
    expect(doc).toMatchObject({ kind: 'skill', key: 'A4', updatedAt: 500 })
    expect(doc.data).not.toHaveProperty('updatedAt')
    expect(checkOutgoingDoc(doc)).not.toBeNull()
  })

  it('skill without updatedAt maps to 0 (must be backfilled before pushing)', () => {
    const { updatedAt: _u, ...old } = skill
    expect(skillToDoc(old).updatedAt).toBe(0)
  })

  it('fact: key = factKey, updatedAt = lastSeen (integer)', () => {
    const doc = factToDoc(fact)
    expect(doc).toMatchObject({ kind: 'fact', key: 'add:3+5', updatedAt: 1_234 })
    expect(checkOutgoingDoc(doc)).not.toBeNull()
  })

  it('rewards: key me', () => {
    expect(rewardsToDoc(rewards, 42)).toEqual({ kind: 'rewards', key: 'me', data: rewards, updatedAt: 42 })
    expect(checkOutgoingDoc(rewardsToDoc(rewards, 42))).not.toBeNull()
  })

  it('settings: key profile with diagnosticDone only', () => {
    expect(settingsToDoc(profile, 7)).toEqual({ kind: 'settings', key: 'profile', data: { diagnosticDone: true }, updatedAt: 7 })
  })

  it('attempt: id outside data, createdAt kept', () => {
    const pushed = attemptToPush(attempt)
    expect(pushed.id).toBe(attempt.id)
    expect(pushed.createdAt).toBe(1_000)
    expect(pushed.data).not.toHaveProperty('id')
    expect(checkOutgoingAttempt(pushed)).not.toBeNull()
  })

  it('profile -> PUT body', () => {
    expect(profileToInput(profile)).toEqual({ name: 'Laia', character: 'nyx', color: 'rosa', createdAt: 77 })
  })
})

describe('docs: server -> local', () => {
  it('round-trips skill, fact, rewards, attempts', () => {
    const s = skillToDoc(skill)
    expect(skillFromDoc(s.data, s.updatedAt)).toEqual(skill)
    expect(factFromDoc(factToDoc(fact).data)).toEqual(fact)
    expect(rewardsFromDoc(rewardsToDoc(rewards, 1).data)).toEqual(rewards)
    const a = attemptToPush(attempt)
    expect(attemptFromPull(a)).toEqual(attempt)
  })

  it('settings: reads diagnosticDone when it is a boolean', () => {
    expect(settingsFromDoc({ diagnosticDone: true })).toEqual({ diagnosticDone: true })
    expect(settingsFromDoc({ diagnosticDone: 'yes' })).toEqual({})
  })
})

describe('backfillSkillTimes', () => {
  it('fills a missing updatedAt with the latest attempt of that skill, else the fallback', () => {
    const { updatedAt: _a, ...a4 } = skill
    const b1 = { ...newSkillState('B1') }
    const out = backfillSkillTimes(
      [a4, b1, skill],
      [
        { skillId: 'A4', createdAt: 10 },
        { skillId: 'A4', createdAt: 30 },
        { skillId: 'C1', createdAt: 99 },
      ],
      5,
    )
    expect(out).toEqual([
      { ...a4, updatedAt: 30 },
      { ...b1, updatedAt: 5 },
    ])
  })

  it('does not mutate its input', () => {
    const rows = Object.freeze([Object.freeze({ ...newSkillState('A1') })])
    expect(() => backfillSkillTimes(rows, [], 1)).not.toThrow()
  })
})
