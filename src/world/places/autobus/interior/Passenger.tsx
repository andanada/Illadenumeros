import { memo } from 'react'
import { NEIGHBOURS_BY_ID, neighbourFromSeed } from '../../../characters'
import { Avatar, Neighbour } from '../../../scene/art'

const specFor = (seed: string) => NEIGHBOURS_BY_ID[seed]?.spec ?? neighbourFromSeed(seed).spec

/** A passenger's head and shoulders in a bus window (same kit as every townsperson; same seed, same face). */
export const PassengerHead = memo(function PassengerHead({ seed, size }: { seed: string; size: number }) {
  return <Avatar spec={specFor(seed)} crop="head" size={size} animated={false} seed={seed} className="pointer-events-none block" />
})

/** A passenger standing at the stop. */
export const StandingPassenger = memo(function StandingPassenger({
  seed,
  size,
  animated = false,
}: {
  seed: string
  size: number
  animated?: boolean
}) {
  return <Neighbour id={seed} size={size} title="" animated={animated} className="pointer-events-none block" />
})
