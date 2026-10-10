import { useEffect } from 'react'
import { useItems } from '../../../sandbox/ItemsContext'

/** When a request ends, whatever was left lying in its frames goes away (the frames themselves disappear). */
export function useZoneSweep(zoneIds: readonly string[], active: boolean): void {
  const { items, remove } = useItems()
  useEffect(() => {
    if (active) return
    for (const it of Object.values(items)) if (it.zone && zoneIds.includes(it.zone)) remove(it.uid)
  }, [active, items, remove, zoneIds])
}
