/** The bus drawing's own coordinates (a 1000 × 400 box): windows are two ten-frames, one each side of the door. */
export const W = 1000
export const H = 400
export const CELL = { w: 66, h: 88, step: 74 }
export const FRAME_X = [52, 512] as const
export const ROW_Y = [62, 172] as const
export const DOOR = { x: 432, w: 70 }
export const pct = (v: number, of: number): string => `${(v / of) * 100}%`
