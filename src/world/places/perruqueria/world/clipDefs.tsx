import type { InteractableDef } from '../../../sandbox/defs'
import { ClipArt } from '../errands/ClipArt'
import { CLIP, WORN } from './clipTask'

const art = (color: 'rosa' | 'mango') => () => (
  <g transform="scale(2.5)">
    <ClipArt size={30} color={color} />
  </g>
)

/**
 * The clips of a request: the ones she takes from the box (pink, a big touch target) and the ones the customer already
 * wears («ja porto 4», golden, not to be taken off again).
 */
export const CLIP_DEFS: readonly InteractableDef[] = [
  { id: CLIP, label: 'la pinça', single: 'una pinça', aspect: 4 / 3, height: 0.075, pickup: true, minHit: 64, art: art('rosa') },
  { id: WORN, label: 'la pinça que ja porta', single: 'una pinça', aspect: 4 / 3, height: 0.075, art: art('mango') },
]
