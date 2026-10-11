import { useEffect, useMemo, useState } from 'react'
import { useErrand } from '../../../errands/useErrand'
import type { Request } from '../../../requests/types'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { ofPlace, toPlace } from '../../../sandbox/logic/catalan'
import type { ZoneDef } from '../../../sandbox/zoneTypes'
import { useRequestTask } from '../../../sandbox/useRequestTask'
import { HandsCard, SheetTask } from '../../shared/hands/HandsCard'
import type { Px } from '../../shared/hands/pileLayout'
import { usePreplaced } from '../../shared/hands/usePreplaced'
import { useSpreadPile } from '../../shared/hands/useSpreadPile'
import { CASA_GAME_ID, CASA_SKILLS } from '../casaSkills'
import { askerById, MEMBERS } from '../house/family'
import { CASA_ADAPTERS, themedAdapters } from '../kitchen/casaAdapters'
import { frameLayout, pileAreaOf, sideOf } from './homeLayout'
import { homeTaskOf, looseDef, PLACES, preDef } from './homeTask'
import type { HomeMats } from './HomeMat'

export const FRAME_ZONE = 'peticio-casa'
const AVATAR = 'jo'

export interface HomeRequestProps {
  request: Request
  /** Who asks: a family member or the pet. */
  askerId: string
  onSolved: (coins: number) => void
  /** The card closes: she let it be («Ara no») or said goodbye after the thanks. */
  onClose: (solved: boolean) => void
  /** Size in px of one floor's stage, to lay the frame and the pile out. */
  stage: Px
  setZones: (zones: readonly ZoneDef[]) => void
  setMats: (mats: HomeMats | undefined) => void
  forced?: { skillId: string; factKey?: string }
}

/** The card floats at the top, or at the bottom when the family member is on the top floor: it never covers her. */
const DOCK_TOP = 'top-[88px] portrait:top-[96px]'
const DOCK_BOTTOM = 'bottom-[104px] portrait:bottom-[188px]'
const NO_PRE: readonly { zone: string; def: string }[] = []

/**
 * A family request done in the house: the things lie in a pile on their floor, she carries them one by one into the
 * frame (bowl, rack, tray…) and hands it over with «Dóna-ho». Make-ten requests start with some already in the frame.
 * Items the hands cannot play fall back to the price tags inside the same card.
 */
export function HomeRequest({ request, askerId, onSolved, onClose, stage, setZones, setMats, forced }: HomeRequestProps) {
  const cast = useCast()
  const { dropHeld } = useItems()
  const asker = askerById(askerId)
  const member = MEMBERS.find((m) => m.id === askerId)
  const adapters = useMemo(() => (asker?.theme ? themedAdapters(asker.theme) : CASA_ADAPTERS), [asker?.theme])
  const target = forced ?? (request.skillId ? { skillId: request.skillId, ...(request.factKey ? { factKey: request.factKey } : {}) } : undefined)
  const errand = useErrand({ gameId: CASA_GAME_ID, skillIds: CASA_SKILLS, adapters, onSolved, ...(target ? { forced: target } : {}) })
  const task = useMemo(() => homeTaskOf(errand.item, asker?.theme), [errand.item, asker?.theme])
  const who = member?.name ?? 'la mascota'

  // Where she asks is decided once, when the card opens: that floor and that half stay put until it closes.
  const [spot] = useState(() => ({ room: cast.state.actors[askerId]?.room ?? 'baixa', x: member?.at.x ?? cast.positionOf(askerId).x }))
  const side = sideOf(spot.x)
  const ingredient = task?.ingredient
  const loose = ingredient ? looseDef(ingredient) : 'x'
  const pre = ingredient ? preDef(ingredient) : 'x'
  const places = ingredient ? PLACES[ingredient.id] : undefined
  const area = useMemo(() => pileAreaOf(side), [side])
  const frame = useMemo(() => (task ? frameLayout(task.capacity, side, stage) : undefined), [task, side, stage])

  const zones = useMemo<readonly ZoneDef[]>(() => (frame && places ? [{ id: FRAME_ZONE, room: spot.room, rect: frame.rect, cols: frame.cols, capacity: frame.capacity, label: places.frame, accepts: (d: string) => d === loose || d === pre }] : []), [frame, places, spot.room, loose, pre])
  useEffect(() => {
    setZones(zones)
    setMats(frame && places ? { room: spot.room, frame: frame.rect, frameLabel: places.frame, icon: places.icon, pile: area, pileLabel: places.source } : undefined)
    return () => {
      setZones([])
      setMats(undefined)
    }
  }, [zones, frame, places, area, spot.room, setZones, setMats])

  // She goes to that floor (the stairs stay for free play), carrying whatever she had.
  useEffect(() => {
    if (cast.state.actors[AVATAR]?.room !== spot.room) cast.enterRoom(AVATAR, spot.room, { x: 0.5, y: 0.88 })
    cast.select(AVATAR)
    // Whatever she carried is put down: her hands are free for the pile.
    if (cast.state.actors[AVATAR]?.carrying && cast.state.selected === AVATAR) dropHeld()
    // Once, when the card opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ready = useItems((api) => api.zones[FRAME_ZONE] !== undefined) && task !== undefined
  const pileAt = useMemo(() => ({ x: (area.x0 + area.x1) / 2, y: (area.y0 + area.y1) / 2 }), [area])
  const spec = useMemo(() => ({ zone: FRAME_ZONE, def: loose, source: { def: loose, room: spot.room, at: pileAt }, expected: task?.expected ?? 0, supply: Math.min(40, (task?.expected ?? 0) + 2), giveTo: askerId, active: ready }), [loose, spot.room, pileAt, task?.expected, askerId, ready])
  const run = useRequestTask(errand, spec)
  const preList = useMemo(() => (task && task.pre > 0 ? Array.from({ length: task.pre }, () => ({ zone: FRAME_ZONE, def: pre })) : NO_PRE), [task, pre])
  usePreplaced(preList, ready, `${errand.item.id}|${pre}`)
  useSpreadPile({ def: loose, room: spot.room, area, stage, active: ready, refresh: `${errand.item.id}|${errand.tries}|${errand.phase}|${run.expected ?? ''}` })

  const caption = places ? (run.count === 0 ? `Agafa-ho ${ofPlace(places.source)} i posa-ho ${toPlace(places.frame)}.` : 'Quan estigui a punt, dóna-ho.') : undefined
  const leave = (): void => {
    if (errand.phase === 'thanks' || errand.phase === 'shown') errand.next()
    onClose(errand.phase === 'thanks')
  }
  return (
    <HandsCard
      errand={errand}
      place="la Casa"
      who={who}
      caption={task ? caption : undefined}
      serve={task ? { label: `Dóna-ho ${toPlace(who)}`, ready: run.state === 'counting', onServe: () => void run.submit() } : undefined}
      onClose={() => (errand.phase === 'asking' ? onClose(false) : leave())}
      dockClass={spot.room === 'golfes' ? DOCK_BOTTOM : DOCK_TOP}
    >
      {!task && <SheetTask errand={errand} />}
    </HandsCard>
  )
}
