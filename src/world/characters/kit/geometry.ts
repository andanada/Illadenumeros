import type { ReactNode } from 'react'
import type { Swatch } from '../../art/palette'
import { blobPath } from '../../art/paths'

/**
 * Body plan of every person in the town (avatar and neighbours), in a 200 × 300 viewBox.
 * Cheeky big-head proportions: the head is ~40 % of the height and wider than the body.
 * Ground line at y = 288; the figure is anchored bottom-centre (100, 288).
 */
export const VIEW_W = 200
export const VIEW_H = 300
export const GROUND_Y = 288

export const HEAD = { cx: 100, cy: 96, rx: 62, ry: 56 } as const
export const EYES_Y = 104
export const EYE_L = 76
export const EYE_R = 124
export const MOUTH_Y = 128

export type Pose = 'idle' | 'wave' | 'cheer' | 'hold' | 'sit'
export const POSES: readonly Pose[] = ['idle', 'wave', 'cheer', 'hold', 'sit']

/** Leg/torso layout; `sit` folds the legs and lowers the upper body. */
export interface Geometry {
  /** Vertical offset applied to head, torso and arms. */
  lift: number
  shoulderY: number
  hipY: number
  footY: number
  legL: number
  legR: number
  legW: number
  /** Torso trapezoid. */
  torsoTop: number
  torsoBottom: number
}

const STANDING: Geometry = {
  lift: 0,
  shoulderY: 164,
  hipY: 216,
  footY: 274,
  legL: 87,
  legR: 113,
  legW: 21,
  torsoTop: 150,
  torsoBottom: 224,
}

const SITTING: Geometry = {
  ...STANDING,
  lift: 30,
  hipY: 248,
  footY: 278,
  legL: 80,
  legR: 120,
}

export const geometryFor = (pose: Pose): Geometry => (pose === 'sit' ? SITTING : STANDING)

/** Shoulder pivots (before `lift`). */
export const SHOULDER_L = { x: 72, y: 164 } as const
export const SHOULDER_R = { x: 128, y: 164 } as const
export const ARM_LEN = 52
export const ARM_W = 17

/** Arm rotations in degrees (SVG, clockwise). Left arm swings out with +, right arm with −. */
export const ARM_ANGLES: Readonly<Record<Pose, { l: number; r: number }>> = {
  idle: { l: 14, r: -14 },
  wave: { l: 14, r: -118 },
  cheer: { l: 122, r: -122 },
  hold: { l: 14, r: -58 },
  sit: { l: 26, r: -26 },
}

/** Torso outline, a soft trapezoid slightly wider at the hips. */
export function torsoPath(g: Geometry, flare = 0): string {
  const t = g.torsoTop + g.lift
  const b = g.torsoBottom + g.lift + flare * 0.4
  const wTop = 30
  const wBot = 33 + flare
  return `M${100 - wTop} ${t + 12} Q${100 - wTop} ${t} ${100 - wTop + 12} ${t} L${100 + wTop - 12} ${t} Q${100 + wTop} ${t} ${100 + wTop} ${t + 12} L${100 + wBot} ${b - 8} Q${100 + wBot + 1} ${b} ${100 + wBot - 9} ${b} L${100 - wBot + 9} ${b} Q${100 - wBot - 1} ${b} ${100 - wBot} ${b - 8} Z`
}

/** What every wearable/part renderer receives. */
export interface PartCtx {
  /** The part's own swatch (recoloured). */
  c: Swatch
  skin: Swatch
  g: Geometry
  /** Unique prefix for clipPath ids inside this avatar instance. */
  uid: string
}

export type Sleeve = 'none' | 'short' | 'long'

export interface TopDef {
  id: string
  name: string
  sleeve: Sleeve
  /** Drawn behind the head (hoods, collars at the back). */
  back?: (ctx: PartCtx) => ReactNode
  body: (ctx: PartCtx) => ReactNode
  /** Covers the legs (dresses): the bottom is drawn under it. */
  long?: boolean
}

export interface BottomDef {
  id: string
  name: string
  /** Full-length (trousers, leggings). */
  long?: boolean
  /** Legs part (behind the torso). */
  legs: (ctx: PartCtx) => ReactNode
  /** Drawn over the top garment (overall bibs). */
  over?: (ctx: PartCtx) => ReactNode
}

export interface ShoeDef {
  id: string
  name: string
  /** One foot centred on (x, y = sole line); `side` -1 left, 1 right. */
  foot: (ctx: PartCtx, x: number, y: number, side: -1 | 1) => ReactNode
}

export interface HairDef {
  id: string
  name: string
  back?: (ctx: PartCtx) => ReactNode
  front: (ctx: PartCtx) => ReactNode
}

export interface AccessoryDef {
  id: string
  name: string
  back?: (ctx: PartCtx) => ReactNode
  front: (ctx: PartCtx) => ReactNode
}

/** Where the eyes look, each axis -1..1 (x right, y down). */
export interface Look {
  x: number
  y: number
}

export interface FaceCtx {
  look: Look
  blink: boolean
}

export interface FaceDef {
  id: string
  name: string
  render: (ctx: FaceCtx) => ReactNode
}

/** Build a lookup from a list, failing loudly on duplicate ids (caught by tests). */
export function byId<T extends { id: string }>(list: readonly T[]): Readonly<Record<string, T>> {
  return list.reduce<Record<string, T>>((acc, item) => {
    if (acc[item.id]) throw new Error(`Duplicate part id ${item.id}`)
    return { ...acc, [item.id]: item }
  }, {})
}

export type AvatarCrop = 'head' | 'face' | 'top' | 'bottom' | 'feet'

/** Crop windows in avatar units [x, y, w, h] (stature 1). */
export const AVATAR_CROPS: Readonly<Record<AvatarCrop, readonly [number, number, number, number]>> = {
  head: [14, -16, 172, 176],
  face: [36, 62, 128, 84],
  top: [30, 148, 140, 96],
  bottom: [34, 196, 132, 100],
  feet: [50, 246, 100, 50],
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

/** Gaze from an element's box towards a page point, e.g. the pointer. */
export function lookToward(box: { left: number; top: number; width: number; height: number }, point: { x: number; y: number }): Look {
  const cx = box.left + box.width / 2
  const cy = box.top + box.height * 0.32
  const reach = Math.max(80, box.width * 1.5)
  return { x: clamp((point.x - cx) / reach), y: clamp((point.y - cy) / reach) }
}

/** The head is a very slightly lumpy ellipse: computed once, shared by every person. */
export const HEAD_PATH = blobPath({ cx: HEAD.cx, cy: HEAD.cy, rx: HEAD.rx, ry: HEAD.ry, points: 8, wobble: 0.025, seed: 'cap' })
