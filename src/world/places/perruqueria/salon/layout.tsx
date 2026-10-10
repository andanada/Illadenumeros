import type { InteractableDef } from '../../../sandbox/defs'
import type { StartItem } from '../../../sandbox/ItemsContext'
import type { Block } from '../../../sandbox/logic/walkPlan'
import type { DoorDef, SeatDef, SurfaceDef } from '../../../sandbox/types'
import { TOOL_NAMES, TOOLS, type Tool } from '../styling/styleLogic'
import { Contact } from '../../../sandbox/art/foodArt'
import { ToolArt } from './ToolArt'

export const ROOM = 'saló'
export const STREET = 'fora'
export const FLOOR_TOP = 0.46

export const STREET_DOOR: DoorDef = { id: 'porta-fora', label: 'Porta del carrer', at: { x: 0.05, y: 0.6 }, to: STREET, arrive: { x: 0.5, y: 0.7 }, box: { w: 0.09, h: 0.36 } }

export const BLOCKS: readonly Block[] = [
  { x: 0.09, y: 0.5, w: 0.16, h: 0.14 },
  { x: 0.7, y: 0.52, w: 0.3, h: 0.12 },
]

/** The chairs a customer can be restyled in, with the spot where a tool is put down for them. */
export interface Station {
  readonly seat: string
  readonly spot: string
  readonly label: string
  readonly at: { x: number; y: number }
}

export const STATIONS: readonly Station[] = [
  { seat: 'cadira-1', spot: 'eina-cadira-1', label: 'la cadira 1', at: { x: 0.36, y: 0.76 } },
  { seat: 'cadira-2', spot: 'eina-cadira-2', label: 'la cadira 2', at: { x: 0.64, y: 0.76 } },
  { seat: 'rentapaus', spot: 'eina-rentapaus', label: 'el rentacaps', at: { x: 0.17, y: 0.74 } },
]

export const SEATS: readonly SeatDef[] = [
  { id: 'cadira-1', label: 'la cadira 1', at: { x: 0.36, y: 0.72 }, facing: 1 },
  { id: 'cadira-2', label: 'la cadira 2', at: { x: 0.64, y: 0.72 }, facing: -1 },
  { id: 'rentapaus', label: 'el rentacaps', at: { x: 0.17, y: 0.7 }, facing: 1 },
  { id: 'sofa-1', label: 'el sofà d’espera (esquerra)', at: { x: 0.78, y: 0.67 }, facing: -1 },
  { id: 'sofa-2', label: 'el sofà d’espera (dreta)', at: { x: 0.91, y: 0.67 }, facing: -1 },
]

/** Seats for people waiting, then the chairs. */
export const WAITING = ['sofa-1', 'sofa-2'] as const

export const SURFACES: readonly SurfaceDef[] = STATIONS.map((s) => ({ id: s.spot, label: s.label, at: s.at, stand: { x: s.at.x, y: 0.86 } }))

const TOOL_HEIGHT = 0.11

/** One def per tool: pick it up, carry it, put it down on a chair. */
export const TOOL_DEFS: readonly InteractableDef[] = TOOLS.map((tool: Tool) => ({
  id: tool,
  label: TOOL_NAMES[tool],
  height: TOOL_HEIGHT,
  pickup: true,
  tool,
  art: () => (
    <g>
      <Contact rx={34} />
      <g transform="translate(8 4)">
        <ToolArt tool={tool} size={84} />
      </g>
    </g>
  ),
}))

export const TOOL_START: readonly StartItem[] = TOOLS.map((tool, i) => ({ uid: `eina-${tool}`, def: tool, room: ROOM, at: { x: 0.26 + i * 0.09, y: 0.92 } }))
