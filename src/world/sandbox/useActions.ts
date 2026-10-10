import type { Dispatch } from 'react'
import type { CastApi } from './CastContext'
import type { DefMap } from './defs'
import { emoteSound, fx } from './fx'
import { clearSpot } from './logic/clearSpot'
import { type EmoteKind, type Pt } from './logic/actorMachine'
import { giveReaction } from './logic/give'
import { itemsHeldBy, itemsIn, type Items, type ItemsAction } from './logic/itemsState'
import { resolveItemTap, type TapPlan } from './logic/resolveTap'
import { meetingSpot, SOCIAL_LABEL, socialEmotes, type SocialKind } from './logic/social'
import { tapSurprise } from './logic/surprise'
import { launch, type Ball, type TossBounds } from './logic/toss'
import { applyTool } from './logic/useChain'
import { toPlace } from './logic/catalan'
import type { DoorDef, SeatDef, SurfaceDef } from './types'

export interface ActionDeps {
  cast: CastApi
  items: Items
  defs: DefMap
  defaultRoom: string
  floorTop: number
  dispatch: Dispatch<ItemsAction>
  launchFlight: (uid: string, ball: Ball, room: string, bounds: TossBounds) => void
  onEnter?: ((door: DoorDef, actorId: string) => void) | undefined
  ripple: (at: Pt) => void
}

const REACH = 0.09

/** Where a thing lies (things inside a box are where the box is). */
export function whereIs(items: Items, uid: string): Pt | undefined {
  const it = items[uid]
  if (!it) return undefined
  if (it.loc.t === 'floor') return it.loc.at
  if (it.loc.t === 'in') return whereIs(items, it.loc.box)
  return undefined
}

const cap = (t: string): string => (t.length === 0 ? t : `${t[0]?.toUpperCase() ?? ''}${t.slice(1)}`)
const clampX = (x: number): number => Math.min(0.96, Math.max(0.04, x))
/** Spot beside a point, on the side the actor comes from. */
const beside = (from: Pt, to: Pt): Pt => ({ x: clampX(to.x + (from.x <= to.x ? -REACH : REACH)), y: Math.max(0.1, to.y - 0.02) })

/**
 * Everything a tap can mean. `get` returns the freshest dependencies: walks take time, so the callbacks
 * that run on arrival must never use a stale snapshot of the items or the cast.
 */
export function makeActions(get: () => ActionDeps) {
  const labelOf = (uid: string): string => {
    const d = get()
    return d.defs[d.items[uid]?.def ?? '']?.label ?? 'això'
  }
  const nameOf = (id: string): string => get().cast.seeds[id]?.name ?? 'algú'
  const sel = (): string => get().cast.state.selected
  const roomOf = (id: string): string => get().cast.state.actors[id]?.room ?? get().defaultRoom
  const say = (text: string): void => get().cast.announce(text)
  const floorBounds = (y: number): TossBounds => ({ floor: Math.min(0.97, Math.max(get().floorTop + 0.03, y + 0.02)), minX: 0.04, maxX: 0.96 })

  const approach = (who: string, to: Pt, then: () => void): void => {
    const { cast } = get()
    const from = cast.positionOf(who)
    const spot = beside(from, to)
    cast.walkTo(who, spot, () => {
      get().cast.face(who, to)
      then()
    })
  }

  function dropHeld(at?: Pt): void {
    const d = get()
    const who = d.cast.state.selected
    const mine = itemsHeldBy(d.items, who)[0]
    const me = d.cast.state.actors[who]
    if (!mine || !me) return
    const lying = Object.values(d.items).flatMap((i) => (i.loc.t === 'floor' && i.loc.room === roomOf(who) && i.uid !== mine.uid ? [i.loc.at] : []))
    const spot = at ?? clearSpot(lying, { x: me.at.x + me.facing * 0.08, y: me.at.y + 0.02 }, d.cast.snap)
    d.dispatch({ type: 'drop', uid: mine.uid, room: roomOf(who), at: spot })
    d.cast.setCarrying(who, undefined)
    fx.put()
    say(`Has deixat ${labelOf(mine.uid)}.`)
  }

  const run = (plan: TapPlan, who: string): void => {
    const d = get()
    const item = d.items[plan.uid]
    const def = d.defs[item?.def ?? '']
    const label = labelOf(plan.uid)
    switch (plan.kind) {
      case 'pickup':
        d.dispatch({ type: 'pick', uid: plan.uid, by: who })
        d.cast.setCarrying(who, plan.uid)
        fx.pick()
        say(`Has agafat ${label}.`)
        break
      case 'toggle': {
        d.dispatch({ type: 'toggle', uid: plan.uid })
        if (item?.open) {
          fx.close()
          say(`Has tancat ${label}.`)
        } else {
          fx.open()
          const inside = itemsIn(d.items, plan.uid).map((i) => labelOf(i.uid))
          say(inside.length > 0 ? `Has obert ${label}. Hi ha ${inside.join(', ')}.` : `Has obert ${label}. És buit.`)
        }
        break
      }
      case 'putin':
        d.dispatch({ type: 'stash', uid: plan.held, box: plan.uid })
        d.cast.setCarrying(who, undefined)
        fx.put()
        say(`Has guardat ${labelOf(plan.held)} dins ${label}.`)
        break
      case 'apply': {
        if (!item || !def?.use) break
        const result = applyTool(def.use, item.chain, plan.tool)
        if (!result.ok) break
        d.dispatch({ type: 'chain', uid: plan.uid, state: result.state })
        say(result.stage.said)
        if (result.done) {
          fx.done()
          d.cast.emote(who, 'riure')
        } else fx.step()
        break
      }
      case 'hint': {
        const tool = Object.values(d.defs).find((x) => x.tool === plan.needs)
        d.dispatch({ type: 'poke', uid: plan.uid })
        fx.squish()
        say(tool ? `Prova-ho amb ${tool.label}.` : 'Encara no sé què fer-ne.')
        break
      }
      case 'surprise': {
        if (!item || !def) break
        const config = { seed: `sorpresa-${plan.uid}`, taps: def.surpriseTaps ?? 3, options: def.surpriseOptions ?? ['estrella'] }
        const next = tapSurprise(config, item.surprise)
        d.dispatch({ type: 'surprise', uid: plan.uid, state: next })
        if (next.revealed !== undefined) {
          fx.done()
          d.cast.emote(who, 'uau')
          say(`Sorpresa! Hi havia ${next.revealed}.`)
        } else {
          fx.squish()
          say(`${cap(label)} es mou. Una altra!`)
        }
        break
      }
      case 'poke':
        d.dispatch({ type: 'poke', uid: plan.uid })
        fx.squish()
        break
      case 'putdown':
        dropHeld()
        break
      case 'reject':
        break
    }
  }

  const tapItem = (uid: string): void => {
    fx.unlock()
    const d = get()
    const who = d.cast.state.selected
    const plan = resolveItemTap(d.items, d.defs, who, uid)
    if (plan.kind === 'reject') {
      if (plan.why === 'closed') {
        fx.no()
        say('Primer obre’l.')
      }
      return
    }
    if (plan.kind === 'putdown') return dropHeld()
    const at = whereIs(d.items, uid)
    if (!at) return
    approach(who, at, () => {
      // The world may have changed while walking: decide again at the door of the thing.
      const fresh = resolveItemTap(get().items, get().defs, who, uid)
      run(fresh.kind === 'reject' ? plan : fresh, who)
    })
  }

  const tossHeld = (): void => {
    const d = get()
    const who = d.cast.state.selected
    const mine = itemsHeldBy(d.items, who)[0]
    const me = d.cast.state.actors[who]
    if (!mine || !me) return
    if (!d.defs[mine.def]?.toss) {
      fx.no()
      say(`${cap(labelOf(mine.uid))} no es pot llançar.`)
      return
    }
    d.dispatch({ type: 'drop', uid: mine.uid, room: roomOf(who), at: me.at })
    d.cast.setCarrying(who, undefined)
    fx.whoosh()
    say(`Has llançat ${labelOf(mine.uid)}!`)
    d.launchFlight(mine.uid, launch({ x: me.at.x, y: me.at.y - 0.14 }, { vx: me.facing * 0.75, vy: -1.1 }), roomOf(who), floorBounds(me.at.y))
  }

  /** A flick on a floor item (pointer velocity in scene fractions per second). */
  const flick = (uid: string, vx: number, vy: number): void => {
    const d = get()
    const at = whereIs(d.items, uid)
    const item = d.items[uid]
    if (!at || !item || !d.defs[item.def]?.toss) return
    fx.whoosh()
    d.launchFlight(uid, launch(at, { vx, vy }), roomOf(d.cast.state.selected), floorBounds(at.y))
    say(`Has llançat ${labelOf(uid)}!`)
  }

  const tapFloor = (pt: Pt): void => {
    fx.unlock()
    const d = get()
    d.ripple(pt)
    d.cast.setSocial(undefined)
    d.cast.walkTo(d.cast.state.selected, pt)
  }

  const finishGive = (giver: string, receiver: string, uid: string): void => {
    const d = get()
    const seed = d.cast.seeds[receiver]
    const def = d.items[uid]?.def ?? ''
    d.dispatch({ type: 'hand', uid, to: receiver })
    d.cast.setCarrying(giver, undefined)
    d.cast.setCarrying(receiver, uid)
    d.cast.face(receiver, d.cast.positionOf(giver))
    const reaction = giveReaction({ who: nameOf(receiver), item: labelOf(uid), itemId: def, ...(seed?.loves ? { loves: seed.loves } : {}) })
    d.cast.emote(receiver, reaction.emote)
    emoteSound(reaction.emote)
    say(reaction.said)
  }

  const giveTo = (receiver: string): void => {
    const d = get()
    const giver = d.cast.state.selected
    const mine = itemsHeldBy(d.items, giver)[0]
    if (!mine) return
    if (itemsHeldBy(d.items, receiver).length > 0) {
      fx.no()
      say(`${cap(nameOf(receiver))} ja porta alguna cosa.`)
      return
    }
    approach(giver, d.cast.positionOf(receiver), () => finishGive(giver, receiver, mine.uid))
  }

  const finishMeet = (a: string, b: string, kind: SocialKind): void => {
    const { cast } = get()
    const emotes = socialEmotes(kind)
    cast.face(a, cast.positionOf(b))
    cast.face(b, cast.positionOf(a))
    cast.emote(a, emotes.actor)
    cast.emote(b, emotes.other)
    emoteSound(emotes.actor)
    say(`${cap(nameOf(a))} ${SOCIAL_LABEL[kind].verb} ${nameOf(b)}.`)
  }

  const meet = (partner: string, kind: SocialKind): void => {
    const { cast } = get()
    const who = cast.state.selected
    cast.setSocial(undefined)
    cast.walkTo(who, meetingSpot(cast.positionOf(who), cast.positionOf(partner)), () => finishMeet(who, partner, kind))
  }

  const selectActor = (id: string): void => {
    fx.unlock()
    get().cast.select(id)
    fx.step()
    say(`Ara mous ${nameOf(id)}.`)
  }

  const tapActor = (id: string): void => {
    fx.unlock()
    const d = get()
    const who = d.cast.state.selected
    if (id === who) return
    const social = d.cast.state.social
    if (social) return meet(id, social)
    if (itemsHeldBy(d.items, who).length > 0 && roomOf(id) === roomOf(who)) return giveTo(id)
    selectActor(id)
  }

  const tapSeat = (seat: SeatDef): void => {
    fx.unlock()
    const d = get()
    const who = d.cast.state.selected
    const taken = Object.entries(d.cast.state.actors).find(([id, a]) => a.seat === seat.id && id !== who)
    if (taken) {
      fx.no()
      say(`${cap(seat.label)} ja està ocupat per ${nameOf(taken[0])}.`)
      return
    }
    d.cast.walkTo(who, seat.at, () => {
      get().cast.sit(who, seat.id, seat.at, seat.facing)
      fx.put()
      say(`${cap(nameOf(who))} s’ha assegut ${toPlace(seat.label)}.`)
    })
  }

  const stand = (): void => {
    const who = sel()
    get().cast.stand(who)
    fx.step()
    say(`${cap(nameOf(who))} s’ha aixecat.`)
  }

  const tapDoor = (door: DoorDef): void => {
    fx.unlock()
    const d = get()
    const who = d.cast.state.selected
    d.cast.walkTo(who, door.at, () => {
      fx.door()
      get().cast.enterRoom(who, door.to, door.arrive)
      say(`${cap(nameOf(who))} ha passat per ${door.label}.`)
      get().onEnter?.(door, who)
    })
  }

  const tapSurface = (surface: SurfaceDef): void => {
    fx.unlock()
    const d = get()
    const who = d.cast.state.selected
    if (itemsHeldBy(d.items, who).length === 0) return
    d.cast.walkTo(who, surface.stand, () => {
      const held = itemsHeldBy(get().items, who)[0]
      dropHeld(surface.at)
      if (held) say(`Has posat ${labelOf(held.uid)} ${toPlace(surface.label)}.`)
    })
  }

  const emoteSelected = (kind: EmoteKind): void => {
    fx.unlock()
    const who = sel()
    get().cast.emote(who, kind)
    emoteSound(kind)
  }

  const startSocial = (kind: SocialKind): void => {
    fx.unlock()
    get().cast.setSocial(kind)
    say(`Toca qui vols que ${SOCIAL_LABEL[kind].verb}.`)
  }

  return { tapItem, tapFloor, tapActor, selectActor, tapSeat, stand, tapDoor, tapSurface, dropHeld: () => dropHeld(), tossHeld, flick, emoteSelected, startSocial, roomOf }
}

export type Actions = ReturnType<typeof makeActions>
