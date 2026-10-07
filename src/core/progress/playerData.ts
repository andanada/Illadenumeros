import { factStateSchema, type FactState } from '../engine/leitner'
import { skillStateSchema, type SkillState } from '../engine/mastery'
import { emptyRewards, profileSchema, rewardsSchema, type MatesDb, type Profile, type Rewards } from '../storage/db'
import type { PlayerSummary } from '../storage/registry'

/** The part of the store that belongs to one player and is swapped on every switch. */
export interface PlayerData {
  profile: Profile | undefined
  skillStates: Record<string, SkillState>
  factStates: Record<string, FactState>
  rewards: Rewards
}

export const emptyPlayerData = (): PlayerData => ({ profile: undefined, skillStates: {}, factStates: {}, rewards: emptyRewards() })

/** Valid rows only: a damaged row is skipped instead of discarding everything. */
export function validRows<T>(rows: unknown[], parse: (row: unknown) => { success: boolean; data?: T }): T[] {
  return rows.flatMap((row) => {
    const parsed = parse(row)
    return parsed.success && parsed.data !== undefined ? [parsed.data] : []
  })
}

/** Everything one player's database holds for the screens. Throws if the database cannot be read. */
export async function readPlayerData(database: MatesDb): Promise<PlayerData> {
  const [profileRow, skills, facts, rewardsRow] = await Promise.all([
    database.profile.get('me'),
    database.skillStates.toArray(),
    database.factStates.toArray(),
    database.rewards.get('me'),
  ])
  const profile = profileSchema.safeParse(profileRow)
  const rewards = rewardsSchema.safeParse(rewardsRow)
  const skillRows = validRows<SkillState>(skills, (r) => skillStateSchema.safeParse(r))
  const factRows = validRows<FactState>(facts, (r) => factStateSchema.safeParse(r))
  return {
    profile: profile.success ? profile.data : undefined,
    skillStates: Object.fromEntries(skillRows.map((s) => [s.skillId, s])),
    factStates: Object.fromEntries(factRows.map((f) => [f.factKey, f])),
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
