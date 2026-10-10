import { pick, rng } from '../../art/random'

/** Hidden surprise: `taps` taps reveal something, chosen deterministically from the seed. */
export interface SurpriseDef {
  readonly seed: string
  readonly taps: number
  readonly options: readonly string[]
}

export interface SurpriseState {
  readonly taps: number
  readonly revealed?: string
}

export const SURPRISE_START: SurpriseState = { taps: 0 }

export const surpriseResult = (def: SurpriseDef): string => pick(rng(def.seed), def.options)

export function tapSurprise(def: SurpriseDef, state: SurpriseState): SurpriseState {
  if (state.revealed !== undefined) return state
  const taps = state.taps + 1
  return taps >= def.taps ? { taps, revealed: surpriseResult(def) } : { taps }
}

/** 0..1 how close to bursting (drives the wobble: the closer, the bigger). */
export const surpriseProgress = (def: SurpriseDef, state: SurpriseState): number => (state.revealed !== undefined ? 1 : Math.min(1, state.taps / def.taps))
