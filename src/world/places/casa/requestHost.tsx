import type { RequestHost, RequestStageProps } from '../../requests/requestHost'
import { CASA_GAME_ID, CASA_SKILLS } from './casaSkills'
import { ASKERS, MEMBERS } from './house/family'
import { RequestSheet } from './house/RequestSheet'
import { CASA_ADAPTERS } from './kitchen/casaAdapters'

/** Plays one request of the house on its own (the family member it belongs to by kind, or the pet). */
function CasaRequestStage({ request, onResolved, onIgnore }: RequestStageProps) {
  const asker = ASKERS.find((a) => a.kinds.includes(request.kind)) ?? ASKERS[0]
  return <RequestSheet request={request} askerId={asker?.id ?? 'iaia'} pet={undefined} onSolved={onResolved} onClose={(solved) => !solved && onIgnore()} />
}

/** What the house gives the request system: whose bubbles, how each is played, and the stage that plays one. */
export const requestHost: RequestHost = {
  placeId: 'casa',
  anchors: [...MEMBERS.map((m) => ({ actorId: m.id, x: m.at.x, y: m.at.y })), { actorId: 'mascota', x: 0.4, y: 0.88 }],
  adapters: CASA_ADAPTERS,
  gameId: CASA_GAME_ID,
  skillIds: CASA_SKILLS,
  Stage: CasaRequestStage,
}
