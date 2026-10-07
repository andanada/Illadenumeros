import type { Profile } from '../core/storage/db'

export type HomeRoute = '/start' | '/diagnostic' | '/map'

/** Where `/` should send the child: no profile → start, no diagnostic yet → diagnostic, else the map. */
export function resolveHome(profile: Pick<Profile, 'diagnosticDone'> | undefined): HomeRoute {
  if (!profile) return '/start'
  return profile.diagnosticDone ? '/map' : '/diagnostic'
}
