import type { ProgressReport } from './analytics/report'
import { EmptyNote, Section } from './Section'

export function MisconceptionsSection({ report }: { report: ProgressReport }) {
  const items = report.misconceptions
  return (
    <Section title="Errors més freqüents" tilt={0.3} hint="Últims 30 dies. Equivocar-se és part d’aprendre: aquí hi ha idees per ajudar a casa.">
      {items.length === 0 ? (
        <EmptyNote>Cap patró d’error destacable en els últims 30 dies. Bona senyal!</EmptyNote>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl bg-brand/10 p-3 text-lg leading-snug text-ink">
              <p className="font-bold">
                {item.title} <span className="font-semibold text-ink/70">({item.count} {item.count === 1 ? 'vegada' : 'vegades'})</span>
              </p>
              <p>{item.explanation}</p>
              <p className="mt-1">
                <span className="font-bold text-brand-dark">Per provar a casa: </span>
                {item.tip}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}
