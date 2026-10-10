import { useEffect, useId, useRef, useState } from 'react'
import { unlockAudio } from '../../core/audio/sfx'
import { worldSfx } from '../scene/worldSfx'
import { jarMessage, type JarProgress } from './jarMessage'

/** Stars that fit in the jar, bottom to top: [x, y] in the 64×80 drawing. */
const STARS: readonly (readonly [number, number])[] = [
  [24, 66],
  [40, 66],
  [32, 56],
  [22, 47],
  [42, 47],
  [32, 37],
  [24, 28],
  [40, 28],
]

const star = (x: number, y: number): string => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 6 : 2.7
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`
  })
  return pts.join(' ')
}

function JarArt({ level }: { level: number }) {
  const lit = Math.round(Math.min(1, Math.max(0, level)) * STARS.length)
  return (
    <svg viewBox="0 0 64 80" width="40" height="50" aria-hidden="true" className="block">
      <rect x="20" y="4" width="24" height="9" rx="3" fill="#B9824D" />
      <path d="M22 13h20v6c9 4 12 12 12 22v26c0 6-5 10-11 10H21c-6 0-11-4-11-10V41c0-10 3-18 12-22z" fill="#EAF6FF" stroke="#7FB3D8" strokeWidth="3" strokeLinejoin="round" />
      {STARS.map(([x, y], i) => (
        <polygon key={i} points={star(x, y)} fill={i < lit ? '#FFC93C' : '#C2DAEA'} stroke={i < lit ? '#E8A600' : 'none'} strokeWidth="1" data-lit={i < lit} />
      ))}
    </svg>
  )
}

const round = 'grid size-16 shrink-0 place-items-center rounded-full bg-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5 active:shadow-[var(--world-shadow-press)]'

/**
 * «El tarro d’estrelles»: fills as the day's maths minutes add up. Passive: tapping it only shows a friendly
 * note of what is left (no task list, nothing to do).
 */
export function StarJar({ jar }: { jar: JarProgress }) {
  const [open, setOpen] = useState(false)
  const popId = useId()
  const wrap = useRef<HTMLSpanElement | null>(null)
  const percent = Math.round(jar.level * 100)

  useEffect(() => {
    if (!open) return
    const close = (): void => setOpen(false)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    const onDown = (e: PointerEvent): void => {
      if (!wrap.current?.contains(e.target as Node)) close()
    }
    const timer = setTimeout(close, 7000)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <span ref={wrap} className="relative" data-testid="star-jar" data-level={percent}>
      <button
        type="button"
        aria-label={`Tarro d’estrelles: ${percent} %`}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => {
          unlockAudio()
          worldSfx.squish()
          setOpen((v) => !v)
        }}
        className={round}
      >
        <JarArt level={jar.level} />
      </button>
      {open && (
        <p id={popId} role="status" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[1.4rem] bg-white p-4 text-xl font-bold leading-snug text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]">
          {jarMessage(jar)}
        </p>
      )}
    </span>
  )
}
