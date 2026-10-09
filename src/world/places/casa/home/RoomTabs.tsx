import type { RoomId } from '../furniture/types'
import { ROOMS } from './homeLogic'

const SHORT: Readonly<Record<RoomId, string>> = { sala: 'Sala', habitacio: 'Habitació', cuina: 'Cuina' }
const ICON: Readonly<Record<RoomId, string>> = { sala: '🛋️', habitacio: '🛏️', cuina: '🍳' }

/** Room switcher: the three rooms as tabs (swiping the floor does the same). */
export function RoomTabs({ room, onRoom, busyKitchen }: { room: RoomId; onRoom: (room: RoomId) => void; busyKitchen: boolean }) {
  return (
    <nav aria-label="Habitacions de casa" className="flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-[var(--world-shadow-lift)]">
      {ROOMS.map((r) => {
        const here = r.id === room
        return (
          <button
            key={r.id}
            type="button"
            aria-current={here ? 'page' : undefined}
            aria-label={`${r.name}${r.id === 'cuina' && busyKitchen ? ', algú t’espera' : ''}`}
            onClick={() => onRoom(r.id)}
            className={`relative flex min-h-14 min-w-14 items-center justify-center gap-1 rounded-full px-3 text-lg font-bold ${here ? 'bg-[var(--world-coral,#ff6b5b)] text-white' : 'text-[var(--world-ink,#2b2440)]'}`}
          >
            <span aria-hidden="true" className="text-2xl">
              {ICON[r.id]}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">
              {SHORT[r.id]}
            </span>
            {r.id === 'cuina' && busyKitchen && !here && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-4 rounded-full bg-[var(--world-mango,#ffb834)] ring-2 ring-white" />}
          </button>
        )
      })}
    </nav>
  )
}
