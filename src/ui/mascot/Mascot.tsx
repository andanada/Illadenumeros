import { motion, type TargetAndTransition, type Transition } from 'motion/react'
import type { CharacterId } from '../../core/storage/db'
import { CHARACTERS, type CharacterDef, type Mood } from './characters'
import { EarsBack, EarsFront } from './Ears'

const MOOD_ANIMATION: Record<Mood, { animate: TargetAndTransition; transition: Transition }> = {
  salut: { animate: { rotate: [0, -6, 6, -4, 0] }, transition: { type: 'tween', duration: 1.2, repeat: Infinity, repeatDelay: 1.5 } },
  content: { animate: { y: [0, -14, 0] }, transition: { type: 'tween', duration: 0.6, repeat: Infinity, repeatDelay: 0.4 } },
  pensa: { animate: { rotate: [0, -5, 0] }, transition: { type: 'tween', duration: 2, repeat: Infinity, ease: 'easeInOut' } },
  anims: { animate: { scale: [1, 1.06, 1] }, transition: { type: 'tween', duration: 1.2, repeat: Infinity } },
  balla: { animate: { rotate: [-10, 10, -10], y: [0, -8, 0] }, transition: { type: 'tween', duration: 0.7, repeat: Infinity } },
}

function Eyes({ c, mood }: { c: CharacterDef; mood: Mood }) {
  if (mood === 'content' || mood === 'balla') {
    return (
      <g stroke={c.eye} strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M70 108 Q78 98 86 108" />
        <path d="M114 108 Q122 98 130 108" />
      </g>
    )
  }
  const lookUp = mood === 'pensa' ? -5 : 0
  return (
    <g>
      {[78, 122].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={106 + lookUp} rx="9" ry="12" fill={c.eye} />
          <circle cx={cx + 3} cy={101 + lookUp} r="3.5" fill="#fff" />
          <circle cx={cx - 3} cy={111 + lookUp} r="1.6" fill="#fff" opacity="0.8" />
        </g>
      ))}
    </g>
  )
}

function Mouth({ c, mood }: { c: CharacterDef; mood: Mood }) {
  if (mood === 'salut' || mood === 'balla') {
    return <ellipse cx="100" cy="132" rx="8" ry="7" fill="#9f1239" stroke={c.eye} strokeWidth="2" />
  }
  if (mood === 'pensa') return <path d="M91 131 Q100 138 109 131" stroke={c.eye} strokeWidth="3" fill="none" strokeLinecap="round" />
  return <path d="M88 128 Q100 142 112 128" stroke={c.eye} strokeWidth="3.5" fill="none" strokeLinecap="round" />
}

function Head({ c, mood }: { c: CharacterDef; mood: Mood }) {
  const isDog = c.ears === 'dog'
  return (
    <g>
      <EarsBack c={c} />
      <ellipse cx="100" cy="110" rx={c.ears.startsWith('hood') ? 48 : 56} ry={c.ears.startsWith('hood') ? 44 : 50} fill={isDog ? c.primary : c.face} stroke="#374151" strokeWidth={c.ears.startsWith('hood') ? 0 : 3} />
      {isDog && <ellipse cx="100" cy="126" rx="30" ry="22" fill={c.face} />}
      {isDog && <ellipse cx="100" cy="116" rx="8" ry="6" fill="#1f2937" />}
      {!isDog && <ellipse cx="100" cy="119" rx="4" ry="3" fill={c.ears === 'cat' ? '#f59e0b' : '#f472b6'} />}
      <Eyes c={c} mood={mood} />
      <ellipse cx="66" cy="124" rx="9" ry="5.5" fill="#fda4af" opacity="0.75" />
      <ellipse cx="134" cy="124" rx="9" ry="5.5" fill="#fda4af" opacity="0.75" />
      <Mouth c={c} mood={mood} />
      <EarsFront c={c} />
    </g>
  )
}

export interface MascotProps {
  character: CharacterId
  mood?: Mood
  size?: number
  className?: string
}

export function Mascot({ character, mood = 'salut', size = 160, className }: MascotProps) {
  const c = CHARACTERS[character]
  const anim = MOOD_ANIMATION[mood]
  return (
    <motion.svg
      viewBox="0 0 200 210"
      width={size}
      height={size * 1.05}
      className={className}
      role="img"
      aria-label={c.name}
      animate={anim.animate}
      transition={anim.transition}
      style={{ originX: '50%', originY: '90%', overflow: 'visible' }}
    >
      <ellipse cx="100" cy="204" rx="44" ry="6" fill="#000" opacity="0.08" />
      <ellipse cx="100" cy="178" rx="36" ry="26" fill={c.primary} stroke="#374151" strokeWidth="3" />
      <ellipse cx="100" cy="182" rx="20" ry="14" fill={c.face} opacity={c.primary === c.face ? 0 : 1} />
      <Head c={c} mood={mood} />
    </motion.svg>
  )
}
