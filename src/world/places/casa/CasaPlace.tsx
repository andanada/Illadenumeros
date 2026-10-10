import { useWorld } from '../../data'
import { useProgress } from '../../../core/progress/store'
import { Scene } from '../../scene/Scene'
import type { PlaceProps } from '../types'
import { registerCasaCatalog } from './furniture/catalog'
import { firstPet, HouseCast } from './house/HouseCast'
import { HouseWorld } from './house/HouseWorld'
import '../../sandbox/sandbox.css'

registerCasaCatalog()

/**
 * La Casa: a dollhouse cut in half. Three floors (sala i cuina, habitació i bany, estudi i terrassa) joined by
 * stairs the family really walks up. Free play first: choose who to move, sit, hug, carry anything between floors,
 * cook, bathe, brush teeth, water the plants, switch the lights, sleep; decorate when she wants. Maths lives in the
 * bubbles over the family (the grandma wants strawberries, dad towels…): ignorable, and they give coins.
 */
export default function CasaPlace({ pending, callSignal, onSolved, onExit, forced }: PlaceProps) {
  const { avatar, pets } = useWorld()
  const name = useProgress((s) => s.profile?.name) ?? 'tu'
  const pet = firstPet(pets)
  return (
    <Scene label="La Casa" className="h-full min-h-[30rem] w-full">
      <HouseCast avatar={avatar} name={name} pet={pet}>
        <HouseWorld pet={pet} callSignal={callSignal} pending={pending} onSolved={onSolved} onExit={onExit} {...(forced ? { forced } : {})} />
      </HouseCast>
    </Scene>
  )
}
