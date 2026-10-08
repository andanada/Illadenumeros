import { useEffect, useMemo } from 'react'
import { useProgress } from '../../core/progress/store'
import { coinsOf } from '../../core/storage/worldRow'
import type { AvatarSpec, Placement, SceneId } from '../model/types'
import { defaultWorld } from './defaultWorld'
import { adoptPet, buyItem, currentCoins, grantCoins, loadWorld, movePlaced, placeItem, removePlaced, saveAvatar, useWorldStore } from './worldStore'

export interface WorldView {
  /** False until the active player's town row has been read (the avatar is the default meanwhile). */
  readonly ready: boolean
  readonly avatar: AvatarSpec
  readonly owned: readonly string[]
  readonly placed: Readonly<Partial<Record<SceneId, readonly Placement[]>>>
  readonly pets: readonly string[]
  /** Spendable "monedes" = max(0, petals - spent). */
  readonly coins: number
  readonly setAvatar: typeof saveAvatar
  readonly buy: typeof buyItem
  readonly place: typeof placeItem
  readonly move: typeof movePlaced
  readonly remove: typeof removePlaced
  readonly adopt: typeof adoptPet
  readonly grantCoins: typeof grantCoins
}

const ACTIONS = { setAvatar: saveAvatar, buy: buyItem, place: placeItem, move: movePlaced, remove: removePlaced, adopt: adoptPet, grantCoins } as const

/** The town for the active player; reads (and lazily creates) the row on first use. */
export function useWorld(): WorldView {
  const row = useWorldStore((s) => s.row)
  const status = useWorldStore((s) => s.status)
  const petals = useProgress((s) => s.rewards.petals)
  const activeId = useProgress((s) => s.activePlayerId)
  const profile = useProgress((s) => s.profile)

  useEffect(() => {
    if (activeId !== undefined && status === 'idle') void loadWorld()
  }, [activeId, status])

  return useMemo(() => {
    const shown = row ?? defaultWorld(profile)
    return {
      ready: status === 'ready' && row !== undefined,
      avatar: shown.avatar,
      owned: shown.owned,
      placed: shown.placed,
      pets: shown.pets,
      coins: coinsOf(petals, shown.petalsSpent),
      ...ACTIONS,
    }
  }, [row, status, petals, profile])
}

/**
 * Same shape as the scene's `WorldPort` (src/world/scene/worldPort.ts), without importing it:
 * the scene agent can swap its stub for this object.
 */
export const worldDataPort = {
  getAvatar: (): AvatarSpec => useWorldStore.getState().row?.avatar ?? defaultWorld(useProgress.getState().profile).avatar,
  coins: currentCoins,
  onCoins: (listener: (coins: number) => void): (() => void) => {
    let last = currentCoins()
    const check = (): void => {
      const now = currentCoins()
      if (now !== last) {
        last = now
        listener(now)
      }
    }
    const offProgress = useProgress.subscribe(check)
    const offWorld = useWorldStore.subscribe(check)
    return () => {
      offProgress()
      offWorld()
    }
  },
}
