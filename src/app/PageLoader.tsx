import { Mascot } from '../ui/mascot/Mascot'
import { useProgress } from '../core/progress/store'

/** Cute loading state shown while a page chunk or the saved progress is loading. */
export function PageLoader() {
  const character = useProgress((s) => s.profile?.character) ?? 'melo'
  return (
    <div role="status" aria-live="polite" className="notebook grid min-h-full place-items-center">
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Mascot character={character} mood="pensa" size={140} />
        <p className="text-2xl font-bold text-brand-dark">Un moment…</p>
      </div>
    </div>
  )
}
