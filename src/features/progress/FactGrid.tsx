import { useRef, useState } from 'react'
import { factCellText, type FactCell, type FactKind, type HeatMode } from './analytics/factHeat'
import { TONE_CLASS } from './factTones'
import { moveFocus, type Pos } from './gridNav'

const HEADER = 'grid place-items-center text-sm font-bold text-ink/70 sm:text-base'

/** 10 x 10 heatmap: role grid, roving tabindex, text + symbol on every cell (colour is never the only cue). */
export function FactGrid({ kind, title, cells, mode }: { kind: FactKind; title: string; cells: FactCell[][]; mode: HeatMode }) {
  const [active, setActive] = useState<Pos>({ row: 0, col: 0 })
  const [shown, setShown] = useState<FactCell>()
  const gridRef = useRef<HTMLDivElement>(null)

  const onKeyDown = (event: React.KeyboardEvent) => {
    const next = moveFocus(active, event.key, event.ctrlKey)
    if (!next) return
    event.preventDefault()
    setActive(next)
    gridRef.current?.querySelector<HTMLElement>(`[data-pos="${next.row}-${next.col}"]`)?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <div ref={gridRef} role="grid" aria-label={title} onKeyDown={onKeyDown} className="grid grid-cols-[repeat(11,minmax(0,1fr))] gap-[3px]">
        <div role="row" className="contents">
          <span role="columnheader" className={HEADER}>
            {kind === 'add' ? '+' : '×'}
          </span>
          {cells[0]?.map((c) => (
            <span key={c.col} role="columnheader" className={HEADER}>
              {c.col}
            </span>
          ))}
        </div>
        {cells.map((row, r) => (
          <div key={r} role="row" className="contents">
            <span role="rowheader" className={HEADER}>
              {r + 1}
            </span>
            {row.map((cell, c) => {
              const text = factCellText(kind, cell)
              const m = cell.modes[mode]
              return (
                <div
                  key={c}
                  role="gridcell"
                  data-pos={`${r}-${c}`}
                  data-tone={m.tone}
                  tabIndex={active.row === r && active.col === c ? 0 : -1}
                  aria-label={text}
                  title={text}
                  onFocus={() => {
                    setActive({ row: r, col: c })
                    setShown(cell)
                  }}
                  onClick={() => {
                    setActive({ row: r, col: c })
                    setShown(cell)
                  }}
                  onMouseEnter={() => setShown(cell)}
                  className={`grid aspect-square min-w-0 select-none place-items-center rounded-md border-2 text-[0.7rem] font-bold leading-none sm:text-sm ${TONE_CLASS[m.tone] ?? TONE_CLASS.buit}`}
                >
                  <span aria-hidden="true">{m.symbol}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <p role="status" aria-live="polite" className="min-h-7 text-lg font-semibold text-brand-dark">
        {shown ? factCellText(kind, shown) : 'Toca o navega per les caselles amb les fletxes per veure’n el detall.'}
      </p>
    </div>
  )
}
