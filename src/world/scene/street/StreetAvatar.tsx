import { motion, useTransform, type MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import type { AvatarSpec } from '../../model/types'
import { Avatar } from '../art'
import '../../sandbox/sandbox.css'

export interface StreetAvatarProps {
  avatar: AvatarSpec
  /** Street position in street units, and the street's scale. */
  x: MotionValue<number>
  scale: number
  size: number
  walking: boolean
  facing: 1 | -1
  /** Stepping through a door: she shrinks into it. */
  entering: boolean
  reduced: boolean
  greeting: string | undefined
  /** What she carries (SVG content for her hand). */
  holding: ReactNode
}

/** Her, on the pavement: bobs while walking, leans into the direction, steps into doors. */
export function StreetAvatar({ avatar, x, scale, size, walking, facing, entering, reduced, greeting, holding }: StreetAvatarProps) {
  const px = useTransform(x, (v) => v * scale)
  const pose = holding ? 'hold' : greeting ? 'wave' : 'idle'
  return (
    <motion.div style={{ x: px }} className="pointer-events-none absolute bottom-0 left-0 z-30 h-0 w-0" data-testid="street-avatar" data-walking={walking}>
      <motion.div
        animate={entering && !reduced ? { y: -size * 0.16, scale: 0.62, opacity: 0 } : { y: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: 'easeIn' }}
        style={{ transformOrigin: '50% 100%' }}
        className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
      >
        {greeting && (
          <motion.p
            initial={reduced ? false : { scale: 0.6, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: reduced ? 0 : 0.35 }}
            className="relative mb-1 whitespace-nowrap rounded-[1.4rem] bg-white px-4 py-2 text-2xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]"
          >
            {greeting}
            <span aria-hidden="true" className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 rounded-sm bg-white" />
          </motion.p>
        )}
        <div aria-hidden="true" style={{ transform: `scaleX(${facing})`, transformOrigin: '50% 100%' }}>
          <div className={walking ? 'sb-walk' : ''}>
            <Avatar spec={avatar} pose={pose} look={{ x: facing * 0.6, y: 0 }} size={size} holding={holding} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
