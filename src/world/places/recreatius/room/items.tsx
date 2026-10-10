import { BallArt } from '../../../sandbox/art/foodArt'
import type { InteractableDef } from '../../../sandbox/defs'
import type { StartItem } from '../../../sandbox/ItemsContext'
import { PropGlyph, PuckArt, TrayArt } from './itemArt'

export const ARCADE_ROOM = 'sala'
/** The prizes of the claw machine, waiting in its tray. */
export const PRIZE_UIDS = ['premi-osset', 'premi-cotxet', 'premi-vareta'] as const
export const TRAY_UID = 'safata'

/** The things of the arcade you can pick up: pucks to toss on the air-hockey table, a ball, the claw prizes in their tray. */
export const ARCADE_DEFS: readonly InteractableDef[] = [
  { id: 'disc', label: 'el disc', height: 0.07, pickup: true, toss: true, art: () => <PuckArt /> },
  { id: 'pilota', label: 'la pilota', height: 0.11, pickup: true, toss: true, art: () => <BallArt /> },
  { id: 'safata', label: 'la safata de premis', aspect: 1.5, height: 0.12, container: true, art: (s) => <TrayArt open={s.open} /> },
  { id: 'premi-osset', label: 'l’osset de peluix', height: 0.12, pickup: true, art: () => <PropGlyph id="osset" /> },
  { id: 'premi-cotxet', label: 'el cotxet de joguina', height: 0.1, pickup: true, art: () => <PropGlyph id="cotxet" /> },
  { id: 'premi-vareta', label: 'la vareta màgica', height: 0.12, pickup: true, art: () => <PropGlyph id="vareta-magica" /> },
]

export const ARCADE_ITEMS: readonly StartItem[] = [
  { uid: TRAY_UID, def: 'safata', room: ARCADE_ROOM, at: { x: 0.25, y: 0.85 } },
  { uid: 'premi-osset', def: 'premi-osset', room: ARCADE_ROOM, at: { x: 0, y: 0 }, inside: TRAY_UID },
  { uid: 'premi-cotxet', def: 'premi-cotxet', room: ARCADE_ROOM, at: { x: 0, y: 0 }, inside: TRAY_UID },
  { uid: 'premi-vareta', def: 'premi-vareta', room: ARCADE_ROOM, at: { x: 0, y: 0 }, inside: TRAY_UID },
  { uid: 'disc-1', def: 'disc', room: ARCADE_ROOM, at: { x: 0.56, y: 0.88 } },
  { uid: 'disc-2', def: 'disc', room: ARCADE_ROOM, at: { x: 0.65, y: 0.88 } },
  { uid: 'pilota', def: 'pilota', room: ARCADE_ROOM, at: { x: 0.44, y: 0.78 } },
]
