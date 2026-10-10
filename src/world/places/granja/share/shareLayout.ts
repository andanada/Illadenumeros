import type { ZoneDef } from '../../../sandbox/zoneTypes'
import type { ShareTask } from './shareLogic'

/** Who eats from each bowl (the farm's pets), in order. */
const EATERS = ['la Nyx', 'la Melo', 'en Blau', 'la Núvol', 'la Mixa', 'la gallina Pigmenta', 'el porquet Rosat', 'la vaca Taca'] as const

export const bowlName = (i: number): string => `el bol de ${EATERS[i % EATERS.length] ?? 'algú'}`
export const cartonName = (i: number): string => `la caixa d’ous ${i + 1}`
export const BOWL_IDS = (n: number): string[] => Array.from({ length: n }, (_, i) => `bol-${i + 1}`)

/** Where the loose things are heaped for her to carry. */
export const PILE_AT = { x: 0.15, y: 0.78 } as const

const AREA = { x: 0.3, y: 0.62, w: 0.68, h: 0.34 } as const
const CELL = { w: 0.042, h: 0.062 } as const
const GAP = 0.012
const PAD = 0.016

/** How many slots a bowl has: the quotient plus one for a slip; a carton holds exactly its size. */
const capacityOf = (t: ShareTask): number => (t.mode === 'groups' ? t.size : Math.floor(t.total / t.size) + 1)

/** One zone per bowl or carton, in neat rows inside the garden's soil. Pure. */
export function shareZones(task: ShareTask, room: string): ZoneDef[] {
  const capacity = capacityOf(task)
  const cols = Math.min(capacity, task.mode === 'groups' ? 5 : 3)
  const rows = Math.ceil(capacity / cols)
  const w = cols * CELL.w + PAD
  const h = rows * CELL.h + PAD
  const perRow = Math.max(1, Math.floor((AREA.w + GAP) / (w + GAP)))
  const used = Math.min(perRow, task.parts)
  const x0 = AREA.x + (AREA.w - (used * w + (used - 1) * GAP)) / 2
  const lines = Math.ceil(task.parts / perRow)
  const y0 = Math.min(AREA.y + AREA.h - lines * h - (lines - 1) * GAP, AREA.y + (AREA.h - lines * h) / 2 + 0.04)
  return Array.from({ length: task.parts }, (_, i) => ({
    id: `bol-${i + 1}`,
    room,
    rect: { x: x0 + (i % perRow) * (w + GAP), y: y0 + Math.floor(i / perRow) * (h + GAP), w, h },
    label: task.mode === 'groups' ? cartonName(i) : bowlName(i),
    capacity,
    cols,
    accepts: (def: string) => def === 'gra' || def === 'ou-peticio',
    announceCount: true,
  }))
}
