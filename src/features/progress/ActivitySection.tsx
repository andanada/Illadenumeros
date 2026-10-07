import { barRects, niceMax } from './analytics/chart'
import { shortDay } from './analytics/format'
import type { ProgressReport } from './analytics/report'
import { activitySummary } from './activitySummary'
import { ChartTable } from './ChartTable'
import { EmptyNote, Section } from './Section'

const W = 280
const H = 90

export function ActivitySection({ report }: { report: ProgressReport }) {
  const { activity } = report
  const max = niceMax(activity.map((d) => d.minutes))
  const rects = barRects(
    activity.map((d) => d.minutes),
    { width: W, height: H },
    max,
  )
  const summary = activitySummary(activity)
  const empty = activity.every((d) => d.answers === 0 && d.minutes === 0)
  return (
    <Section title="Temps i constància" tilt={0.3} hint="Minuts jugats cada dia. Una pausa de més de 10 minuts compta com una sessió nova.">
      {empty && <EmptyNote>Encara no hi ha dies jugats en aquest període.</EmptyNote>}
      <svg role="img" aria-label={`Minuts jugats per dia. ${summary}`} viewBox={`0 -4 ${W} ${H + 24}`} className="h-auto w-full">
        <line x1="0" x2={W} y1={H} y2={H} stroke="currentColor" strokeOpacity="0.3" />
        {rects.map((r, i) => (
          <rect key={activity[i]?.day} x={r.x} y={r.y} width={r.width} height={Math.max(r.height, 0)} rx="2" className="fill-brand" />
        ))}
        {[0, 7, 14, 21, 27].map((i) => (
          <text key={i} x={rects[i] ? rects[i].x + rects[i].width / 2 : 0} y={H + 14} textAnchor="middle" className="fill-ink" fontSize="9">
            {shortDay(activity[i]?.day ?? '')}
          </text>
        ))}
        <text x="0" y="6" fontSize="9" className="fill-ink">
          {max} min
        </text>
      </svg>
      <p className="text-lg leading-snug text-ink">{summary}</p>
      <ChartTable
        caption="Minuts i respostes per dia"
        headers={['Dia', 'Minuts', 'Respostes']}
        rows={activity
          .filter((d) => d.answers > 0 || d.minutes > 0)
          .map((d) => [shortDay(d.day), String(Math.round(d.minutes)), String(d.answers)])}
      />
    </Section>
  )
}
