import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../core/progress/store'
import type { AvatarSpec } from '../model/types'
import { Avatar } from '../scene/art'

/** Bottom-left of the street: who is playing, and the door back to «Qui juga?». */
export function PlayerChip({ avatar }: { avatar: AvatarSpec }) {
  const navigate = useNavigate()
  const name = useProgress((s) => s.profile?.name)
  const clearActivePlayer = useProgress((s) => s.clearActivePlayer)
  if (!name) return null
  return (
    <button
      type="button"
      aria-label={`${name} · Canvia de jugador/a`}
      onClick={() => {
        // Leave the town first: once nobody is active, the protected routes would redirect.
        navigate('/qui-juga')
        void clearActivePlayer()
      }}
      className="absolute bottom-3 left-3 z-40 flex min-h-14 max-w-[45vw] items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-4 text-lg font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-soft)]"
    >
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--world-sky-bottom,#d7f0ff)]">
        <Avatar spec={avatar} crop="head" size={46} animated={false} />
      </span>
      <span className="truncate">{name}</span>
      <span aria-hidden="true" className="text-base font-semibold text-[var(--world-text-soft,#6b5f80)]">
        · Canvia
      </span>
    </button>
  )
}
