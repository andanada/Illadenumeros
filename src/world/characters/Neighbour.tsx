import { memo, type ReactNode } from 'react'
import { Avatar } from './Avatar'
import type { Look, Pose } from './kit/geometry'
import { NEIGHBOURS_BY_ID, neighbourFromSeed } from './neighbours'

export interface NeighbourProps {
  /** A preset id from NEIGHBOURS (e.g. 'senyora-pilar'), or any other string as a crowd seed. */
  id: string
  pose?: Pose
  look?: Look
  holding?: ReactNode
  /** Height in px of a stature-1 person; taller neighbours grow from there. Default 240. */
  size?: number
  animated?: boolean
  /** Accessible name override; presets default to their name, seeded people to "Veí". */
  title?: string
  className?: string
}

/** A townsperson: a named preset or a deterministic crowd member. Same kit as the avatar. */
export const Neighbour = memo(function Neighbour({ id, pose, look, holding, size = 240, animated, title, className }: NeighbourProps) {
  const preset = NEIGHBOURS_BY_ID[id]
  const person = preset ?? neighbourFromSeed(id)
  const label = title ?? (preset ? preset.name : 'Veí')
  // The SVG grows with stature, so a fixed `size` keeps every person on the same scale.
  const scaled = size * (1 + ((person.stature - 1) * 138) / 322)
  return (
    <Avatar
      spec={person.spec}
      stature={person.stature}
      pose={pose}
      look={look}
      holding={holding}
      size={scaled}
      animated={animated}
      title={label}
      className={className}
      seed={id}
    />
  )
})
