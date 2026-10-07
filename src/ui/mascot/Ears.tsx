import type { CharacterDef } from './characters'

/** Back layer: hoods and ears drawn behind the head. */
export function EarsBack({ c }: { c: CharacterDef }) {
  switch (c.ears) {
    case 'hood-long':
      return (
        <g>
          <path d="M62 70 C40 20 52 4 70 10 C86 16 86 46 82 66 Z" fill={c.primary} stroke={c.secondary} strokeWidth="3" />
          <path d="M138 70 C160 20 148 4 130 10 C114 16 114 46 118 66 Z" fill={c.primary} stroke={c.secondary} strokeWidth="3" />
          <path d="M70 18 C64 30 66 46 72 58" stroke={c.accent} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M130 18 C136 30 134 46 128 58" stroke={c.accent} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="104" r="62" fill={c.primary} stroke={c.secondary} strokeWidth="3" />
        </g>
      )
    case 'hood-bunny':
      return (
        <g>
          <ellipse cx="74" cy="38" rx="15" ry="36" fill={c.primary} stroke={c.secondary} strokeWidth="3" transform="rotate(-12 74 38)" />
          <ellipse cx="126" cy="38" rx="15" ry="36" fill={c.primary} stroke={c.secondary} strokeWidth="3" transform="rotate(12 126 38)" />
          <ellipse cx="74" cy="40" rx="7" ry="24" fill="#fbcfe8" transform="rotate(-12 74 40)" />
          <ellipse cx="126" cy="40" rx="7" ry="24" fill="#fbcfe8" transform="rotate(12 126 40)" />
          <circle cx="100" cy="104" r="62" fill={c.primary} stroke={c.secondary} strokeWidth="3" />
        </g>
      )
    case 'cat':
      return (
        <g>
          <path d="M52 78 L60 30 L92 58 Z" fill={c.primary} stroke="#374151" strokeWidth="3" strokeLinejoin="round" />
          <path d="M148 78 L140 30 L108 58 Z" fill={c.primary} stroke="#374151" strokeWidth="3" strokeLinejoin="round" />
          <path d="M60 44 L64 64 L80 58 Z" fill="#fbcfe8" />
          <path d="M140 44 L136 64 L120 58 Z" fill="#fbcfe8" />
        </g>
      )
    case 'dog':
      return (
        <g>
          <path d="M50 60 C30 70 30 120 48 130 C60 120 66 90 64 66 Z" fill={c.secondary} />
          <path d="M150 60 C170 70 170 120 152 130 C140 120 134 90 136 66 Z" fill={c.secondary} />
        </g>
      )
    case 'cloud':
      return (
        <g>
          <path d="M48 84 C14 92 8 140 30 146 C50 150 56 120 62 96 Z" fill={c.primary} stroke={c.secondary} strokeWidth="3" />
          <path d="M152 84 C186 92 192 140 170 146 C150 150 144 120 138 96 Z" fill={c.primary} stroke={c.secondary} strokeWidth="3" />
        </g>
      )
  }
}

/** Front details: bows, badges and flowers on top of the head. */
export function EarsFront({ c }: { c: CharacterDef }) {
  switch (c.ears) {
    case 'hood-long':
      return (
        <path
          d="M100 44 l5 10 11 1.5 -8 7.5 2 11 -10 -5.5 -10 5.5 2 -11 -8 -7.5 11 -1.5 Z"
          fill={c.accent}
          stroke="#fff"
          strokeWidth="2"
        />
      )
    case 'cat':
      return (
        <g transform="translate(138 52) rotate(18)">
          <ellipse cx="-12" cy="0" rx="13" ry="10" fill={c.accent} stroke="#6b21a8" strokeWidth="2" />
          <ellipse cx="12" cy="0" rx="13" ry="10" fill={c.accent} stroke="#6b21a8" strokeWidth="2" />
          <circle cx="0" cy="0" r="6" fill="#c084fc" stroke="#6b21a8" strokeWidth="2" />
        </g>
      )
    case 'hood-bunny':
      return (
        <g transform="translate(130 60)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx="0" cy="-8" rx="5" ry="8" fill="#fff" transform={`rotate(${deg})`} />
          ))}
          <circle r="5" fill={c.accent} />
        </g>
      )
    default:
      return null
  }
}
