/**
 * Gentle rhythm ribbon: it fills during the personal target pace. When it is full nothing happens
 * (no red, no sound, no loss): the question simply waits and the ribbon rests.
 */
export function PaceBar({ elapsedMs, paceMs }: { elapsedMs: number; paceMs: number }) {
  const fill = Math.min(1, Math.max(0, elapsedMs / paceMs))
  const resting = fill >= 1
  return (
    <div className="flex w-full max-w-md items-center gap-3" data-testid="pace-bar">
      <span className="text-lg font-bold text-brand-dark" aria-hidden="true">
        🎵 Ritme
      </span>
      <div aria-hidden="true" className="h-4 flex-1 overflow-hidden rounded-full bg-white/80 ring-2 ring-brand-soft">
        <div
          className={`h-full rounded-full ${resting ? 'bg-cel' : 'bg-menta'}`}
          style={{ width: `${Math.round(fill * 100)}%`, transition: 'width 200ms linear' }}
        />
      </div>
    </div>
  )
}
