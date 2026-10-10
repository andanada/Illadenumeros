import { useEffect } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { pizzasToSlice, slicePoint } from './slicing'

/** A pizza that has been cut with the cutter in hand falls apart into that many slices, laid in a ring. */
export function useSlicer(): void {
  const items = useItems((api) => api.items)
  const { consume, spawn } = useItems()
  const { announce } = useCast()
  useEffect(() => {
    for (const cut of pizzasToSlice(items)) {
      consume(cut.uid)
      for (let i = 0; i < cut.parts; i++) spawn('tros', { room: cut.room, at: slicePoint(cut.at, i, cut.parts) })
      announce(`La pizza s’ha tallat en ${cut.parts} trossos.`)
    }
  }, [items, consume, spawn, announce])
}
