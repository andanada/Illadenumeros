import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { CASA_GAME_ID, CASA_SKILLS } from './casaSkills'

/** La Casa: decorate the home (free play) and cook with the neighbours in the kitchen (facts around ten). */
export const place: PlaceModule = {
  id: 'casa',
  title: 'Casa',
  gameId: CASA_GAME_ID,
  skills: CASA_SKILLS,
  unlock: 'always',
  facade: 'facana-casa',
  Component: lazy(() => import('./CasaPlace')),
}
