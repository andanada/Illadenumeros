import type { FloorId } from './zones'

/** A pendant bulb at the ceiling of a floor: tap it to switch the floor's light on or off. */
export function LightSwitch({ floor, name, on, onToggle }: { floor: FloorId; name: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      data-light={floor}
      aria-pressed={on}
      aria-label={`Llum ${name}: ${on ? 'apaga-la' : 'encén-la'}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className="absolute left-1/2 top-0 z-[3600] grid h-16 w-16 -translate-x-1/2 cursor-pointer place-items-start justify-items-center border-0 bg-transparent p-0 outline-none focus-visible:outline-4 focus-visible:outline-[var(--world-focus,#4da6ec)]"
    >
      <svg viewBox="0 0 60 64" width="48" height="52" aria-hidden="true">
        <rect x="28.5" y="0" width="3" height="22" fill="#57516f" />
        <path d="M10 46 Q10 22 30 22 Q50 22 50 46 Z" fill={on ? '#FFB834' : '#9A94B0'} />
        <ellipse cx="30" cy="49" rx="11" ry="7" fill={on ? '#FFF3B0' : '#d9d3e6'} />
        {on && <circle cx="30" cy="50" r="15" fill="#FFF3B0" opacity="0.4" />}
      </svg>
    </button>
  )
}
