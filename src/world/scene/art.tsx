import { PROPS_BY_ID, PropArt } from '../art/props'

/**
 * The only door from scene / places / errands / HUD to the character and prop art
 * (src/world/characters and src/world/art, built by the art agent).
 */
export { Avatar, Neighbour, NEIGHBOURS, Pet, type Pose } from '../characters'
export { PropArt } from '../art/props'
export { Grain } from '../art/Grain'

/** A decorative prop scaled to fit a square box (long things like a baguette stay inside it). */
export function FitProp({ id, box }: { id: string; box: number }) {
  const def = PROPS_BY_ID[id]
  if (!def) return null
  const size = Math.round((box * def.h) / Math.max(def.w, def.h))
  return <PropArt id={id} size={size} title="" shadow={false} className="pointer-events-none block" />
}
