import { DAILY_PETALS, dailyStickerFor } from '../../features/daily-challenge/dailyChallenge'
import { getDb } from '../storage/playerDbs'
import type { Rewards } from '../storage/db'
import { addSticker, buyDecor as buyDecorLogic, pickChestSticker, togglePlaced } from './rewardsLogic'
import type { DailyResult, GetState, ProgressStore, SetState } from './storeTypes'

/** The two helpers of store.ts that queue a write for the active player and save it (passed in to avoid an import cycle). */
export interface WriteHelpers {
  forActivePlayer: <T>(task: () => Promise<T>, onStale: () => T) => Promise<T>
  persist: (write: () => Promise<unknown>) => Promise<boolean>
}

type RewardActions = Pick<ProgressStore, 'grantSticker' | 'grantStickerById' | 'buyDecor' | 'toggleDecor' | 'completeDaily'>

/** Rewards of the pet's house, the daily challenge and the sticker chests. Each action saves memory first, then the disk. */
export function createRewardActions(set: SetState, get: GetState, { forActivePlayer, persist }: WriteHelpers): RewardActions {
  const save = async (next: Rewards): Promise<void> => {
    set({ rewards: next })
    await persist(() => getDb().rewards.put(next))
  }

  const grantSticker: RewardActions['grantSticker'] = () =>
    forActivePlayer(
      async () => {
        const { rewards } = get()
        const pick = pickChestSticker(rewards.stickers, Math.random())
        if (!pick) return undefined
        await save(addSticker(rewards, pick.id).rewards)
        return pick.id
      },
      () => undefined,
    )

  const grantStickerById: RewardActions['grantStickerById'] = (id) =>
    forActivePlayer(
      async () => {
        const grant = addSticker(get().rewards, id)
        if (grant.gained.length > 0) await save(grant.rewards)
        return grant.gained
      },
      () => [],
    )

  const buyDecor: RewardActions['buyDecor'] = (id) =>
    forActivePlayer(
      async () => {
        const result = buyDecorLogic(get().rewards, id)
        if (!result.ok) return result.reason
        await save(result.rewards)
        return 'ok'
      },
      () => 'desconegut',
    )

  const toggleDecor: RewardActions['toggleDecor'] = (id) =>
    forActivePlayer(
      async () => {
        const next = togglePlaced(get().rewards, id)
        if (next !== get().rewards) await save(next)
      },
      () => undefined,
    )

  const completeDaily: RewardActions['completeDaily'] = (day) =>
    forActivePlayer(
      async (): Promise<DailyResult> => {
        const { rewards } = get()
        if (rewards.dailyDone.includes(day)) return { firstTime: false, petals: 0, gained: [] }
        const stickerId = dailyStickerFor(day, rewards.stickers)
        const withDay: Rewards = { ...rewards, dailyDone: [...rewards.dailyDone, day], petals: rewards.petals + DAILY_PETALS }
        const grant = stickerId ? addSticker(withDay, stickerId) : { rewards: withDay, gained: [] }
        await save(grant.rewards)
        return { firstTime: true, petals: DAILY_PETALS, gained: grant.gained }
      },
      () => ({ firstTime: false, petals: 0, gained: [] }),
    )

  return { grantSticker, grantStickerById, buyDecor, toggleDecor, completeDaily }
}
