import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import type { FactState } from '../engine/leitner'
import type { SkillState } from '../engine/mastery'
import type { Attempt } from '../progress/applyAnswer'

export const CHARACTER_IDS = ['nyx', 'mixa', 'blau', 'nuvol', 'melo'] as const
export type CharacterId = (typeof CHARACTER_IDS)[number]

export const THEME_COLORS = ['lila', 'rosa', 'blau', 'menta', 'taronja', 'negre'] as const
export type ThemeColor = (typeof THEME_COLORS)[number]

export const profileSchema = z.object({
  id: z.literal('me'),
  name: z.string().trim().min(1).max(20),
  character: z.enum(CHARACTER_IDS),
  color: z.enum(THEME_COLORS),
  diagnosticDone: z.boolean(),
  createdAt: z.number(),
})
export type Profile = z.infer<typeof profileSchema>

export const rewardsSchema = z.object({
  id: z.literal('me'),
  petals: z.number().int().min(0),
  stickers: z.array(z.string()),
  daysPlayed: z.array(z.string()),
  missionsDone: z.array(z.string()),
})
export type Rewards = z.infer<typeof rewardsSchema>

export const emptyRewards = (): Rewards => ({ id: 'me', petals: 0, stickers: [], daysPlayed: [], missionsDone: [] })

class MatesDb extends Dexie {
  profile!: Table<Profile, string>
  skillStates!: Table<SkillState, string>
  factStates!: Table<FactState, string>
  attempts!: Table<Attempt, string>
  rewards!: Table<Rewards, string>

  constructor() {
    super('mates-magiques')
    this.version(1).stores({
      profile: 'id',
      skillStates: 'skillId',
      factStates: 'factKey',
      attempts: 'id, createdAt, skillId, sessionId',
      rewards: 'id',
    })
  }
}

export const db = new MatesDb()

// If another tab upgrades the database, release it instead of blocking that tab.
db.on('versionchange', () => db.close())

/** Ask the browser not to evict the child's progress (iOS/Safari can clear unused site data). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
