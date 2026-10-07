import { beforeEach, describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { factsForSkill } from '../../ambits/mates/facts'
import type { SkillNode } from '../ambit/types'
import { createRng } from '../rng'
import type { Placement } from '../engine/diagnostic'
import { isUnlocked } from '../engine/graph'
import { selectNext } from '../engine/sessionSelector'
import { emptyRewards, type MatesDb } from '../storage/db'
import { activateTestPlayer } from '../../test/playerDb'
import { applyAnswer } from './applyAnswer'
import { useProgress } from './store'

const skill = (id: string): SkillNode => MATES_SKILLS.find((s) => s.id === id) as SkillNode
const placement = (entries: Record<string, Placement>): Record<string, Placement> => entries

let db: MatesDb

beforeEach(async () => {
  db = activateTestPlayer()
  await Promise.all([db.profile.clear(), db.skillStates.clear(), db.factStates.clear(), db.attempts.clear(), db.rewards.clear()])
  useProgress.setState({ loaded: true, profile: undefined, skillStates: {}, factStates: {}, rewards: emptyRewards(), sessionResults: [], storageError: false })
})

const recordInput = (skillId: string, over: Record<string, unknown> = {}) => ({
  skillId,
  correct: true,
  rtMs: 1000,
  hintsUsed: 0,
  cpaStage: 'concret' as const,
  gameId: 'repte-illa' as const,
  ...over,
})

describe('diagnostic placement survives the first real answers', () => {
  it('a placed skill keeps its level after one correct answer (fluency not measured yet)', async () => {
    await useProgress.getState().saveProfile({ name: 'Júlia', character: 'nyx', color: 'rosa' })
    await useProgress.getState().finishDiagnostic(placement({ A4: { mastery: 0.75, status: 'consolidant' } }))
    await useProgress.getState().record(recordInput('A4', { factKey: 'add:2+3' }))
    const a4 = useProgress.getState().skillStates.A4
    expect(a4?.mastery).toBeGreaterThanOrEqual(0.6)
    expect(a4?.status).toBe('consolidant')
  })

  it('applyAnswer does not blend in fluency until at least 3 facts were practiced', () => {
    const placed = { skillId: 'A4', accuracy: 0.75, fluency: 0, mastery: 0.75, status: 'consolidant' as const, cpaStage: 'pictoric' as const, attempts: 0, correct: 0, sessions: [], recent: [], consecutiveErrors: 0 }
    const out = applyAnswer(
      { skill: skill('A4'), factKey: 'add:2+3', correct: true, rtMs: 800, hintsUsed: 0, cpaStage: 'pictoric', gameId: 'duel-llampec', sessionId: 's', now: 1 },
      placed,
      {},
      factsForSkill('A4'),
      'id',
    )
    expect(out.skillState.mastery).toBeGreaterThan(0.7)
  })
})

describe('locked skills are not served just because they have state', () => {
  it('a failed anchor above the child level is not offered before its prerequisites', () => {
    const failedA4 = { skillId: 'A4', accuracy: 0.3, fluency: 0, mastery: 0.3, status: 'aprenent' as const, cpaStage: 'concret' as const, attempts: 3, correct: 0, sessions: ['s'], recent: [], consecutiveErrors: 0 }
    for (let i = 0; i < 60; i++) {
      const pick = selectNext({
        skills: MATES_SKILLS,
        skillStates: { A4: failedA4 },
        factStates: {},
        factsForSkill,
        recent: [],
        now: 1,
        rng: createRng(`h3-${i}`),
      })
      expect(['A1', 'A2', 'A3']).toContain(pick.skillId)
    }
  })

  it('a consolidating prerequisite (0.6) is enough to unlock the next skill', () => {
    expect(isUnlocked(skill('A4'), () => 0.62)).toBe(true)
    expect(isUnlocked(skill('A4'), () => 0.5)).toBe(false)
  })
})

describe('concurrent writes are serialised', () => {
  it('two simultaneous answers are both stored and both counted', async () => {
    await useProgress.getState().saveProfile({ name: 'Júlia', character: 'nyx', color: 'rosa' })
    await Promise.all([
      useProgress.getState().record(recordInput('A1')),
      useProgress.getState().record(recordInput('A1')),
    ])
    expect(await db.attempts.count()).toBe(2)
    expect(useProgress.getState().skillStates.A1?.attempts).toBe(2)
    expect(useProgress.getState().rewards.petals).toBe(6)
    expect((await db.rewards.get('me'))?.petals).toBe(6)
  })

  it('a sticker granted while an answer is in flight does not erase the petals', async () => {
    await useProgress.getState().saveProfile({ name: 'Júlia', character: 'nyx', color: 'rosa' })
    await Promise.all([useProgress.getState().record(recordInput('A1')), useProgress.getState().grantSticker()])
    const rewards = useProgress.getState().rewards
    expect(rewards.petals).toBe(3)
    expect(rewards.stickers).toHaveLength(1)
    expect((await db.rewards.get('me'))?.petals).toBe(3)
  })
})

describe('retries on the same item', () => {
  it('only the first attempt moves the skill; a retry still counts as an attempt record', async () => {
    await useProgress.getState().saveProfile({ name: 'Júlia', character: 'nyx', color: 'rosa' })
    await useProgress.getState().record(recordInput('A1', { correct: false }))
    await useProgress.getState().record(recordInput('A1', { correct: false, retry: true }))
    await useProgress.getState().record(recordInput('A1', { correct: true, retry: true, hintsUsed: 2 }))
    expect(useProgress.getState().skillStates.A1?.attempts).toBe(1)
    expect(await db.attempts.count()).toBe(3)
    expect(useProgress.getState().sessionResults).toHaveLength(1)
  })
})

describe('storage failures do not freeze the app', () => {
  it('load() reports the error and finishes loading instead of hanging', async () => {
    useProgress.setState({ loaded: false })
    const original = db.profile.get.bind(db.profile)
    db.profile.get = (() => Promise.reject(new Error('IndexedDB no disponible'))) as unknown as typeof db.profile.get
    await useProgress.getState().load()
    db.profile.get = original
    expect(useProgress.getState().loaded).toBe(true)
    expect(useProgress.getState().storageError).toBe(true)
  })

  it('record() keeps the progress in memory when the write fails', async () => {
    await useProgress.getState().saveProfile({ name: 'Júlia', character: 'nyx', color: 'rosa' })
    const original = db.attempts.add.bind(db.attempts)
    db.attempts.add = (() => Promise.reject(new Error('cuota'))) as unknown as typeof db.attempts.add
    await expect(useProgress.getState().record(recordInput('A1'))).resolves.toBeDefined()
    db.attempts.add = original
    expect(useProgress.getState().skillStates.A1?.attempts).toBe(1)
    expect(useProgress.getState().storageError).toBe(true)
  })
})
