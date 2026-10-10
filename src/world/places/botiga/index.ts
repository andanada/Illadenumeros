import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { BOTIGA_GAME_ID, BOTIGA_SKILLS } from './botigaSkills'

/** La Botiga de la cantonada, plugged into the town (open from day one). */
export const place: PlaceModule = {
  id: 'botiga',
  title: 'la Botiga',
  gameId: BOTIGA_GAME_ID,
  skills: BOTIGA_SKILLS,
  unlock: 'always',
  facade: 'facana-botiga',
  Component: lazy(() => import('./BotigaPlace')),
}

export { requestHost } from './requestHost'
