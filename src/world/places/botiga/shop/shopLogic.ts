import type { Items } from '../../../sandbox/logic/itemsState'
import type { Pt } from '../../../sandbox/logic/actorMachine'
import { formatEuros } from '../../../../ui/visual/moneyLogic'
import { productById } from '../products'

/** Grams one piece weighs on the scale (the number the child sees). */
export const GRAMS: Readonly<Record<string, number>> = { poma: 150, platan: 120, taronja: 180, croissant: 70, llet: 1000, 'barra-pa': 250 }

/** Shop objects that are products (def id = product id). */
export const isProduct = (def: string): boolean => GRAMS[def] !== undefined

const near = (a: Pt, b: Pt, r: number): boolean => Math.abs(a.x - b.x) <= r && Math.abs(a.y - b.y) <= r * 0.8

/** Uids of the products lying in `room` around `at` (a slot, the scale, the till). Sorted for stable output. */
export function productsAt(items: Items, room: string, at: Pt, radius = 0.045): string[] {
  return Object.values(items)
    .filter((i) => i.loc.t === 'floor' && i.loc.room === room && isProduct(i.def) && near(i.loc.at, at, radius))
    .map((i) => i.uid)
    .sort()
}

export interface Reading {
  readonly count: number
  readonly grams: number
}

/** What the scale shows for the products on it. */
export function scaleReading(items: Items, room: string, at: Pt): Reading {
  const uids = productsAt(items, room, at, 0.07)
  return { count: uids.length, grams: uids.reduce((sum, uid) => sum + (GRAMS[items[uid]?.def ?? ''] ?? 0), 0) }
}

export const gramsLabel = (grams: number): string => (grams >= 1000 ? `${(grams / 1000).toString().replace('.', ',')} kg` : `${grams} g`)

export interface Scan {
  readonly uids: readonly string[]
  readonly cents: number
}

/** What is rung up on the till: products lying on it and their total. */
export function tillScan(items: Items, room: string, at: Pt): Scan {
  const uids = productsAt(items, room, at, 0.07)
  return { uids, cents: uids.reduce((sum, uid) => sum + (productById(items[uid]?.def ?? '')?.price ?? 0), 0) }
}

export const totalLabel = (cents: number): string => formatEuros(cents)

/** Products that appeared on a spot since the last look (they make it beep). */
export const arrivals = (before: readonly string[], now: readonly string[]): string[] => now.filter((u) => !before.includes(u))

export interface SlotDef {
  readonly id: string
  readonly at: Pt
}

/** Slots (shelf places) with a product on them. */
export function filledSlots(items: Items, room: string, slots: readonly SlotDef[]): string[] {
  return slots.filter((s) => productsAt(items, room, s.at, 0.02).length > 0).map((s) => s.id)
}
