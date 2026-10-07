import { useId } from 'react'

/** A privacy block: a landmark region named by its h2 (so screen-reader users can jump between blocks). */
export function PrivacySection({ title, children }: { title: string; children: React.ReactNode }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="sticker flex flex-col gap-3 rounded-[1.6rem] bg-white p-5 text-lg leading-snug text-ink">
      <h2 id={titleId} className="text-2xl font-bold tracking-tight text-brand-dark">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function BulletList({ items }: { items: readonly React.ReactNode[] }) {
  return (
    <ul className="ml-5 flex list-disc flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
