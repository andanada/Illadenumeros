import { lazy } from 'react'
import type { PlaceModule } from '../types'
import { PERRUQUERIA_GAME_ID, PERRUQUERIA_SKILLS } from './perruqueriaSkills'

/** La Perruqueria: restyle the customer (free play) and bring hair clips for the customers (early addition). */
export const place: PlaceModule = {
  id: 'perruqueria',
  title: 'Perruqueria',
  gameId: PERRUQUERIA_GAME_ID,
  skills: PERRUQUERIA_SKILLS,
  unlock: { operation: 'add' },
  facade: 'facana-casa',
  Component: lazy(() => import('./PerruqueriaPlace')),
}

export { requestHost } from './requestHost'
