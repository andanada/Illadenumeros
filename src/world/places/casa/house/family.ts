import type { RequestKind } from '../../../requests/types'
import type { ThemeId } from '../kitchen/ingredients'
import type { FloorId } from './zones'

/** The people (and the pet) who live in the house. Positions are fractions of their floor's stage. */
export interface Member {
  readonly id: string
  /** Neighbour preset that draws them. */
  readonly preset: string
  /** Catalan with article, for announcements. */
  readonly name: string
  readonly floor: FloorId
  readonly at: { x: number; y: number }
  /** What they ask for: undefined = the plain kitchen ingredients (the engine picks), else a themed bowl. */
  readonly theme?: ThemeId
  /** Kinds of request they usually carry. */
  readonly kinds: readonly RequestKind[]
  /** Short icon word shown in the bubble (decorative). */
  readonly icon: 'maduixa' | 'tovallola' | 'galeta' | 'croqueta'
  readonly facing: 1 | -1
}

export const MEMBERS: readonly Member[] = [
  { id: 'iaia', preset: 'senyora-pilar', name: 'la iaia', floor: 'baixa', at: { x: 0.72, y: 0.9 }, theme: 'maduixa', kinds: ['cook'], icon: 'maduixa', facing: -1 },
  { id: 'pare', preset: 'en-jordi', name: 'el pare', floor: 'pis', at: { x: 0.52, y: 0.88 }, theme: 'tovallola', kinds: ['give', 'drive'], icon: 'tovallola', facing: 1 },
  { id: 'germana', preset: 'la-mei', name: 'la germana', floor: 'golfes', at: { x: 0.28, y: 0.88 }, theme: 'galeta', kinds: ['serve', 'style'], icon: 'galeta', facing: 1 },
]

/** The pet asks for kibble. */
export const PET_MEMBER = { id: 'mascota', name: 'la mascota', theme: 'croqueta' as const, kinds: ['play'] as readonly RequestKind[], icon: 'croqueta' as const }

export interface Asker {
  readonly id: string
  readonly kinds: readonly RequestKind[]
  readonly theme?: ThemeId
}

export const ASKERS: readonly Asker[] = [...MEMBERS, PET_MEMBER]

export interface AskInput {
  readonly id: string
  readonly kind: RequestKind
  readonly actorId: string
}

/**
 * Who carries each request. A request goes to the member that usually asks for its kind; if that one already
 * carries another, to the next free one. At most one bubble per character. Pure and stable (same input, same result).
 */
export function assignAnchors(requests: readonly AskInput[], askers: readonly Asker[] = ASKERS): ReadonlyMap<string, string> {
  const taken = new Set<string>()
  const out = new Map<string, string>()
  for (const r of requests) {
    const free = askers.filter((a) => !taken.has(a.id))
    const pick = free.find((a) => a.kinds.includes(r.kind)) ?? free[0]
    if (!pick) continue
    taken.add(pick.id)
    out.set(pick.id, r.id)
  }
  return out
}

export const askerById = (id: string): Asker | undefined => ASKERS.find((a) => a.id === id)
