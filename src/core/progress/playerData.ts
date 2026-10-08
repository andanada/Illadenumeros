import { matesAmbit } from '../../ambits/mates'
import { factStateSchema, type FactState } from '../engine/leitner'
import { skillStateSchema, type SkillState } from '../engine/mastery'
import { cleanDaysFromAttempts } from '../engine/retention'
import { MASTERY_THRESHOLDS } from '../engine/thresholds'
import { emptyRewards, profileSchema, rewardsSchema, type MatesDb, type Profile, type Rewards } from '../storage/db'
import type { PlayerSummary } from '../storage/registry'
import { reconcileStatuses } from './reconcile'

/** The part of the store that belongs to one player and is swapped on every switch. */
export interface PlayerData {
  profile: Profile | undefined
  skillStates: Record<string, SkillState>
  factStates: Record<string, FactState>
  /** Days with a clean correct answer per skill (rebuilt from the attempts on load; not stored). */
  cleanDays: Record<string, string[]>
  rewards: Rewards
}

export const emptyPlayerData = (): PlayerData => ({ profile: undefined, skillStates: {}, factStates: {}, cleanDays: {}, rewards: emptyRewards() })

/** Valid rows only: a damaged row is skipped instead of discarding everything. */
export function validRows<T>(rows: unknown[], parse: (row: unknown) => { success: boolean; data?: T }): T[] {
  return rows.flatMap((row) => {
    const parsed = parse(row)
    return parsed.success && parsed.data !== undefined ? [parsed.data] : []
  })
}

/** Everything one player's database holds for the screens. Throws if the database cannot be read. */
export async function readPlayerData(database: MatesDb): Promise<PlayerData> {
  const since = Date.now() - MASTERY_THRESHOLDS.core.cleanDaysWindow * 86_400_000
  const [profileRow, skills, facts, rewardsRow, recentAttempts] = await Promise.all([
    database.profile.get('me'),
    database.skillStates.toArray(),
    database.factStates.toArray(),
    database.rewards.get('me'),
    database.attempts.where('createdAt').aboveOrEqual(since).toArray(),
  ])
  const profile = profileSchema.safeParse(profileRow)
  const rewards = rewardsSchema.safeParse(rewardsRow)
  const skillRows = validRows<SkillState>(skills, (r) => skillStateSchema.safeParse(r))
  const factRows = validRows<FactState>(facts, (r) => factStateSchema.safeParse(r))
  const factStates = Object.fromEntries(factRows.map((f) => [f.factKey, f]))
  const cleanDays = cleanDaysFromAttempts(recentAttempts, Date.now())
  const storedSkills = Object.fromEntries(skillRows.map((s) => [s.skillId, s]))
  return {
    profile: profile.success ? profile.data : undefined,
    skillStates: reconcileStatuses(matesAmbit.skills, storedSkills, factStates, cleanDays, matesAmbit.factsForSkill),
    factStates,
    cleanDays,
    rewards: rewards.success ? rewards.data : emptyRewards(),
  }
}

/** The registry entry, refreshed from the player's own profile (e.g. after restoring a backup). */
export const summaryWithProfile = (summary: PlayerSummary, profile: Profile): PlayerSummary => ({
  ...summary,
  name: profile.name,
  character: profile.character,
  color: profile.color,
})

export const summaryMatchesProfile = (summary: PlayerSummary, profile: Profile): boolean =>
  summary.name === profile.name && summary.character === profile.character && summary.color === profile.color
