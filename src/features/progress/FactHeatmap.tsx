import { useState } from 'react'
import { HEAT_MODES, type HeatMode } from './analytics/factHeat'
import type { ProgressReport } from './analytics/report'
import { FactGrid } from './FactGrid'
import { MODE_LEGEND, TONE_CLASS } from './factTones'
import { Section } from './Section'

function ModeSwitch({ mode, onChange }: { mode: HeatMode; onChange: (mode: HeatMode) => void }) {
  return (
    <div role="group" aria-label="Què mostra el color" className="flex flex-wrap gap-2">
      {HEAT_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          onClick={() => onChange(m.id)}
          className={`min-h-12 rounded-full border-2 px-4 text-lg font-bold ${mode === m.id ? 'border-brand-dark bg-brand text-white' : 'border-ink/30 bg-white text-brand-dark'}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

export function FactHeatmap({ report }: { report: ProgressReport }) {
  const [mode, setMode] = useState<HeatMode>('precisio')
  return (
    <Section title="Mapa de fets" tilt={-0.3} hint="Les caselles buides són fets que encara no s’han practicat; no vol dir que s’hagin fallat.">
      <ModeSwitch mode={mode} onChange={setMode} />
      <ul aria-label="Llegenda dels fets" className="flex flex-wrap gap-2">
        {MODE_LEGEND[mode].map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-base font-semibold text-ink">
            <span aria-hidden="true" className={`grid size-7 place-items-center rounded-md border-2 text-sm font-bold ${TONE_CLASS[item.tone] ?? ''}`}>
              {item.symbol}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      <FactGrid kind="add" title="Sumes (1 a 10)" cells={report.addGrid} mode={mode} />
      <FactGrid kind="mul" title="Taula de multiplicar (1 a 10)" cells={report.mulGrid} mode={mode} />
    </Section>
  )
}
