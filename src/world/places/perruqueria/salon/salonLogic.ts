import { PALETTE_COLORS, type AvatarSpec, type PaletteColor } from '../../../model/types'

/** Free play in the salon (no coins: only errands give coins). Pure state helpers. */

export const HAIR_STYLES = ['cabell-curt', 'cabell-bob', 'cabell-cues', 'cabell-cua', 'cabell-llarg', 'cabell-arrissat', 'cabell-monyo', 'cabell-trenes', 'cabell-punxes', 'cabell-rapat'] as const
export const HAIR_COLOURS: readonly PaletteColor[] = PALETTE_COLORS.filter((c) => c !== 'neu')
/** Accessories the clip tool pins on (null = none yet). */
export const CLIP_ITEMS = ['flor', 'llac', 'diadema-gat', 'corona'] as const

export type Tool = 'tisores' | 'assecador' | 'color' | 'pinces'
export const TOOLS: readonly Tool[] = ['tisores', 'assecador', 'color', 'pinces']

export const TOOL_NAMES: Readonly<Record<Tool, string>> = {
  tisores: 'les tisores',
  assecador: 'l’assecador',
  color: 'l’esprai de color',
  pinces: 'les pinces',
}

export interface SalonState {
  style: string
  color: PaletteColor
  /** Index in CLIP_ITEMS, or -1 for none. */
  clip: number
  /** The dryer just puffed her hair up. */
  fluffed: boolean
}

export const initialSalon = (style: string, color: PaletteColor): SalonState => ({ style, color, clip: -1, fluffed: false })

const next = <T,>(list: readonly T[], current: T): T => list[(list.indexOf(current) + 1) % list.length] ?? (list[0] as T)

export function applyTool(state: SalonState, tool: Tool): SalonState {
  switch (tool) {
    case 'tisores':
      return { ...state, style: next(HAIR_STYLES, state.style as (typeof HAIR_STYLES)[number]), fluffed: false }
    case 'color':
      return { ...state, color: next(HAIR_COLOURS, state.color), fluffed: false }
    case 'pinces':
      return { ...state, clip: state.clip + 1 >= CLIP_ITEMS.length ? -1 : state.clip + 1 }
    case 'assecador':
      return { ...state, fluffed: true }
  }
}

/** The colour the spray will paint next (shown on the can). */
export const nextSprayColour = (state: SalonState): PaletteColor => next(HAIR_COLOURS, state.color)

/** The customer's look: their own clothes and face, the hair and the clip she chose. */
export function lookOf(base: AvatarSpec, state: SalonState): AvatarSpec {
  const clip = CLIP_ITEMS[state.clip]
  return { ...base, hair: { style: state.style, color: state.color }, accessory: clip ? { item: clip, color: state.color === 'rosa' ? 'cel' : 'rosa' } : base.accessory }
}

export const REACTIONS: Readonly<Record<Tool, readonly string[]>> = {
  tisores: ['Cris, cris! Quin pentinat nou!', 'Tallat! Em sento lleugera!'],
  assecador: ['Uuuuh! Quin ventet!', 'Ara tinc el cabell ben inflat!'],
  color: ['Psssst! Quin color tan bonic!', 'Mira, ara sóc un altre color!'],
  pinces: ['Clic! Quina pinça més maca!', 'Uau, em queda genial!'],
}

export const reactionFor = (tool: Tool, n: number): string => REACTIONS[tool][n % REACTIONS[tool].length] ?? ''

export const TOOL_KIND_PREFIX = 'eina:'
export const toolKind = (tool: Tool): string => `${TOOL_KIND_PREFIX}${tool}`
export const toolOfKind = (kind: string): Tool | undefined => TOOLS.find((t) => toolKind(t) === kind)
