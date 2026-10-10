import { canTakeFrom, itemsHeldBy, type Items } from './itemsState'
import { nextTool, type UseChain } from './useChain'

/** The behaviour flags of a definition that decide what a tap means (art lives elsewhere). */
export interface DefBehaviour {
  pickup?: boolean
  /** Kind of tool this object is when held. */
  tool?: string
  use?: UseChain
  container?: boolean
  surprise?: boolean
}
export type DefLookup = Readonly<Record<string, DefBehaviour>>

export type TapPlan =
  | { kind: 'pickup'; uid: string }
  | { kind: 'putdown'; uid: string }
  | { kind: 'toggle'; uid: string }
  | { kind: 'putin'; uid: string; held: string }
  | { kind: 'apply'; uid: string; tool: string; toolUid: string }
  | { kind: 'hint'; uid: string; needs: string }
  | { kind: 'surprise'; uid: string }
  | { kind: 'poke'; uid: string }
  | { kind: 'reject'; uid: string; why: 'closed' | 'unreachable' }

/** What tapping object `uid` means for actor `who`, given what they hold. Pure and exhaustive. */
export function resolveItemTap(items: Items, defs: DefLookup, who: string, uid: string): TapPlan {
  const target = items[uid]
  if (!target || target.loc.t === 'gone' || target.loc.t === 'held' && target.loc.by !== who) return { kind: 'reject', uid, why: 'unreachable' }
  const def = defs[target.def] ?? {}
  const inHand = itemsHeldBy(items, who)[0]
  if (target.loc.t === 'held') return { kind: 'putdown', uid }
  if (target.loc.t === 'in' && !canTakeFrom(items, uid)) return { kind: 'reject', uid, why: 'closed' }

  if (inHand) {
    const toolKind = defs[inHand.def]?.tool
    if (def.use) {
      const needs = nextTool(def.use, target.chain)
      if (needs !== undefined && toolKind === needs) return { kind: 'apply', uid, tool: needs, toolUid: inHand.uid }
      if (needs !== undefined) return { kind: 'hint', uid, needs }
    }
    if (def.container) return target.open ? { kind: 'putin', uid, held: inHand.uid } : { kind: 'toggle', uid }
    return { kind: 'poke', uid }
  }

  if (def.container) return { kind: 'toggle', uid }
  if (def.surprise) return { kind: 'surprise', uid }
  if (def.pickup) return { kind: 'pickup', uid }
  if (def.use) {
    const needs = nextTool(def.use, target.chain)
    if (needs !== undefined) return { kind: 'hint', uid, needs }
  }
  return { kind: 'poke', uid }
}
