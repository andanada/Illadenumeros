import { useEffect } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { pendingTransforms, type TransformRule } from './zoneTransform'

/** Applies the rules to whatever lands in their zones (oven, cooling rack): the thing pops and its new self takes the slot. */
export function useZoneTransform(rules: readonly TransformRule[]): void {
  const items = useItems((api) => api.items)
  const { consume, spawn } = useItems()
  const { announce } = useCast()
  useEffect(() => {
    for (const p of pendingTransforms(items, rules)) {
      const it = items[p.uid]
      if (!it || it.loc.t !== 'floor' || !it.zone) continue
      const { room, at } = it.loc
      consume(p.uid)
      spawn(p.rule.to, { room, at, zone: it.zone })
      announce(p.rule.said)
    }
  }, [items, rules, consume, spawn, announce])
}
