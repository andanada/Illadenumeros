import { useEffect, useMemo, useState } from 'react'
import { useRequests } from '../../../requests/useRequests'
import type { Request } from '../../../requests/types'
import { assignAnchors, ASKERS } from './family'
import type { Bubble } from './RequestAnchors'

export interface OpenRequest {
  readonly request: Request
  readonly askerId: string
}

const DONE_MS = 2600

/** A made-up request for tests that fix the skill (no day is open there). */
export const forcedRequest = (skillId: string, factKey?: string): Request => ({ id: 'forced', placeId: 'casa', kind: 'cook', actorId: 'senyora-pilar', skillId, ...(factKey ? { factKey } : {}), createdAt: 0, expiresSoft: Number.MAX_SAFE_INTEGER })

/**
 * The house's requests as bubbles over the family: which character carries which request, the one being played,
 * and a short «done» tick after a solved one. Ignoring a bubble costs nothing; a calm one wakes with a tap.
 */
export function useCasaRequests(hasPet: boolean, callSignal: number, forced: { skillId: string; factKey?: string } | undefined) {
  const live = useRequests('casa')
  const [open, setOpen] = useState<OpenRequest | undefined>(() => (forced ? { request: forcedRequest(forced.skillId, forced.factKey), askerId: 'iaia' } : undefined))
  const [doneFor, setDoneFor] = useState<string | undefined>(undefined)
  const askers = useMemo(() => ASKERS.filter((a) => hasPet || a.id !== 'mascota'), [hasPet])
  const assigned = useMemo(() => assignAnchors(live.requests.map((r) => ({ id: r.id, kind: r.kind, actorId: r.actorId })), askers), [live.requests, askers])

  const bubbles: Bubble[] = [...assigned].map(([askerId, requestId]) => {
    const r = live.requests.find((x) => x.id === requestId)
    return { askerId, requestId, state: askerId === doneFor ? 'done' : r?.status === 'calm' ? 'calm' : 'waiting' }
  })
  if (doneFor && !assigned.has(doneFor)) bubbles.push({ askerId: doneFor, requestId: 'done', state: 'done' })

  useEffect(() => {
    if (!doneFor) return
    const timer = setTimeout(() => setDoneFor(undefined), DONE_MS)
    return () => clearTimeout(timer)
  }, [doneFor])

  const tap = (b: Bubble): void => {
    if (b.state === 'done') return
    if (b.state === 'calm') return live.wakeRequests()
    const request = live.requests.find((r) => r.id === b.requestId)
    if (request) setOpen({ request, askerId: b.askerId })
  }

  // The HUD's «call a neighbour»: whoever waits first comes to the front (state adjusted during render).
  const [seen, setSeen] = useState(callSignal)
  if (seen !== callSignal) {
    setSeen(callSignal)
    const first = bubbles.find((b) => b.state === 'waiting')
    const request = first && live.requests.find((r) => r.id === first.requestId)
    if (first && request) setOpen({ request, askerId: first.askerId })
  }

  const close = (solved: boolean): void => {
    if (solved && open) setDoneFor(open.askerId)
    setOpen(undefined)
  }

  return { bubbles, open, tap, close, waiting: live.waiting }
}
