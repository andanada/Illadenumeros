import { motion } from 'motion/react'
import type { Placement } from '../../../model/types'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { FURNITURE_BY_ID } from '../furniture/catalog'
import { toLocalX } from './homeLogic'

const GLOW = 'radial-gradient(circle, rgba(255,236,160,0.75) 0%, rgba(255,214,120,0.35) 40%, rgba(255,214,120,0) 70%)'

/** Floating "z"s over the bed while she sleeps. */
function Snores({ x, y }: { x: number; y: number }) {
  const reduced = useWorldReducedMotion()
  return (
    <div aria-hidden="true" className="absolute" style={{ left: `${x * 100}%`, top: `${y * 100 - 32}%`, zIndex: 520 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute font-bold text-[#FFF3B0]"
          style={{ left: i * 22, top: -i * 26, fontSize: `${1.4 + i * 0.5}rem` }}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={reduced ? { opacity: 1 } : { opacity: [0, 1, 0], y: [10, -14, -30] }}
          transition={reduced ? { duration: 0 } : { duration: 2.4, repeat: Infinity, delay: i * 0.7 }}
        >
          z
        </motion.span>
      ))}
    </div>
  )
}

/**
 * Night in the home: the room dims, lit lamps glow through the dark, and z's float over the bed.
 * Decorative (the "Bon dia!" button and the sr status are in the place).
 */
export function NightSky({ here, lit, bedX, bedY }: { here: readonly Placement[]; lit: readonly string[]; bedX: number | undefined; bedY: number | undefined }) {
  const lamps = here.filter((p) => lit.includes(p.uid) && FURNITURE_BY_ID[p.item]?.action === 'lamp')
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true" data-testid="casa-nit" style={{ zIndex: 500 }}>
      <div className="absolute inset-0" style={{ background: '#2F2A5A', opacity: 0.55, mixBlendMode: 'multiply' }} />
      {lamps.map((p) => {
        const def = FURNITURE_BY_ID[p.item]
        const top = p.y - ((def?.h ?? 100) / 600) * 0.75
        return <span key={p.uid} className="absolute size-[38cqh] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${toLocalX(p.x) * 100}%`, top: `${top * 100}%`, background: GLOW, mixBlendMode: 'screen' }} />
      })}
      {bedX !== undefined && bedY !== undefined && <Snores x={bedX} y={bedY} />}
    </div>
  )
}
