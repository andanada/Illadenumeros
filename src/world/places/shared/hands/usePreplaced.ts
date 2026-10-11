import { useEffect, useRef } from 'react'
import { useItems } from '../../../sandbox/ItemsContext'

export interface Preplaced {
  readonly zone: string
  readonly def: string
}

/**
 * Things that already lie in a zone when the request starts («ja n’hi ha 6»): they are not hers to count, so
 * they have their own def (it cannot be picked up again) and the task counts only what she adds.
 */
export function usePreplaced(list: readonly Preplaced[], active: boolean, key: string): void {
  const { spawn, remove } = useItems()
  const mine = useRef<string[]>([])
  useEffect(() => {
    if (!active) return
    const uids = list.flatMap((p) => {
      const uid = spawn(p.def, { room: 'x', at: { x: 0, y: 0 }, zone: p.zone })
      return uid ? [uid] : []
    })
    mine.current = uids
    return () => {
      uids.forEach((u) => remove(u))
      mine.current = []
    }
    // `key` stands for the list's content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key])
}
