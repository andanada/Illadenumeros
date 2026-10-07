/** White die-cut sticker card used by every block of the family page. */
export function Card({ title, tilt = 0, children, ...rest }: { title: string; tilt?: number; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className="sticker flex flex-col gap-4 rounded-[1.6rem] bg-white p-5" style={{ rotate: `${tilt}deg` }} {...rest}>
      <h2 className="text-2xl font-bold tracking-tight text-brand-dark">{title}</h2>
      {children}
    </section>
  )
}

export type Message = { kind: 'ok' | 'error'; text: string }

/** One live region for the whole page: success is announced politely, problems as alerts. */
export function MessageBar({ message }: { message: Message | undefined }) {
  if (!message) return null
  return message.kind === 'ok' ? (
    <p role="status" className="sticker rounded-2xl bg-ok px-4 py-3 text-center text-xl font-bold text-white">
      {message.text}
    </p>
  ) : (
    <p role="alert" className="sticker rounded-2xl bg-sol px-4 py-3 text-center text-xl font-bold text-punk">
      {message.text}
    </p>
  )
}
