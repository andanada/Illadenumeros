import { motion } from 'motion/react'
import { useEffect, useRef, type ComponentType } from 'react'
import { NEIGHBOURS_BY_ID } from '../characters/neighbours'
import type { SceneId } from '../model/types'
import { Avatar, FitProp } from '../scene/art'
import { useWorldReducedMotion } from '../scene/useReducedMotion'
import { worldSfx } from '../scene/worldSfx'
import type { BoardKind } from './boardPlan'
import { GiftBox } from './GiftBox'

/** One pinned note of the board: errands waiting at a place. */
export interface BoardCard {
  readonly place: SceneId
  /** «La Botiga» (capitalised). */
  readonly title: string
  readonly count: number
  readonly done: number
  readonly kind: BoardKind
  readonly neighbour: string
  readonly facade: string | ComponentType<{ open: boolean }> | undefined
}

export interface ErrandBoardProps {
  cards: readonly BoardCard[]
  onGo: (place: SceneId) => void
  onClose: () => void
}

const KIND_TEXT: Readonly<Record<BoardKind, string>> = {
  calentament: 'Escalfem motors!',
  repte: 'Encàrrecs nous',
  repas: 'Repàs amb calma',
}

const PIN = ['#FF6B5B', '#4DA6EC', '#FFB834', '#36C5A2', '#9A7BE6'] as const
const TILTS = [-2.2, 1.6, -1, 2.4, -1.8, 1.2] as const

function PlaceIcon({ facade }: { facade: BoardCard['facade'] }) {
  if (typeof facade === 'string') return <FitProp id={facade} box={58} />
  if (facade === undefined) return null
  const Own = facade
  return (
    <span className="relative block size-[58px] overflow-hidden">
      <Own open />
    </span>
  )
}

function Ticks({ count, done }: { count: number; done: number }) {
  return (
    <span aria-hidden="true" className="flex flex-wrap gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`grid size-7 place-items-center rounded-full text-base font-bold ${i < done ? 'bg-[var(--world-menta)] text-white' : 'bg-[var(--world-surface-2)] text-transparent'}`}
        >
          ✓
        </span>
      ))}
    </span>
  )
}

function Card({ card, index, onGo }: { card: BoardCard; index: number; onGo: (place: SceneId) => void }) {
  const reduced = useWorldReducedMotion()
  const finished = card.done >= card.count
  const person = NEIGHBOURS_BY_ID[card.neighbour]
  return (
    <motion.li
      data-place={card.place}
      data-count={card.count}
      data-done={card.done}
      initial={reduced ? false : { y: 24, opacity: 0, rotate: 0 }}
      animate={{ y: 0, opacity: 1, rotate: reduced ? 0 : (TILTS[index % TILTS.length] ?? 0) }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: reduced ? 0 : 0.05 * index }}
      className="relative flex min-h-36 flex-col gap-2 rounded-[22px] bg-[var(--world-surface)] p-3 pt-4 shadow-[var(--world-shadow-lift)]"
    >
      <span aria-hidden="true" className="absolute -top-2 left-1/2 size-5 -translate-x-1/2 rounded-full shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]" style={{ background: PIN[index % PIN.length] }} />
      <div className="flex items-start gap-2">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--world-sky-bottom)]">
          {person && <Avatar spec={person.spec} crop="head" size={60} animated={false} title={person.name} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight text-[var(--world-ink)]">{card.title}</h3>
          <p className="text-base font-semibold leading-tight text-[var(--world-text-soft)]">{KIND_TEXT[card.kind]}</p>
        </div>
        <span className="shrink-0">
          <PlaceIcon facade={card.facade} />
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <Ticks count={card.count} done={Math.min(card.done, card.count)} />
        <span className="sr-only">{`${Math.min(card.done, card.count)} de ${card.count} fets`}</span>
        {finished ? (
          <span className="-rotate-6 rounded-xl border-4 border-[var(--world-menta)] px-3 py-1 text-xl font-bold uppercase text-[var(--world-menta)]">Fet!</span>
        ) : (
          <button
            type="button"
            aria-label={`Vés-hi: ${card.title}`}
            onClick={() => {
              worldSfx.squish()
              onGo(card.place)
            }}
            className="min-h-14 shrink-0 rounded-full bg-[var(--world-coral)] px-5 text-xl font-bold text-white shadow-[var(--world-shadow-soft)] active:translate-y-0.5"
          >
            Vés-hi!
          </button>
        )}
      </div>
    </motion.li>
  )
}

/** «El tauler d’encàrrecs»: a cork board with a pinned note per place, and the surprise waiting at the end. */
export function ErrandBoard({ cards, onGo, onClose }: ErrandBoardProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const left = cards.reduce((n, c) => n + Math.max(0, c.count - c.done), 0)
  const allDone = cards.length > 0 && left === 0

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label="El tauler d’encàrrecs" className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(43,36,64,0.45)] p-2 sm:p-6">
      <div
        className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-[32px] p-3 shadow-[var(--world-shadow-lift)] sm:p-5"
        style={{ background: 'radial-gradient(circle at 20% 20%, #D9A46C 0 2px, transparent 3px) 0 0 / 22px 22px, radial-gradient(circle at 70% 60%, #B9824D 0 2px, transparent 3px) 0 0 / 30px 30px, #C9935C', boxShadow: 'inset 0 0 0 10px #9A6A3E, var(--world-shadow-lift)' }}
      >
        <div className="flex items-center gap-3 px-2 pb-3 pt-1">
          <h2 className="flex-1 -rotate-1 rounded-2xl bg-[var(--world-neu)] px-4 py-2 text-2xl font-bold text-[var(--world-ink)] shadow-[var(--world-shadow-soft)] sm:text-3xl">
            {allDone ? 'Tot fet! Demà n’hi haurà més.' : 'Encàrrecs d’avui'}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Tanca el tauler"
            onClick={onClose}
            className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-2xl font-bold text-[var(--world-ink)] shadow-[var(--world-shadow-lift)]"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <ul aria-label="Encàrrecs" className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-2 pb-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <Card key={card.place} card={card} index={i} onGo={onGo} />
          ))}
        </ul>
        {cards.length === 0 && <p className="rounded-2xl bg-[var(--world-neu)] p-4 text-xl font-semibold text-[var(--world-text)]">Avui no hi ha encàrrecs. Passeja i juga!</p>}
        {!allDone && cards.length > 0 && (
          <div className="mx-2 mt-1 flex items-center gap-3 rounded-2xl bg-[var(--world-neu)] px-4 py-2 shadow-[var(--world-shadow-soft)]">
            <GiftBox size={52} />
            <p className="text-lg font-bold leading-tight text-[var(--world-ink)]">Quan els acabis tots, hi haurà una sorpresa!</p>
          </div>
        )}
      </div>
    </div>
  )
}
