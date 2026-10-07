import type { ProgressReport } from './analytics/report'
import { EmptyNote, Section } from './Section'

export function RecommendationsSection({ report }: { report: ProgressReport }) {
  const items = report.recommendations
  return (
    <Section title="Recomanacions" tilt={-0.3}>
      {items.length === 0 ? (
        <EmptyNote>{report.hasData ? 'Tot segueix el seu curs. Continueu així!' : 'Quan hi hagi una mica d’activitat, aquí apareixeran idees per acompanyar-la.'}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((rec) => (
            <li key={rec.id} data-rec={rec.id} className="flex gap-3 rounded-2xl bg-brand/10 p-3 text-lg leading-snug text-ink">
              <span aria-hidden="true" className="text-3xl">
                {rec.emoji}
              </span>
              <div>
                <p className="font-bold">{rec.title}</p>
                <p>{rec.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
