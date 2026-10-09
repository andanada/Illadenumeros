import { motion } from 'motion/react'
import { memo, useEffect, useRef, useState, type PointerEvent } from 'react'
import { PALETTE } from '../../art/palette'
import { sparklePath } from '../../art/paths'
import { PropArt } from '../../art/props'
import type { AvatarSpec } from '../../model/types'
import { Avatar } from '../Avatar'
import { lookToward, type Look, type Pose } from '../kit/geometry'
import { useCalm } from '../useBlink'

const BURST = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  return { x: Math.cos(a) * 150, y: Math.sin(a) * 120 - 60, c: [PALETTE.mango.base, PALETTE.rosa.base, PALETTE.cel.base, PALETTE.llima.base][i % 4] }
})

/**
 * The live preview: the avatar on a little round stage under the sky. Owns its own pointer-follow
 * state so moving the finger never re-renders the option grids.
 */
export const CreatorStage = memo(function CreatorStage({ spec, spins, fits = 0, name }: { spec: AvatarSpec; spins: number; fits?: number; name: string }) {
  const calm = useCalm()
  const box = useRef<HTMLDivElement>(null)
  const [look, setLook] = useState<Look>({ x: 0, y: 0 })
  const [pose, setPose] = useState<Pose>('wave')

  useEffect(() => {
    const t = setTimeout(() => setPose('idle'), spins === 0 ? 2200 : 1300)
    return () => clearTimeout(t)
  }, [spins])

  const [lastSpins, setLastSpins] = useState(spins)
  if (spins !== lastSpins) {
    setLastSpins(spins)
    setPose('cheer')
  }

  // Trying something on: a little hop with arms up, then back to standing.
  const [lastFits, setLastFits] = useState(fits)
  if (fits !== lastFits) {
    setLastFits(fits)
    setPose('cheer')
  }
  useEffect(() => {
    if (fits === 0) return
    const t = setTimeout(() => setPose('idle'), 900)
    return () => clearTimeout(t)
  }, [fits])

  const onMove = (e: PointerEvent) => {
    const rect = box.current?.getBoundingClientRect()
    if (rect) setLook(lookToward(rect, { x: e.clientX, y: e.clientY }))
  }

  return (
    <div className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden" onPointerMove={onMove} onPointerLeave={() => setLook({ x: 0, y: 0 })}>
      <div className="pointer-events-none absolute -right-6 top-3 opacity-90" aria-hidden="true">
        <PropArt id="sol" size={110} title="" />
      </div>
      <div className="pointer-events-none absolute left-[6%] top-[14%]" aria-hidden="true">
        <PropArt id="nuvol-cel" size={46} title="" />
      </div>
      <div className="pointer-events-none absolute right-[22%] top-[34%] opacity-80" aria-hidden="true">
        <PropArt id="nuvol-cel" size={30} title="" />
      </div>
      <svg className="pointer-events-none absolute bottom-0 left-1/2 h-[30%] w-[150%] -translate-x-1/2" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40 Q100 10 200 18 Q300 26 400 8 L400 100 L0 100 Z" fill="var(--world-grass)" />
        <path d="M0 64 Q120 44 220 50 Q320 56 400 42 L400 100 L0 100 Z" fill="var(--world-ground)" />
      </svg>
      <div ref={box} className="relative mb-[3%] flex h-[88%] max-h-[560px] items-end">
        <motion.div
          key={spins}
          className="h-full"
          initial={calm || spins === 0 ? false : { scale: 0.7, rotate: -10, y: 30 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 14 }}
        >
          <motion.div
            key={`fit-${fits}`}
            className="h-full origin-bottom"
            initial={calm || fits === 0 ? false : { scaleX: 1.12, scaleY: 0.86, y: 6 }}
            animate={{ scaleX: 1, scaleY: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 11 }}
          >
            <AvatarFill spec={spec} pose={pose} look={look} name={name} />
          </motion.div>
        </motion.div>
        {!calm && spins + fits > 0 && (
          <svg key={`b${spins}-${fits}`} className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible" width={0} height={0} aria-hidden="true">
            {BURST.map((b, i) => (
              <motion.path
                key={i}
                d={sparklePath(0, 0, 12)}
                fill={b.c}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: b.x, y: b.y, scale: [0, 1.4, 0.6], opacity: [1, 1, 0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  )
})

/** Avatar sized to the stage height (CSS), so it scales from phone to tablet. */
function AvatarFill({ spec, pose, look, name }: { spec: AvatarSpec; pose: Pose; look: Look; name: string }) {
  return (
    <div className="h-full [&>svg]:h-full [&>svg]:w-auto">
      <Avatar spec={spec} pose={pose} look={look} size={400} title={name} seed="creador" />
    </div>
  )
}
