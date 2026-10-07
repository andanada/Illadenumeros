import { useId } from 'react'

/** White die-cut sticker block; a region named by its title. */
export function Section({ title, tilt = 0, children, hint }: { title: string; tilt?: number; children: React.ReactNode; hint?: string }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="progress-section sticker flex min-w-0 flex-col gap-4 rounded-[1.6rem] bg-white p-4 sm:p-5" style={{ rotate: `${tilt}deg` }}>
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-2xl font-bold tracking-tight text-brand-dark">
          {title}
        </h2>
        {hint && <p className="text-base leading-snug text-ink/70">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-brand/10 px-4 py-3 text-lg font-semibold leading-snug text-ink">{children}</p>
}
