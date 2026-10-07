import { useAccount, type AccountState } from '../../core/sync/accountStore'

type DotState = 'ok' | 'offline' | 'error'

const LOOK: Record<DotState, { className: string; title: string }> = {
  ok: { className: 'bg-ok', title: 'Compte de la família: sincronitzat' },
  offline: { className: 'bg-ink/30', title: 'Compte de la família: sense connexió (es sincronitzarà sol)' },
  error: { className: 'bg-almost', title: 'Compte de la família: cal revisar-ho a la pàgina de la família' },
}

function dotState(s: Pick<AccountState, 'status' | 'message' | 'players'>): DotState | undefined {
  if (s.status === 'offline') return 'offline'
  if (s.status !== 'loggedIn') return undefined
  return s.message || Object.values(s.players).some((p) => p.state === 'error') ? 'error' : 'ok'
}

/**
 * Tiny dot next to the adults' lock on the map. Purely decorative for the child (aria-hidden), with
 * a title for the adult. Nothing without an account; never red, never animated.
 */
export function SyncStatusDot() {
  const state = useAccount((s) => dotState(s))
  if (!state) return null
  const look = LOOK[state]
  return <span aria-hidden="true" data-sync={state} title={look.title} className={`inline-block size-2.5 rounded-full ${look.className}`} />
}
