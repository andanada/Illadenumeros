import { useCallback, useEffect, useRef } from 'react'
import { choiceForValue } from '../../../errands/adapters'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { taskState, type TaskState } from '../../../sandbox/logic/requestTask'
import type { Items } from '../../../sandbox/logic/itemsState'
import type { TaskErrand } from '../../../sandbox/useRequestTask'
import { PIZZA_AT, ROOM } from '../shop/rooms'
import { PLATE } from '../shop/zones'
import { fractionMade } from './cutLogic'
import { slicePoint } from './slicing'

export interface CutSpec {
  readonly active: boolean
  readonly parts: number
  readonly selected: number
  readonly giveTo?: string
}

export interface CutProgress {
  readonly state: TaskState
  /** The pizza is cut and some slices lie on the plate. */
  readonly ready: boolean
  readonly caption: string
  readonly submit: () => Promise<void>
  readonly hint: string | undefined
}

const slicesOf = (items: Items): { all: number; given: number; whole: number } => {
  let all = 0
  let given = 0
  let whole = 0
  for (const it of Object.values(items)) {
    if (it.def === 'pizza-cuita' && it.uid.startsWith('pizza-demanda') && it.loc.t !== 'gone') whole += 1
    if (it.def !== 'tros' || (it.loc.t !== 'floor' && it.loc.t !== 'held')) continue
    all += 1
    if (it.zone === PLATE) given += 1
  }
  return { all, given, whole }
}

/**
 * Cut and give: a whole baked pizza is laid on the table; she cuts it with a cutter and hands slices over on the
 * plate. The fraction she answers is what she really made: slices given out of slices cut.
 */
export function useCutTask(errand: TaskErrand, spec: CutSpec): CutProgress {
  const cast = useCast()
  const { spawn, remove, consume, query } = useItems()
  const items = useItems((api) => api.items)
  const latest = useRef(items)
  useEffect(() => {
    latest.current = items
  })
  const { active, parts, selected } = spec
  const { item, phase, tries } = errand
  const { all, given, whole } = slicesOf(items)

  const clear = useCallback(() => {
    for (const it of Object.values(latest.current)) if ((it.def === 'tros' || it.def === 'pizza-cuita') && it.uid.includes('~')) remove(it.uid)
  }, [remove])

  const lay = useCallback(() => {
    spawn('pizza-cuita', { room: ROOM.kitchen, at: PIZZA_AT, uid: `pizza-demanda-${item.id}` })
  }, [spawn, item.id])

  useEffect(() => {
    if (!active) return
    lay()
    return () => {
      for (const it of query(ROOM.kitchen)) if (it.uid.startsWith('pizza-demanda')) remove(it.uid)
      clear()
    }
    // A new item or the request opening decides the pizza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, item.id])

  const seen = useRef(tries)
  useEffect(() => {
    if (active && tries > seen.current) {
      for (const it of Object.values(latest.current)) if (it.def === 'tros' || it.def === 'pizza-cuita') remove(it.uid)
      lay()
      cast.announce('Ho tornem a provar: hi ha una pizza nova.')
    }
    seen.current = tries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries])

  useEffect(() => {
    if (!active || phase !== 'shown') return
    for (const it of Object.values(latest.current)) if (it.def === 'tros' || it.def === 'pizza-cuita') remove(it.uid)
    for (let i = 0; i < parts; i++) {
      if (i < selected) spawn('tros', { room: ROOM.dining, at: PIZZA_AT, zone: PLATE })
      else spawn('tros', { room: ROOM.kitchen, at: slicePoint(PIZZA_AT, i, parts) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (!active || phase !== 'thanks') return
    for (const it of Object.values(latest.current)) if (it.def === 'tros' && it.zone === PLATE) consume(it.uid)
    if (spec.giveTo) cast.emote(spec.giveTo, 'cor')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const ready = whole === 0 && all >= 2 && given >= 1
  const submit = useCallback(async (): Promise<void> => {
    if (!active || phase !== 'asking' || !ready) return
    await errand.submit(choiceForValue(fractionMade(given, all), item))
  }, [active, phase, ready, errand, given, all, item])

  const caption = whole > 0 ? 'Agafa un tallador i toca la pizza per tallar-la.' : given === 0 ? 'Porta els trossos al plat de la clienta.' : 'Quan estigui, prem Comprova.'
  return { state: taskState(phase, given), ready, caption, submit, hint: errand.hintText }
}
