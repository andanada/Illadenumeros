import { niceMax } from './analytics/chart'
import { formatSeconds } from './analytics/factHeat'
import type { ProgressReport } from './analytics/report'
import { LineChart } from './LineChart'
import { Section } from './Section'

const LABELS = ['Fa 3 setmanes', 'Fa 2 setmanes', 'Setmana passada', 'Aquesta setmana']

export function EvolutionSection({ report }: { report: ProgressReport }) {
  const accuracy = report.weeks.map((w) => (w.enough && w.accuracy !== undefined ? Math.round(w.accuracy * 100) : undefined))
  const times = report.weeks.map((w) => (w.enough && w.medianRtMs !== undefined ? w.medianRtMs : undefined))
  const anyData = report.weeks.some((w) => w.enough)
  return (
    <Section title="Evolució" tilt={-0.3} hint="Les últimes 4 setmanes. Cal un mínim de 10 respostes en una setmana per dibuixar-ne el punt.">
      {!anyData && <p className="rounded-2xl bg-brand/10 px-4 py-3 text-lg font-semibold text-ink">Encara hi ha poques dades per veure l’evolució. Amb unes quantes sessions més apareixerà.</p>}
      <LineChart title="Encerts per setmana" labels={LABELS} values={accuracy} min={0} max={100} format={(v) => `${v} %`} valueHeader="Encerts" />
      <LineChart
        title="Temps de resposta (mitjana de les correctes)"
        labels={LABELS}
        values={times}
        min={0}
        max={niceMax(times.filter((t): t is number => t !== undefined))}
        format={formatSeconds}
        valueHeader="Temps"
      />
    </Section>
  )
}
