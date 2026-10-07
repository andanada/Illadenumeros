import type { Profile } from '../core/storage/db'

export type HomeRoute = '/start' | '/qui-juga' | '/diagnostic' | '/map'

export interface HomeInput {
  playerCount: number
  activePlayerId: string | undefined
  profile: Pick<Profile, 'diagnosticDone'> | undefined
}

/**
 * Where `/` should send the child: no players → start; players but nobody selected → "Qui juga?";
 * the active player → diagnostic until done, then the map. (With a single player the store
 * selects it at start-up, so the picker is skipped.)
 */
export function resolveHome({ playerCount, activePlayerId, profile }: HomeInput): HomeRoute {
  if (activePlayerId !== undefined && profile) return profile.diagnosticDone ? '/map' : '/diagnostic'
  return playerCount > 0 ? '/qui-juga' : '/start'
}
