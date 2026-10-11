import type { InteractableDef } from '../../sandbox/defs'
import type { StartItem } from '../../sandbox/ItemsContext'
import { depthScale } from '../../sandbox/StageContext'

/**
 * Where a free object's touch area lies on screen, from the same numbers the sandbox's Interactable uses
 * (a box at least 44 px, bottom-centred on its floor spot). Lets a place prove, without a browser, that nobody can tap
 * the wrong thing because two objects lie on top of each other.
 */
export interface StageBox {
  readonly name: string
  readonly w: number
  readonly h: number
}

/** The stage of a place at the three screens it is tested on (the place leaves 84 px for the HUD; portrait also leaves 88 px below). */
export const STAGE_BOXES: readonly StageBox[] = [
  { name: 'phone 390×844', w: 390, h: Math.min(844 - 84 - 88, 1.5 * 390) },
  { name: 'iPad 1024×768', w: 1024, h: 768 - 84 },
  { name: 'desktop 1180×820', w: 1180, h: 820 - 84 },
]

const MIN_HIT = 44

export interface HitRect {
  readonly uid: string
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

export function hitRect(item: StartItem, def: InteractableDef, stage: StageBox, floorTop: number): HitRect {
  const unit = Math.min(stage.h, stage.w * 0.9)
  const size = def.height * unit * depthScale(item.at.y, floorTop)
  const w = Math.max(def.minHit ?? MIN_HIT, size * (def.aspect ?? 1))
  const h = Math.max(def.minHit ?? MIN_HIT, size)
  const px = item.at.x * stage.w
  const py = item.at.y * stage.h
  return { uid: item.uid, x0: px - w / 2, x1: px + w / 2, y0: py - h, y1: py }
}

const overlap = (a: HitRect, b: HitRect): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/** Pairs of free objects (per room) whose touch areas overlap on this stage. Containers' contents are not on the floor, so they are left out. */
export function overlappingPairs(items: readonly StartItem[], defs: readonly InteractableDef[], stage: StageBox, floorTop: number): string[] {
  const byId = new Map(defs.map((d) => [d.id, d]))
  const free = items.filter((i) => !i.inside)
  const out: string[] = []
  for (const [i, a] of free.entries()) {
    for (const b of free.slice(i + 1)) {
      if (a.room !== b.room) continue
      const da = byId.get(a.def)
      const db = byId.get(b.def)
      if (da && db && overlap(hitRect(a, da, stage, floorTop), hitRect(b, db, stage, floorTop))) out.push(`${a.uid} × ${b.uid} (${stage.name})`)
    }
  }
  return out
}
