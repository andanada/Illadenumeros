/**
 * The claw machine toy (free play, no coins). Pure state: the claw slides over COLUMNS columns, drops,
 * and either lifts the toy under it or lets it slip («Gairebé!», never a failure screen). Every 4th try slips.
 */
export const COLUMNS = 5
export const SLIP_EVERY = 4

/** Prop ids (see art/props/shop/toys.tsx) of the toys, one per column. */
export const TOYS = ['osset', 'pilota', 'cotxet', 'vareta-magica', 'osset'] as const

export type ClawPhase = 'idle' | 'dropping' | 'lifting' | 'done'

export interface ClawState {
  column: number
  phase: ClawPhase
  tries: number
  /** Toys still in the machine, by column (undefined = taken). */
  toys: readonly (string | undefined)[]
  /** Toys in the prize chute, newest last. */
  won: readonly string[]
  /** What the last drop did, for the speech bubble and the announcement. */
  result: 'none' | 'won' | 'slipped' | 'empty'
}

export const initialClaw = (): ClawState => ({ column: 2, phase: 'idle', tries: 0, toys: [...TOYS], won: [], result: 'none' })

export const moveClaw = (s: ClawState, step: -1 | 1): ClawState =>
  s.phase === 'idle' || s.phase === 'done'
    ? { ...s, column: Math.min(COLUMNS - 1, Math.max(0, s.column + step)), phase: 'idle', result: 'none' }
    : s

export const dropClaw = (s: ClawState): ClawState =>
  s.phase === 'idle' || s.phase === 'done' ? { ...s, phase: 'dropping', tries: s.tries + 1 } : s

/** The claw reached the bottom: grab the toy below, or slip (every 4th try, or when the column is empty). */
export function grabToy(s: ClawState): ClawState {
  if (s.phase !== 'dropping') return s
  const toy = s.toys[s.column]
  if (toy === undefined) return { ...s, phase: 'lifting', result: 'empty' }
  if (s.tries % SLIP_EVERY === 0) return { ...s, phase: 'lifting', result: 'slipped' }
  return { ...s, phase: 'lifting', toys: s.toys.map((t, i) => (i === s.column ? undefined : t)), won: [...s.won, toy], result: 'won' }
}

/** Back at the top: ready to play again. */
export const liftDone = (s: ClawState): ClawState => (s.phase === 'lifting' ? { ...s, phase: 'done' } : s)

/** All the toys are gone: the machine is refilled (play never runs out). */
export const refill = (s: ClawState): ClawState => (s.toys.every((t) => t === undefined) ? { ...s, toys: [...TOYS] } : s)

export const CLAW_MESSAGE: Readonly<Record<ClawState['result'], string>> = {
  none: 'Mou la grua i baixa-la!',
  won: 'Ho has agafat! Quin premi!',
  slipped: 'Gairebé! Torna-ho a provar.',
  empty: 'Aquí no hi ha res. Prova una altra columna!',
}
