import { useState } from 'react'
import type { SkillStatus } from '../../core/engine/mastery'
import { formatPercent } from './analytics/format'
import type { ProgressReport, SkillCell } from './analytics/report'
import { Section } from './Section'
import { STATUS_STYLE } from './statusStyle'

const STATUS_ORDER: SkillStatus[] = ['nova', 'aprenent', 'consolidant', 'dominada', 'bloquejada']

function Legend() {
  return (
    <ul aria-label="Llegenda" className="flex flex-wrap gap-2">
      {STATUS_ORDER.map((status) => (
        <li key={status} className={`flex items-center gap-1.5 rounded-full border-2 border-ink/30 px-3 py-1 text-base font-semibold ${STATUS_STYLE[status].className}`}>
          <span aria-hidden="true">{STATUS_STYLE[status].symbol}</span>
          {STATUS_STYLE[status].label}
        </li>
      ))}
    </ul>
  )
}

function Detail({ cell }: { cell: SkillCell | undefined }) {
  if (!cell) return <p className="min-h-16 text-lg text-ink/70">Toca una habilitat per veure’n el detall.</p>
  const { skill, state, status } = cell
  const attempts = state?.attempts ?? 0
  return (
    <div className="min-h-16 rounded-2xl bg-brand/10 p-3 text-lg leading-snug text-ink">
      <p className="font-bold">
        {skill.code} · {skill.title} <span className="font-semibold text-ink/70">({STATUS_STYLE[status].label.toLowerCase()})</span>
      </p>
      {attempts === 0 ? (
        <p>Encara no s’hi ha jugat.</p>
      ) : (
        <p>
          Domini {formatPercent(state?.mastery)} · {attempts} intents · encerts {formatPercent(state?.accuracy)} · fluïdesa {formatPercent(state?.fluency)} · etapa{' '}
          {state?.cpaStage}
        </p>
      )}
    </div>
  )
}

export function SkillHeatmap({ report }: { report: ProgressReport }) {
  const [selected, setSelected] = useState<string>()
  const all = report.skillGroups.flatMap((g) => g.cells)
  const current = all.find((c) => c.skill.id === selected)
  return (
    <Section title="Mapa d’habilitats" tilt={0.3} hint="Cada pegatina és una habilitat, agrupades per curs.">
      <Legend />
      {report.skillGroups.map((group) => (
        <div key={group.grade} role="group" aria-label={`Habilitats de ${group.label}`} className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-ink">{group.label}</h3>
          <div className="flex flex-wrap gap-2">
            {group.cells.map((cell) => {
              const style = STATUS_STYLE[cell.status]
              return (
                <button
                  key={cell.skill.id}
                  type="button"
                  aria-label={`${cell.skill.code}, ${cell.skill.title}: ${style.label.toLowerCase()}`}
                  aria-pressed={selected === cell.skill.id}
                  onClick={() => setSelected(cell.skill.id)}
                  onFocus={() => setSelected(cell.skill.id)}
                  className={`sticker flex min-h-12 min-w-14 items-center justify-center gap-1 rounded-xl border-2 border-ink/30 px-2 text-lg font-bold ${style.className}`}
                >
                  <span aria-hidden="true" className="text-base">
                    {style.symbol}
                  </span>
                  <span aria-hidden="true">{cell.skill.code}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div role="status" aria-live="polite">
        <Detail cell={current} />
      </div>
    </Section>
  )
}
