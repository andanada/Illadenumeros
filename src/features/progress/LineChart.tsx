import { lineSegments } from './analytics/chart'
import { ChartTable } from './ChartTable'

const W = 280
const H = 90
const PAD = 14

export interface LineChartProps {
  title: string
  /** One label per point (oldest first). */
  labels: string[]
  /** undefined = not enough data for that point. */
  values: (number | undefined)[]
  min: number
  max: number
  format: (value: number) => string
  valueHeader: string
}

/** Small SVG line chart. Points without data break the line and are announced as "poques dades". */
export function LineChart({ title, labels, values, min, max, format, valueHeader }: LineChartProps) {
  const { segments, points } = lineSegments(values, { width: W - PAD * 2, height: H - PAD * 2 }, min, max)
  const described = values.map((v, i) => `${labels[i] ?? ''}: ${v === undefined ? 'poques dades' : format(v)}`).join('; ')
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <svg role="img" aria-label={`${title}. ${described}`} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="currentColor" strokeOpacity="0.3" />
        <g transform={`translate(${PAD} ${PAD})`}>
          {segments
            .filter((s) => s.length > 1)
            .map((s) => (
              <polyline key={s[0]?.index} points={s.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand" />
            ))}
          {points.map((p) => (
            <g key={p.index}>
              <circle cx={p.x} cy={p.y} r="5" className="fill-brand stroke-white" strokeWidth="2" />
              <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="10" fontWeight="700" className="fill-ink">
                {format(p.value)}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <ul className="grid grid-cols-4 gap-1 text-center text-sm text-ink/80" aria-hidden="true">
        {labels.map((label, i) => (
          <li key={label} className="leading-tight">
            {label}
            {values[i] === undefined && <span className="block font-bold text-ink">poques dades</span>}
          </li>
        ))}
      </ul>
      <ChartTable
        caption={title}
        headers={['Setmana', valueHeader]}
        rows={labels.map((label, i) => [label, values[i] === undefined ? 'poques dades' : format(values[i] ?? 0)])}
      />
    </div>
  )
}
