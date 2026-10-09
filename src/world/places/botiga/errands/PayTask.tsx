import { useState } from 'react'
import { breakdown, formatEuros, pieceLabel } from '../../../../ui/visual/moneyLogic'
import { MoneyPiece } from '../../../../ui/visual/MoneyPiece'
import { Draggable } from '../../../scene/Draggable'
import { DropZone } from '../../../scene/DropZone'
import type { PropInfo } from '../../../scene/SceneContext'
import { worldSfx } from '../../../scene/worldSfx'
import type { ErrandTaskProps } from '../../../errands/types'
import { drawerPieces, movePiece, payChoice, trayTotal, type PayTask as Task, type Piece } from './payLogic'

const DRAWER_KIND = 'moneda-calaix'
const TRAY_KIND = 'moneda-safata'

const coinName = (cents: number): string => (cents >= 500 ? `el bitllet de ${pieceLabel(cents)}` : `la moneda de ${pieceLabel(cents)}`)
const keyOf = (prop: PropInfo): string => prop.id.split(':')[1] ?? ''

/** Change errand: take coins from the till drawer to the counter tray, then hand them over. */
export function PayTask({ task, item, hintLevel, locked, solution, submit }: ErrandTaskProps<Task>) {
  const [state, setState] = useState<{ drawer: Piece[]; tray: Piece[] }>(() => ({ drawer: drawerPieces(task), tray: [] }))
  const tray = solution ? breakdown(task.target).map((cents, i) => ({ key: `s${i}`, cents })) : state.tray
  const total = trayTotal(tray)

  const toTray = (prop: PropInfo): void => {
    worldSfx.coin()
    setState((s) => {
      const moved = movePiece(s.drawer, s.tray, keyOf(prop))
      return { drawer: moved.from, tray: moved.to }
    })
  }
  const toDrawer = (prop: PropInfo): void => {
    worldSfx.coin()
    setState((s) => {
      const moved = movePiece(s.tray, s.drawer, keyOf(prop))
      return { drawer: moved.to, tray: moved.from }
    })
  }

  const handOver = (): void => {
    worldSfx.kaching()
    submit(payChoice(total, item))
  }

  return (
    <div className="flex flex-wrap items-end justify-center gap-3">
      <DropZone
        id="calaix"
        label="el calaix de la caixa"
        accepts={(p) => p.kind === TRAY_KIND && !locked}
        onDrop={toDrawer}
        className="w-full max-w-[19rem]"
      >
        <ul
          aria-label="Calaix de la caixa"
          className="flex flex-wrap items-center justify-center gap-1 rounded-[1.4rem] bg-[var(--world-carbo,#34304a)]/85 p-2 shadow-[var(--world-shadow-lift)]"
        >
          {state.drawer.map((piece) => (
            <li key={piece.key}>
              <Draggable
                prop={{ id: `calaix:${piece.key}`, label: coinName(piece.cents), kind: DRAWER_KIND }}
                disabled={locked}
                sound="squish"
                className="grid min-h-14 min-w-14 place-items-center"
              >
                <MoneyPiece cents={piece.cents} size={48} />
              </Draggable>
            </li>
          ))}
        </ul>
      </DropZone>
      <DropZone
        id="safata"
        label="la safata del taulell"
        accepts={(p) => p.kind === DRAWER_KIND && !locked}
        onDrop={toTray}
        z={2}
        className="w-full max-w-[15rem]"
      >
        <div
          className="flex min-h-24 flex-wrap items-center justify-center gap-1 rounded-[1.4rem] bg-[#FFF3DC] p-2 shadow-[inset_0_-6px_0_rgba(196,122,44,0.25)]"
          aria-label={`Safata: ${formatEuros(total)}`}
        >
          {tray.length === 0 && <span className="text-lg font-semibold text-[var(--world-text-soft,#6b5f80)]">Posa aquí el canvi</span>}
          {tray.map((piece) => (
            <Draggable
              key={piece.key}
              prop={{ id: `safata:${piece.key}`, label: coinName(piece.cents), kind: TRAY_KIND }}
              disabled={locked}
              sound="squish"
              className="grid min-h-14 min-w-14 place-items-center"
            >
              <MoneyPiece cents={piece.cents} size={48} />
            </Draggable>
          ))}
        </div>
      </DropZone>
      <div className="flex flex-col items-center gap-2 pb-1">
        {(hintLevel >= 1 || solution) && (
          <p className="rounded-full bg-white px-4 py-1 text-xl font-bold tabular-nums">Hi ha {formatEuros(total)}</p>
        )}
        <button
          type="button"
          disabled={locked || total === 0}
          onClick={handOver}
          className="min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-7 text-2xl font-bold text-white shadow-[var(--world-shadow-lift)] disabled:opacity-50"
        >
          <span aria-hidden="true">🤝 </span>Dona el canvi
        </button>
      </div>
    </div>
  )
}
