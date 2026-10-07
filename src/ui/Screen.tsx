import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isMuted, setMuted, speak } from '../core/audio/speech'
import { Button } from './Button'

export function SpeakerButton({ text, label = 'Escoltar' }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => speak(text)}
      className="sticker grid size-12 shrink-0 place-items-center rounded-full bg-white text-2xl active:sticker-pressed sm:size-16 sm:text-3xl"
    >
      🔊
    </button>
  )
}

export function MuteToggle() {
  const [muted, setLocal] = useState(isMuted())
  return (
    <button
      type="button"
      aria-label={muted ? 'Activar el so' : 'Silenciar'}
      onClick={() => {
        setMuted(!muted)
        setLocal(!muted)
      }}
      className="sticker grid size-12 shrink-0 place-items-center rounded-full bg-white text-2xl sm:size-16 sm:text-3xl"
    >
      {muted ? '🔇' : '🔈'}
    </button>
  )
}

/** Notebook-paper page with spiral holes on the left and a safe content area. */
export function Screen({
  title,
  back,
  right,
  children,
}: {
  title?: string
  back?: string | (() => void)
  right?: React.ReactNode
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="notebook flex min-h-full flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2 z-0 hidden flex-col justify-around py-8 sm:flex">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="block size-5 rounded-full bg-ink/15 shadow-inner" />
        ))}
      </div>
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 pl-[clamp(46px,9vw,96px)] sm:p-4 sm:pl-[clamp(52px,9vw,96px)]">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {back !== undefined && (
            <Button variant="soft" aria-label="Enrere" className="px-5" onClick={() => (typeof back === 'function' ? back() : navigate(back))}>
              ←
            </Button>
          )}
          {title && <h1 className="text-2xl font-bold leading-tight tracking-tight text-brand-dark sm:text-4xl">{title}</h1>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">{right}</div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col pl-[clamp(40px,8vw,88px)]">{children}</main>
    </div>
  )
}
