import type { PlayerSyncState } from '../../core/sync/accountStore'

/** Catalan texts of the family account section (adults only). */

export const MIN_PASSWORD = 10

export const INPUT_CLASS =
  'min-h-16 w-full rounded-2xl border-4 border-brand/40 bg-white px-4 text-xl font-semibold text-ink focus:border-brand focus:outline-none'

/** "fa un moment", "fa 5 minuts", "fa 3 hores", or a date. */
export function sinceText(at: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000)
  if (minutes < 1) return 'fa un moment'
  if (minutes < 60) return `fa ${minutes} ${minutes === 1 ? 'minut' : 'minuts'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `fa ${hours} ${hours === 1 ? 'hora' : 'hores'}`
  return `el ${new Date(at).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })}`
}

export interface Chip {
  readonly label: string
  readonly tone: 'ok' | 'busy' | 'warn' | 'muted'
}

export function chipFor(state: PlayerSyncState | undefined): Chip {
  if (!state) return { label: 'Pendent', tone: 'muted' }
  if (state.state === 'syncing') return { label: 'Sincronitzant…', tone: 'busy' }
  if (state.state === 'error') return { label: 'No s’ha pogut sincronitzar', tone: 'warn' }
  if (state.state === 'detached') return { label: 'Ja no és al compte', tone: 'muted' }
  return { label: 'Al dia', tone: 'ok' }
}

export const notSentText = (n: number): string =>
  n === 1 ? '1 dada no s’ha pogut enviar (té un format antic o malmès); la resta sí.' : `${n} dades no s’han pogut enviar (format antic o malmès); la resta sí.`
