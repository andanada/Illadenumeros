import { describe, expect, it } from 'vitest'
import { newFactState } from '../engine/leitner'
import { newSkillState } from '../engine/mastery'
import { isEmptyProgress, mergeProgress } from './backupMerge'
import type { ProgressData } from './backupSchema'

const empty = (): ProgressData => ({ profile: null, skillStates: [], factStates: [], attempts: [], rewards: null })
const profile = { id: 'me' as const, name: 'Laia', character: 'nyx' as const, color: 'rosa' as const, diagnosticDone: false, createdAt: 1 }

describe('mergeProgress', () => {
  it('replace returns the incoming data untouched', () => {
    const incoming = { ...empty(), skillStates: [newSkillState('A1')] }
    expect(mergeProgress({ ...empty(), skillStates: [newSkillState('A4')] }, incoming, 'replace')).toBe(incoming)
  })

  it('without attempts, the skill with more practice wins; ties keep the local row', () => {
    const local = { ...empty(), skillStates: [{ ...newSkillState('A1'), attempts: 5, mastery: 0.1 }, { ...newSkillState('A2'), attempts: 2, mastery: 0.1 }] }
    const incoming = { ...empty(), skillStates: [{ ...newSkillState('A1'), attempts: 9, mastery: 0.9 }, { ...newSkillState('A2'), attempts: 2, mastery: 0.9 }] }
    const merged = mergeProgress(local, incoming, 'keep-newer')
    const byId = Object.fromEntries(merged.skillStates.map((s) => [s.skillId, s.mastery]))
    expect(byId).toEqual({ A1: 0.9, A2: 0.1 })
  })

  it('a skill with recorded activity on only one side keeps that side', () => {
    const at = (skillId: string, createdAt: number) => ({ id: `${skillId}-${createdAt}`, ambitId: 'mates', skillId, correct: true, rtMs: 1, hintsUsed: 0, cpaStage: 'concret' as const, gameId: 'repte-illa' as const, sessionId: 's', createdAt })
    const local = { ...empty(), skillStates: [{ ...newSkillState('A1'), mastery: 0.2, attempts: 50 }, { ...newSkillState('A2'), mastery: 0.2 }], attempts: [at('A2', 5)] }
    const incoming = { ...empty(), skillStates: [{ ...newSkillState('A1'), mastery: 0.8 }, { ...newSkillState('A2'), mastery: 0.8, attempts: 50 }], attempts: [at('A1', 5)] }
    const byId = Object.fromEntries(mergeProgress(local, incoming, 'keep-newer').skillStates.map((s) => [s.skillId, s.mastery]))
    expect(byId).toEqual({ A1: 0.8, A2: 0.2 })
  })

  it('facts with the same lastSeen keep the local row', () => {
    const local = { ...empty(), factStates: [{ ...newFactState('k', 10), box: 1 }] }
    const incoming = { ...empty(), factStates: [{ ...newFactState('k', 10), box: 4 }] }
    expect(mergeProgress(local, incoming, 'keep-newer').factStates[0]?.box).toBe(1)
  })

  it('keeps the local profile but never undoes a finished diagnostic; takes the incoming one when there is none', () => {
    const merged = mergeProgress({ ...empty(), profile }, { ...empty(), profile: { ...profile, name: 'Altra', diagnosticDone: true } }, 'keep-newer')
    expect(merged.profile).toMatchObject({ name: 'Laia', diagnosticDone: true })
    expect(mergeProgress(empty(), { ...empty(), profile }, 'keep-newer').profile).toEqual(profile)
  })

  it('rewards from only one side are kept as they are', () => {
    const rewards = { id: 'me' as const, petals: 4, stickers: [], daysPlayed: [], missionsDone: [] }
    expect(mergeProgress(empty(), { ...empty(), rewards }, 'keep-newer').rewards).toEqual(rewards)
    expect(mergeProgress({ ...empty(), rewards }, empty(), 'keep-newer').rewards).toEqual(rewards)
  })

  it('does not mutate its inputs', () => {
    const local = Object.freeze({ ...empty(), skillStates: Object.freeze([newSkillState('A1')]) as never })
    const incoming = Object.freeze({ ...empty(), skillStates: Object.freeze([newSkillState('A2')]) as never })
    expect(() => mergeProgress(local, incoming, 'keep-newer')).not.toThrow()
  })
})

describe('isEmptyProgress', () => {
  it('is true only when there is nothing at all', () => {
    expect(isEmptyProgress(empty())).toBe(true)
    expect(isEmptyProgress({ ...empty(), profile })).toBe(false)
  })
})
