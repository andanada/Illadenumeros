/**
 * Multi-step «use» of an object: a chain of stages, each advanced by tapping the right tool onto the target
 * (fruit: wash → chop → cook → plate; hair: comb → colour → clip; plant: water → grow).
 * Pure and declarative.
 */

export interface ChainStage {
  /** Stage id shown by the art (the target looks different at each stage). */
  readonly id: string
  /** Short Catalan adjective for screen readers («neta», «tallada»). Defaults to the id. */
  readonly label?: string
  /** Tool kind that brings the target INTO this stage (the first stage is the starting state). */
  readonly tool?: string
  /** Catalan sentence announced when the stage is reached, e.g. «Ho has rentat!». */
  readonly said: string
}

export interface UseChain {
  readonly stages: readonly [ChainStage, ...ChainStage[]]
}

export interface ChainState {
  /** Index into stages. */
  readonly at: number
}

export const CHAIN_START: ChainState = { at: 0 }

export type ChainResult =
  | { ok: true; state: ChainState; stage: ChainStage; done: boolean }
  | { ok: false; state: ChainState; expected: string | undefined }

export const currentStage = (chain: UseChain, state: ChainState): ChainStage => chain.stages[Math.min(state.at, chain.stages.length - 1)] ?? chain.stages[0]

export const isDone = (chain: UseChain, state: ChainState): boolean => state.at >= chain.stages.length - 1

/** The tool kind the next step wants (undefined once finished). */
export const nextTool = (chain: UseChain, state: ChainState): string | undefined => chain.stages[state.at + 1]?.tool

/** Tap `tool` onto the target: advances only when it is the right tool for the next stage. */
export function applyTool(chain: UseChain, state: ChainState, tool: string): ChainResult {
  const next = chain.stages[state.at + 1]
  if (!next || next.tool !== tool) return { ok: false, state, expected: next?.tool }
  const after = { at: state.at + 1 }
  return { ok: true, state: after, stage: next, done: isDone(chain, after) }
}
