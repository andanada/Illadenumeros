import type { CharacterId } from '../../core/storage/db'
import { Mascot } from '../../ui/mascot/Mascot'
import { formatDuration, formatPercent } from './analytics/format'
import type { ProgressReport } from './analytics/report'
import { EmptyNote, Section } from './Section'

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <li className="flex min-w-0 flex-col justify-center rounded-2xl bg-brand/10 p-3 text-center">
      <span className="text-base font-semibold leading-tight text-ink/70">{label}</span>
      <span className="text-2xl font-bold text-brand-dark sm:text-3xl">{value}</span>
      {note && <span className="text-sm leading-tight text-ink/70">{note}</span>}
    </li>
  )
}

const comparison = (current: number | undefined, previous: number | undefined, trend: string): string =>
  current === undefined ? 'Sense dades aquests dies' : `Abans: ${formatPercent(previous)} · ${trend}`

export function SummarySection({ report, name, character }: { report: ProgressReport; name: string; character: CharacterId }) {
  const { summary, level } = report
  return (
    <Section title="Resum" tilt={-0.4}>
      <div className="flex items-center gap-3">
        <Mascot character={character} mood="content" size={72} />
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold text-ink">{name}</p>
          <p className="text-lg leading-snug text-ink">{level.text}</p>
        </div>
      </div>
      {!report.hasData && <EmptyNote>Encara no hi ha activitat. Quan {name} jugui una estona, aquí apareixerà com va avançant.</EmptyNote>}
      <ul aria-label="Xifres del resum" className="grid grid-cols-2 gap-3">
        <Tile label="Dies jugats aquesta setmana" value={String(summary.daysThisWeek)} />
        <Tile label="Dies seguits" value={String(summary.streak)} />
        <Tile label="Temps total" value={formatDuration(summary.totalMinutes)} />
        <Tile
          label="Encerts (7 dies)"
          value={formatPercent(summary.last7.accuracy)}
          note={comparison(summary.last7.accuracy, summary.prev7.accuracy, summary.accuracyTrend)}
        />
        <Tile
          label="Fluïdesa (7 dies)"
          value={formatPercent(summary.last7.fluency)}
          note={comparison(summary.last7.fluency, summary.prev7.fluency, summary.fluencyTrend)}
        />
      </ul>
    </Section>
  )
}
