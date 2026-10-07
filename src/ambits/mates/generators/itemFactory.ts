import type { Choice, CpaStage, Item, VisualModel } from '../../../core/ambit/types'
import type { Rng } from '../../../core/rng'

export interface ItemSpec {
  skillId: string
  factKey?: string
  text: string
  speech: string
  answer: number | string
  choices: Choice[]
  /** Support visual for concrete/pictorial stages and for hints. */
  visual: VisualModel
  hints: [string, string, string]
  cpaStage: CpaStage
  operands?: Item['operands']
}

/** In the abstract stage the support visual is hidden but kept as a hint. */
export function makeItem(spec: ItemSpec, rng: Rng): Item {
  const id = `${spec.skillId}-${Math.floor(rng.next() * 1e9).toString(36)}`
  return {
    id,
    skillId: spec.skillId,
    ...(spec.factKey !== undefined ? { factKey: spec.factKey } : {}),
    text: spec.text,
    speech: spec.speech,
    answer: String(spec.answer),
    choices: spec.choices,
    visual: spec.cpaStage === 'abstracte' ? { kind: 'none' } : spec.visual,
    hintVisual: spec.visual,
    hints: spec.hints,
    cpaStage: spec.cpaStage,
    ...(spec.operands !== undefined ? { operands: spec.operands } : {}),
  }
}

export const addKey = (a: number, b: number): string => `add:${Math.min(a, b)}+${Math.max(a, b)}`
export const subKey = (a: number, b: number): string => `sub:${a}-${b}`
export const tenKey = (a: number): string => `c10:${a}`
/** Commutative: the smaller factor goes first ("mul:3x7"). */
export const mulKey = (a: number, b: number): string => `mul:${Math.min(a, b)}x${Math.max(a, b)}`
/** Dividend and divisor ("div:21:3"). */
export const divKey = (dividend: number, divisor: number): string => `div:${dividend}:${divisor}`

export interface ParsedFact {
  kind: string
  a: number
  b: number
}

const KEY_PATTERNS: readonly RegExp[] = [/^(add):(\d+)\+(\d+)$/, /^(sub):(\d+)-(\d+)$/, /^(mul):(\d+)x(\d+)$/, /^(div):(\d+):(\d+)$/, /^(c10):(\d+)$/]

/** Parses "add:3+5" / "sub:9-4" / "c10:3" / "mul:3x7" / "div:21:3" into its numbers. */
export function parseFactKey(key: string): ParsedFact | undefined {
  for (const pattern of KEY_PATTERNS) {
    const match = pattern.exec(key)
    if (!match) continue
    const a = Number(match[2])
    const b = match[3] !== undefined ? Number(match[3]) : 10 - a
    return { kind: match[1] as string, a, b }
  }
  return undefined
}
