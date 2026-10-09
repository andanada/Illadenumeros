import { motion } from 'motion/react'
import { useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { PALETTE } from '../art/palette'
import { sparklePath } from '../art/paths'
import { FitProp } from '../scene/art'

const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2
  return { x: Math.cos(a) * 110, y: Math.sin(a) * 90 - 40, c: [PALETTE.mango.base, PALETTE.rosa.base, PALETTE.cel.base, PALETTE.llima.base, PALETTE.coral.base][i % 5] }
})

/** A burst of four-point sparkles around the neighbour. */
export function Sparkles() {
  return (
    <svg className="pointer-events-none absolute left-1/2 top-1/3 z-20 overflow-visible" width={0} height={0} aria-hidden="true">
      {SPARKS.map((s, i) => (
        <motion.path
          key={i}
          d={sparklePath(0, 0, 11)}
          fill={s.c}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: s.x, y: s.y, scale: [0, 1.5, 0.7], opacity: [1, 1, 0] }}
          transition={{ duration: 0.9, delay: (i % 3) * 0.05, ease: 'easeOut' }}
        />
      ))}
    </svg>
  )
}

interface Flight {
  from: { x: number; y: number }
  to: { x: number; y: number }
}

/** Where the HUD's coin counter is (the coins fly into it). */
const counterCentre = (): { x: number; y: number } | undefined => {
  const el = document.querySelector('[data-testid="coins"]')
  if (!el) return undefined
  const r = el.getBoundingClientRect()
  return { x: r.left + 30, y: r.top + r.height / 2 }
}

function measure(el: HTMLElement | null): Flight | undefined {
  const to = counterCentre()
  if (!el || !to) return undefined
  const r = el.getBoundingClientRect()
  return { from: { x: r.left + r.width / 2, y: r.top + r.height * 0.45 }, to }
}

/** Coins hop out of the neighbour's hand and fly into the HUD counter (decorative; the counter announces). */
export function CoinFlight({ amount, origin }: { amount: number; origin: RefObject<HTMLElement | null> }) {
  // Measured once, when the thank-you starts (the neighbour is already on screen by then).
  const [flight] = useState<Flight | undefined>(() => measure(origin.current))

  if (!flight || amount <= 0) return null
  const coins = Math.min(5, amount)
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
      {Array.from({ length: coins }, (_, i) => {
        const dx = flight.to.x - flight.from.x
        const dy = flight.to.y - flight.from.y
        return (
          <motion.span
            key={i}
            className="absolute block"
            style={{ left: flight.from.x - 18, top: flight.from.y - 18 }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
            animate={{ x: [0, (i - coins / 2) * 26, dx], y: [0, -70 - i * 8, dy], scale: [0.4, 1.2, 0.8], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 1.1,
              delay: 0.15 + i * 0.12,
              ease: 'easeInOut',
              times: [0, 0.35, 1],
              opacity: { duration: 1.1, delay: 0.15 + i * 0.12, times: [0, 0.12, 0.88, 1] },
            }}
          >
            <FitProp id="moneda-poble" box={36} />
          </motion.span>
        )
      })}
    </div>,
    document.body,
  )
}
