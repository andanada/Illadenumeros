import { useEffect, useRef } from 'react'
import { Button } from '../../../ui/Button'

/** Pause screen: covers the question (so nobody races the clock), resumes exactly where it stopped. */
export function PauseOverlay({ onResume, onExit }: { onResume: () => void; onExit: () => void }) {
  const resume = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    resume.current?.focus()
  }, [])
  return (
    <div role="dialog" aria-modal="true" aria-label="Pausa" className="fixed inset-0 z-50 grid place-items-center bg-white/90 p-4">
      <div className="sticker flex flex-col items-center gap-5 rounded-[2rem] bg-white p-8 text-center">
        <p className="text-4xl font-bold text-brand-dark">⏸️ Pausa</p>
        <p className="text-xl text-ink">Respira. Quan vulguis, continuem.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button ref={resume} big onClick={onResume}>
            Continuar
          </Button>
          <Button big variant="soft" onClick={onExit}>
            Sortir
          </Button>
        </div>
      </div>
    </div>
  )
}
