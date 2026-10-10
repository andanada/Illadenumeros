import { PALETTE_COLORS, type AvatarSpec, type PaletteColor } from '../../../model/types'
import { applyTool, CHAIN_START, currentStage, isDone, type ChainState, type UseChain } from '../../../sandbox/logic/useChain'

export const HAIR_STYLES = ['cabell-curt', 'cabell-bob', 'cabell-cues', 'cabell-cua', 'cabell-llarg', 'cabell-arrissat', 'cabell-monyo', 'cabell-trenes', 'cabell-punxes', 'cabell-rapat'] as const
export const HAIR_COLOURS: readonly PaletteColor[] = PALETTE_COLORS.filter((c) => c !== 'neu')
/** Accessories the clips pin on. */
export const CLIP_ITEMS = ['flor', 'llac', 'diadema-gat', 'corona'] as const

export type Tool = 'dutxa' | 'pinta' | 'tisores' | 'esprai' | 'assecador' | 'pinces'
export const TOOLS: readonly Tool[] = ['dutxa', 'pinta', 'tisores', 'esprai', 'assecador', 'pinces']
export const TOOL_NAMES: Readonly<Record<Tool, string>> = {
  dutxa: 'la dutxa',
  pinta: 'la pinta',
  tisores: 'les tisores',
  esprai: 'l’esprai de color',
  assecador: 'l’assecador',
  pinces: 'les pinces',
}

/** wash → comb → cut → colour → dry → clip: each tool brings the customer to the next stage. */
export const HAIR_CHAIN: UseChain = {
  stages: [
    { id: 'inicial', label: 'sense arreglar', said: 'Està esperant el seu torn.' },
    { id: 'rentat', label: 'rentat', tool: 'dutxa', said: 'Quina aigua més bona! Ara tinc el cabell net.' },
    { id: 'pentinat', label: 'pentinat', tool: 'pinta', said: 'Quin pentinat més suau!' },
    { id: 'tallat', label: 'tallat', tool: 'tisores', said: 'Cris, cris! Quin pentinat nou!' },
    { id: 'coloreat', label: 'amb color', tool: 'esprai', said: 'Psssst! Mira, ara sóc d’un altre color!' },
    { id: 'sec', label: 'eixugat', tool: 'assecador', said: 'Uuuuh! Quin ventet! Ja tinc el cabell sec.' },
    { id: 'pinca', label: 'amb pinça', tool: 'pinces', said: 'Clic! Quina pinça més maca! Uau, em queda genial!' },
  ],
}

const next = <T,>(list: readonly T[], current: T, by: number): T => list[(Math.max(0, list.indexOf(current)) + 1 + by) % list.length] ?? (list[0] as T)

/** The look of someone who has reached `stage` of the chain (cut at 3, colour at 4, clip at 6). `pick` makes each customer different. */
export function restyle(base: AvatarSpec, stage: number, pick: number): AvatarSpec {
  const style = stage >= 3 ? next(HAIR_STYLES, base.hair.style as (typeof HAIR_STYLES)[number], pick) : base.hair.style
  const color = stage >= 4 ? next(HAIR_COLOURS, base.hair.color, pick) : base.hair.color
  const clip = stage >= 6 ? CLIP_ITEMS[pick % CLIP_ITEMS.length] : undefined
  return { ...base, hair: { style, color }, accessory: clip ? { item: clip, color: color === 'rosa' ? 'cel' : 'rosa' } : base.accessory }
}

/** Where each customer is in the chain (by id). Customers not in the map are at the start. */
export type Progress = Readonly<Record<string, ChainState>>

export type Outcome =
  | { readonly kind: 'ok'; readonly say: string; readonly done: boolean; readonly stage: number }
  | { readonly kind: 'wait'; readonly say: string }
  | { readonly kind: 'done'; readonly say: string }

const WHY: Readonly<Record<Tool, string>> = {
  dutxa: 'Ja té el cabell net.',
  pinta: 'Primer cal rentar-lo amb la dutxa.',
  tisores: 'Abans toca pentinar-lo.',
  esprai: 'Primer cal tallar-lo amb les tisores.',
  assecador: 'Abans cal posar-li color.',
  pinces: 'Primer cal eixugar-lo amb l’assecador.',
}

/** A tool put on a customer's chair. Out of order only says what comes first (nothing is lost, nobody is cross). */
export function toolOn(progress: Progress, id: string, tool: Tool): { progress: Progress; outcome: Outcome } {
  const state = progress[id] ?? CHAIN_START
  if (isDone(HAIR_CHAIN, state)) return { progress, outcome: { kind: 'done', say: 'Ja està guapíssima! Toca el torn del següent.' } }
  const result = applyTool(HAIR_CHAIN, state, tool)
  if (!result.ok) return { progress, outcome: { kind: 'wait', say: WHY[tool] } }
  return { progress: { ...progress, [id]: result.state }, outcome: { kind: 'ok', say: result.stage.said, done: result.done, stage: result.state.at } }
}

export const stageOf = (progress: Progress, id: string): number => progress[id]?.at ?? 0
export const stageName = (progress: Progress, id: string): string => currentStage(HAIR_CHAIN, progress[id] ?? CHAIN_START).label ?? ''

/** Who the mirror shows: the one in chair 1, else chair 2, else the last one touched. */
export function mirrorTarget(chairs: readonly (string | undefined)[], last: string | undefined): string | undefined {
  return chairs.find((c) => c !== undefined) ?? last
}

/** Customers in the middle of a restyle (started, not finished): the clock must not send them away. */
export const inProgress = (progress: Progress): string[] => Object.entries(progress).flatMap(([id, s]) => (s.at > 0 && !isDone(HAIR_CHAIN, s) ? [id] : []))
