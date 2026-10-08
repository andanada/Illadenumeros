import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../shared/speed/usePrefersReducedMotion'
import { describeJar, filled, type Jar, type Segment } from './jarLogic'

const COLORS = ['bg-chicle', 'bg-cel', 'bg-menta', 'bg-sol'] as const

function SegmentView({ segment, index, shown, jar }: { segment: Segment; index: number; shown: number | null; jar: Jar }) {
  const hidden = segment.kind === 'hidden'
  const right = hidden && shown === segment.amount
  const label = hidden ? (shown === null ? '?' : String(shown)) : segment.label
  const style = {
    flexBasis: `${(segment.amount / jar.capacity) * 100}%`,
    flexGrow: 0,
    flexShrink: 1,
    minWidth: '3.25rem',
  }
  const tone = hidden ? `border-4 border-dashed ${right ? 'border-ok bg-ok/20' : 'border-brand bg-white'}` : segment.kind === 'used' ? 'bg-brand-soft opacity-80' : COLORS[index % COLORS.length]
  return (
    <span style={style} className={`grid h-16 place-items-center overflow-hidden rounded-xl text-3xl font-bold text-ink ${tone}`}>
      {label}
    </span>
  )
}

/** Measuring jar: the ingredients fill part of the scale and the hidden amount completes (or leaves) the rest. */
export function JarView({ jar, shown, solved }: { jar: Jar; shown: number | null; solved: boolean }) {
  const reduced = usePrefersReducedMotion()
  const total = jar.mode === 'sum' ? (shown === null ? '?' : String(shown)) : String(jar.capacity)
  return (
    <div role="img" aria-label={describeJar(jar, shown)} data-testid="jar" className="flex w-full max-w-md flex-col items-center gap-2 px-2">
      <p aria-hidden="true" className="text-xl font-bold text-brand-dark">
        {jar.mode === 'sum' ? `A la gerra: ${total}` : `Gerra de ${total}`}
      </p>
      <motion.div
        animate={solved && !reduced ? { y: [0, -6, 0] } : { y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticker flex w-full items-center gap-1 rounded-2xl bg-white p-2"
        style={{ minHeight: '5rem' }}
      >
        {jar.segments.map((s, i) => (
          <SegmentView key={s.id} segment={s} index={i} shown={shown} jar={jar} />
        ))}
        {filled(jar) < jar.capacity && <span aria-hidden="true" className="h-16 flex-1 rounded-xl border-4 border-dotted border-brand/30" />}
      </motion.div>
      <p aria-hidden="true" className="flex w-full justify-between px-1 text-lg font-bold text-brand-dark/70">
        <span>0</span>
        <span>{jar.capacity}</span>
      </p>
    </div>
  )
}
