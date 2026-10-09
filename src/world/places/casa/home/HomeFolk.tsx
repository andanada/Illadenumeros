import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { PetId } from '../../../characters'
import type { AvatarSpec } from '../../../model/types'
import { Avatar, Pet } from '../../../scene/art'
import { TapProp } from '../../../scene/Scene'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'

/** Seconds to cross the whole room. */
const CROSSING_S = 2.4

/** The child's avatar: walks to where she taps (faces the way she goes), waves when tapped. */
export function WalkingAvatar({ spec, x, hidden }: { spec: AvatarSpec; x: number; hidden: boolean }) {
  const reduced = useWorldReducedMotion()
  const [from, setFrom] = useState(x)
  const [walking, setWalking] = useState(false)
  const [waving, setWaving] = useState(false)
  const [facing, setFacing] = useState<1 | -1>(1)

  // A new target: turn towards it and start walking (adjusted during render, no effect needed).
  if (x !== from) {
    setFacing(x < from ? -1 : 1)
    setFrom(x)
    setWalking(!reduced)
  }

  if (hidden) return null
  return (
    <motion.div
      className="absolute bottom-[11%] h-[calc(0.31*min(100cqh,105cqw))] -translate-x-1/2"
      style={{ zIndex: 395 }}
      initial={false}
      animate={{ left: `${x * 100}%` }}
      transition={reduced ? { duration: 0 } : { duration: CROSSING_S * 0.5, ease: 'easeInOut' }}
      onAnimationComplete={() => setWalking(false)}
      data-testid="casa-avatar"
      data-walking={walking}
    >
      <TapProp prop={{ id: 'jo', label: 'Tu', kind: 'persona' }} sound="squish" onTap={() => setWaving((w) => !w)} className="h-full">
        <div className={`h-full [&>svg]:h-full [&>svg]:w-auto ${walking ? 'world-hop' : ''}`} style={{ transform: `scaleX(${facing})` }}>
          <Avatar spec={spec} pose={waving ? 'wave' : 'idle'} size={240} title="" seed="casa" />
        </div>
      </TapProp>
    </motion.div>
  )
}

const PET_NAMES: Readonly<Record<string, string>> = { nyx: 'Nyx', mixa: 'Mixa', blau: 'Blau', nuvol: 'Núvol', melo: 'Melo' }

/** The adopted pet wanders around the room by itself; tap it for a happy wiggle. Asleep at night. */
export function WanderingPet({ id, night }: { id: PetId; night: boolean }) {
  const reduced = useWorldReducedMotion()
  const [x, setX] = useState(0.7)
  const [happy, setHappy] = useState(false)

  useEffect(() => {
    if (reduced || night) return
    const timer = setInterval(() => setX(0.12 + Math.random() * 0.76), 4200)
    return () => clearInterval(timer)
  }, [reduced, night])

  const name = PET_NAMES[id] ?? 'La mascota'
  return (
    <motion.div
      className="absolute bottom-[10%] h-[calc(0.15*min(100cqh,105cqw))] -translate-x-1/2"
      style={{ zIndex: 398 }}
      initial={false}
      animate={{ left: `${x * 100}%` }}
      transition={reduced ? { duration: 0 } : { duration: 2.6, ease: 'easeInOut' }}
    >
      <TapProp prop={{ id: 'mascota', label: name, kind: 'animal' }} sound={happy ? 'purr' : 'meow'} onTap={() => setHappy((h) => !h)} className="h-full">
        <div className="h-full [&>svg]:h-full [&>svg]:w-auto">
          <Pet id={id} pose={night ? 'sleep' : happy ? 'happy' : 'idle'} size={100} title={name} />
        </div>
      </TapProp>
    </motion.div>
  )
}
