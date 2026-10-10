import { lazy } from 'react'
import type { RequestHost } from '../../requests/requestHost'
import type { PlaceModule } from '../types'
import { CASA_GAME_ID, CASA_SKILLS } from './casaSkills'

/** La Casa: a three-floor dollhouse to live in (free play, decorating) with the family's maths requests inside. */
export const place: PlaceModule = {
  id: 'casa',
  title: 'Casa',
  gameId: CASA_GAME_ID,
  skills: CASA_SKILLS,
  unlock: 'always',
  facade: 'facana-casa',
  Component: lazy(() => import('./CasaPlace')),
}

/** The house's part of the request system, loaded with the place (kept out of the town's first chunk). */
export const loadRequestHost = (): Promise<RequestHost> => import('./requestHost').then((m) => m.requestHost)
