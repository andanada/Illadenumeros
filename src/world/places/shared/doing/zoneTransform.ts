import type { Items } from '../../../sandbox/logic/itemsState'

/** Timer-free change of state: what lies in `zone` as `from` becomes `to` (raw dough in the oven comes out baked). */
export interface TransformRule {
  readonly zone: string
  readonly from: string
  readonly to: string
  /** Catalan line announced when it happens. */
  readonly said: string
}

export interface Pending {
  readonly uid: string
  readonly rule: TransformRule
}

/** Pure: the things that must change now. Each thing changes once (the new def matches no rule of that zone). */
export function pendingTransforms(items: Items, rules: readonly TransformRule[]): readonly Pending[] {
  return Object.values(items).flatMap((it) => {
    if (it.loc.t !== 'floor' || it.zone === undefined) return []
    const rule = rules.find((r) => r.zone === it.zone && r.from === it.def)
    return rule ? [{ uid: it.uid, rule }] : []
  })
}
