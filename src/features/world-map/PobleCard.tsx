/**
 * Temporary door from the island map to «El Poble dels Números» (until Phase 2 makes the town the home page).
 * A little hand-drawn town in the same flat, no-outline style as the town itself.
 */
function MiniTown() {
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <circle cx="186" cy="28" r="16" fill="#FFB834" />
      <circle cx="186" cy="28" r="10" fill="#FFD77E" />
      <path d="M0 92 Q60 70 120 82 Q170 92 220 76 L220 120 L0 120 Z" fill="#A8D143" />
      <rect x="18" y="52" width="58" height="52" rx="8" fill="#FF8DBA" />
      <path d="M12 56 L47 28 L82 56 Z" fill="#D9473B" />
      <rect x="40" y="76" width="16" height="28" rx="6" fill="#4DA6EC" />
      <rect x="24" y="62" width="12" height="11" rx="3" fill="#9CCFF7" />
      <rect x="92" y="40" width="74" height="64" rx="8" fill="#36C5A2" />
      <rect x="100" y="30" width="58" height="16" rx="6" fill="#FFB834" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${94 + i * 14} 52 h14 v8 q-7 8 -14 0 z`} fill={i % 2 ? '#FBF6EC' : '#FF6B5B'} />
      ))}
      <rect x="100" y="68" width="30" height="24" rx="4" fill="#9CCFF7" />
      <rect x="138" y="70" width="18" height="34" rx="5" fill="#34304A" />
      <rect x="0" y="104" width="220" height="16" fill="#F3E3C3" />
    </svg>
  )
}

export function PobleCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label="El Poble (nou!)"
      onClick={onOpen}
      className="sticker relative flex min-h-36 w-full -rotate-1 items-stretch overflow-hidden rounded-[2rem] text-left transition-transform active:scale-[0.98]"
      style={{ background: 'linear-gradient(#8FD3FF, #D7F0FF)' }}
    >
      <span className="relative z-10 flex flex-1 flex-col justify-center gap-1 py-4 pl-5">
        <span className="w-fit rotate-[-4deg] rounded-full bg-[#FF6B5B] px-3 py-0.5 text-base font-bold uppercase tracking-wide text-white">Nou!</span>
        <span className="text-4xl font-bold leading-none text-[#2B2440]">El Poble</span>
        <span className="text-lg font-semibold leading-tight text-[#2B2440]/75">Crea el teu personatge i fes encàrrecs</span>
      </span>
      <span className="w-[46%] max-w-56 shrink-0 self-end">
        <MiniTown />
      </span>
    </button>
  )
}
