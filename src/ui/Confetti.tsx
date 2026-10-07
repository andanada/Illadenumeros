import { motion } from 'motion/react'
import { useMemo } from 'react'

const COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185']
const SHAPES = ['⭐', '💖', '✨', '🎉', '🌸', '🎀']

/** Burst of falling pieces. `count` pieces, then fades; purely decorative (aria-hidden). */
export function Confetti({ count = 28, emoji = false }: { count?: number; emoji?: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.6 + Math.random() * 1.4,
        rotate: Math.random() * 720 - 360,
        color: COLORS[i % COLORS.length] as string,
        shape: SHAPES[i % SHAPES.length] as string,
        size: 10 + Math.random() * 14,
      })),
    [count],
  )
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', top: 0, left: 0, fontSize: emoji ? p.size + 8 : undefined }}
        >
          {emoji ? (
            p.shape
          ) : (
            <span style={{ display: 'block', width: p.size, height: p.size * 0.6, background: p.color, borderRadius: 3 }} />
          )}
        </motion.span>
      ))}
    </div>
  )
}
