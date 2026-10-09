import { Suspense, useState } from 'react'
import { GAME_REGISTRY } from '../../../../features/play/gameRegistry'
import type { GameSummary } from '../../../../features/play/gameTypes'
import { EmbeddedScreenProvider } from '../../../../ui/EmbeddedScreen'
import { PALETTE as P } from '../../../art/palette'
import { Sparkles } from '../../../errands/Celebration'
import { Neighbour } from '../../../scene/art'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import type { CabinetDef } from './cabinetDefs'

export interface GameCabinetProps {
  def: CabinetDef
  /** The child leaves the machine. */
  onExit: () => void
  /** A round of the game ended by itself (before the celebration). */
  onPlayed: (summary: GameSummary) => void
}

const coinsText = (n: number): string => (n <= 0 ? 'Cada resposta et fa més ràpid.' : `Has guanyat ${n} ${n === 1 ? 'moneda' : 'monedes'}!`)

/** The screen's own «Game over» that is only ever a celebration: sparkles, a cheering neighbour, coins already given. */
function Celebration({ summary, onAgain, onExit }: { summary: GameSummary; onAgain: () => void; onExit: () => void }) {
  const reduced = useWorldReducedMotion()
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center" data-testid="cabinet-celebration">
      <div className="relative">
        <Neighbour id="en-kofi" pose="cheer" size={170} title="En Kofi" />
        {!reduced && <Sparkles />}
      </div>
      <h2 role="status" className="text-3xl font-bold text-brand-dark sm:text-4xl">
        Quina partida!
      </h2>
      <p className="text-xl font-bold text-ink">{coinsText(summary.petals)}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-6 text-xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5"
        >
          Torna a jugar
        </button>
        <button
          type="button"
          onClick={onExit}
          className="min-h-16 rounded-full bg-white px-6 text-xl font-bold text-[var(--world-text-soft,#6b5f80)] shadow-[var(--world-shadow-lift)] active:translate-y-0.5"
        >
          Surt de la màquina
        </button>
      </div>
    </div>
  )
}

/**
 * The cabinet in play: its screen runs the existing speed game, unchanged, inside a frame. The game records
 * under its own id as always. The screen scrolls inside the cabinet if it needs more room, never the page.
 */
export function GameCabinet({ def, onExit, onPlayed }: GameCabinetProps) {
  const [round, setRound] = useState(0)
  const [summary, setSummary] = useState<GameSummary | undefined>(undefined)
  const Game = GAME_REGISTRY[def.gameId]
  const body = P[def.body]
  const glow = P[def.glow]

  return (
    <section
      aria-label={`${def.title}, a la pantalla`}
      data-testid="cabinet-screen"
      className="mx-auto flex h-full max-h-full w-full max-w-[64rem] flex-col rounded-[2rem] p-1.5 shadow-[var(--world-shadow-lift)] sm:p-2"
      style={{ background: body.base }}
    >
      <div
        className="mb-1.5 flex items-center justify-center rounded-[1.2rem] px-4 py-1 text-center text-lg font-bold text-[var(--world-ink,#2b2440)] sm:text-xl"
        style={{ background: glow.base }}
      >
        <span aria-hidden="true">{def.emoji}&nbsp;</span>
        {def.title}
      </div>
      <div
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-[1.4rem] border-[6px] bg-white"
        style={{ borderColor: P.carbo.base }}
      >
        <EmbeddedScreenProvider value={true}>
          {summary ? (
            <Celebration
              summary={summary}
              onAgain={() => {
                setSummary(undefined)
                setRound((r) => r + 1)
              }}
              onExit={onExit}
            />
          ) : Game ? (
            <Suspense fallback={<p className="p-6 text-center text-xl font-bold text-ink">Encenent la màquina…</p>}>
              <Game
                key={round}
                onExit={onExit}
                onComplete={(s) => {
                  setSummary(s)
                  onPlayed(s)
                }}
              />
            </Suspense>
          ) : null}
        </EmbeddedScreenProvider>
      </div>
    </section>
  )
}
