import type { Rect } from '../../../sandbox/logic/zones'

export interface StageBox {
  /** Stage size in px. */
  readonly w: number
  readonly h: number
}

export interface ZoneLayout {
  readonly rect: Rect
  readonly cols: number
  readonly capacity: number
  /** Cell size in px (the size objects are drawn at inside the frame). */
  readonly cellPx: number
}

export interface ArrayShape {
  readonly rows: number
  readonly cols: number
  /** Spare rows below the array: the child has to stop at `rows` (0 = the frame is exactly the array). */
  readonly extraRows: number
}

export const MAX_ROWS = 10
const MIN_CELL = 26
const MAX_CELL = 54
const BOTTOM = 0.95
/** The strip of the floor the frames use; the pile of things to carry lies to the left of it. */
export const FRAME_AREA = { x0: 0.3, x1: 0.99 } as const
const centre = FRAME_AREA.x0 + (FRAME_AREA.x1 - FRAME_AREA.x0) / 2
const span = FRAME_AREA.x1 - FRAME_AREA.x0

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** The frame of an array of `rows` rows of `cols`, as big as the stage allows, centred and resting on the floor. */
export function arrayLayout(shape: ArrayShape, stage: StageBox, floorTop: number): ZoneLayout {
  const rows = clamp(Math.floor(shape.rows) + Math.max(0, Math.floor(shape.extraRows)), 1, MAX_ROWS)
  const cols = Math.max(1, Math.floor(shape.cols))
  const top = floorTop + 0.08
  const availH = (BOTTOM - top) * stage.h
  const cellPx = clamp(Math.min((stage.w * span * 0.96) / cols, availH / rows), MIN_CELL, MAX_CELL)
  const w = Math.min(0.96, (cols * cellPx) / stage.w)
  const h = Math.min(BOTTOM - top, (rows * cellPx) / stage.h)
  return { rect: { x: centre - w / 2, y: BOTTOM - h, w, h }, cols, capacity: rows * cols, cellPx }
}

/** `groups` frames (plates, trays, tables) of `each` slots, in one or two rows across the stage. */
export function groupLayouts(groups: number, each: number, stage: StageBox, floorTop: number): readonly ZoneLayout[] {
  const n = Math.max(1, Math.floor(groups))
  const perRow = n <= 5 ? n : Math.ceil(n / 2)
  const lines = Math.ceil(n / perRow)
  const cols = each <= 4 ? 2 : 3
  const rowsInside = Math.ceil(each / cols)
  const gap = 0.025
  const w = Math.min(0.2, (span * 0.96 - gap * (perRow - 1)) / perRow)
  const cellPx = clamp((w * stage.w) / cols, MIN_CELL, MAX_CELL)
  const h = Math.min(0.2, (rowsInside * cellPx) / stage.h + 0.02)
  const top = floorTop + 0.06
  const lineGap = lines > 1 ? Math.min(0.06, (BOTTOM - top - h * lines) / lines) : 0
  return Array.from({ length: n }, (_, i) => {
    const line = Math.floor(i / perRow)
    const inLine = Math.min(perRow, n - line * perRow)
    const x0 = centre - (inLine * w + gap * (inLine - 1)) / 2
    const x = x0 + (i % perRow) * (w + gap)
    const y = BOTTOM - h - (lines - 1 - line) * (h + lineGap)
    return { rect: { x, y, w, h }, cols, capacity: each, cellPx }
  })
}

/** A drawing placed on the stage like `Piece` (feet at x, y; `h` × the stage unit tall). */
export interface PiecePlace {
  readonly x: number
  readonly y: number
  readonly h: number
  readonly ratio: number
}

/** Part of a piece's box, as fractions of that box (may start above it: things stand ON a counter). */
export interface Inner {
  readonly fx: number
  readonly fy: number
  readonly fw: number
  readonly fh: number
}

/** The rectangle (fractions of the stage) that covers `inner` of a piece, so a counting zone sits exactly on its drawing. */
export function pieceRect(piece: PiecePlace, inner: Inner, stage: StageBox): Rect {
  const unit = Math.min(stage.h, stage.w * 0.9)
  const ph = piece.h * unit
  const pw = ph * piece.ratio
  const left = piece.x * stage.w - pw / 2
  const top = piece.y * stage.h - ph
  return { x: (left + inner.fx * pw) / stage.w, y: (top + inner.fy * ph) / stage.h, w: (inner.fw * pw) / stage.w, h: (inner.fh * ph) / stage.h }
}
