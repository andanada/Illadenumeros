import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { PageLoader } from '../app/PageLoader'
import { useProgress } from '../core/progress/store'
import { ErrandBoard, type BoardCard } from './board/ErrandBoard'
import { GiftReveal } from './board/GiftReveal'
import { AvatarCreator } from './characters'
import { useWorld } from './data'
import { Hud } from './hud/Hud'
import type { SceneId } from './model/types'
import { PLACES } from './places/registry'
import { capitalised } from './places/streetPlan'
import type { PlaceModule } from './places/types'
import { Street } from './scene/street/Street'
import { useWorldReducedMotion } from './scene/useReducedMotion'
import { worldSfx } from './scene/worldSfx'
import { PlayerChip } from './town/PlayerChip'
import { useBoard } from './town/useBoard'
import { useTownPlaces } from './town/useTownPlaces'
import { wardrobeOwned } from './wardrobe/wardrobeLogic'

const Wardrobe = lazy(() => import('./wardrobe/Wardrobe').then((m) => ({ default: m.Wardrobe })))

type Where = { at: 'street' } | { at: SceneId; origin: { x: number; y: number } }

export interface TownPageProps {
  /** Overrides the wardrobe (tests); by default the avatar bubble opens L’armari. */
  onWardrobe?: () => void
  /** The places of the town (tests); default: the registry. */
  places?: readonly PlaceModule[]
  /** The clock that decides «today» for the errand board (tests). */
  now?: () => number
}

/** «El Poble dels Números»: the street, the places behind its doors, the errand board and the HUD on top. */
export default function TownPage({ onWardrobe, places = PLACES, now = Date.now }: TownPageProps) {
  const { avatar, coins, owned, ready, avatarUpdatedAt, setAvatar } = useWorld()
  const name = useProgress((s) => s.profile?.name)
  /** First visit of an existing player: she makes her character before the street (dismissed even if saving fails). */
  const [created, setCreated] = useState(false)
  const reduced = useWorldReducedMotion()
  const town = useTownPlaces(places)
  const board = useBoard(now, town.open)
  const [where, setWhere] = useState<Where>({ at: 'street' })
  const [callSignal, setCallSignal] = useState(0)
  const [wardrobe, setWardrobe] = useState(false)
  const [showBoard, setShowBoard] = useState(false)
  const [walk, setWalk] = useState<{ id: SceneId; nonce: number } | undefined>(undefined)
  const streetOffset = useRef<number | undefined>(undefined)
  /** Where the street was when the child went in, so she comes out at the same door. */
  const [savedOffset, setSavedOffset] = useState<number | undefined>(undefined)
  const [greeted, setGreeted] = useState(false)

  const enter = useCallback(
    (id: SceneId, from?: DOMRect) => {
      if (!town.byId(id)?.open) return
      const origin = from ? { x: from.left + from.width / 2, y: from.top + from.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      setSavedOffset(streetOffset.current)
      setGreeted(true)
      setWhere({ at: id, origin })
    },
    [town],
  )

  const exit = useCallback(() => setWhere({ at: 'street' }), [])
  const rememberOffset = useCallback((v: number) => {
    streetOffset.current = v
  }, [])

  /** «Vés-hi!»: already there = call the next neighbour; elsewhere = walk the street to it. */
  const goTo = (id: SceneId): void => {
    setShowBoard(false)
    if (where.at === id) {
      worldSfx.doorbell()
      setCallSignal((n) => n + 1)
      return
    }
    setWhere({ at: 'street' })
    setWalk((w) => ({ id, nonce: (w?.nonce ?? 0) + 1 }))
  }

  const cards = useMemo<BoardCard[]>(
    () =>
      (board.board?.tasks ?? []).map((t) => {
        const lot = town.byId(t.place)
        return { ...t, title: capitalised(lot?.name ?? t.place), done: board.board?.done[t.place] ?? 0, facade: lot?.place?.facade }
      }),
    [board.board, town],
  )

  const spots = useMemo(() => town.lots.map((l) => ({ id: l.id, name: l.name, open: l.open, facade: l.place?.facade })), [town.lots])

  if (!ready) return <PageLoader />
  if (avatarUpdatedAt === 0 && !created) {
    return (
      <div data-world="dia" className="h-dvh w-full overflow-hidden font-display">
        <AvatarCreator
          initial={avatar}
          owned={wardrobeOwned(owned)}
          onDone={(spec) => {
            worldSfx.happy()
            setCreated(true)
            void setAvatar(spec)
          }}
          className="h-full"
        />
      </div>
    )
  }

  const zoom = reduced ? { duration: 0 } : { duration: 0.45, ease: [0.3, 0.1, 0.2, 1] as const }
  const inside = where.at === 'street' ? undefined : town.byId(where.at)?.place
  const origin = where.at !== 'street' ? `${where.origin.x}px ${where.origin.y}px` : '50% 50%'
  const Place = inside?.Component

  return (
    <div data-world="dia" className="relative h-dvh w-full overflow-hidden bg-[var(--world-sky-bottom,#d7f0ff)] font-display">
      <h1 className="sr-only">El Poble dels Números</h1>
      <AnimatePresence initial={false} mode="popLayout">
        {!inside || !Place ? (
          <motion.main
            key="street"
            className="absolute inset-0"
            initial={reduced ? false : { scale: 2.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 2.6, opacity: 0 }}
            transition={zoom}
            style={{ transformOrigin: origin }}
          >
            <Street
              avatar={avatar}
              spots={spots}
              onEnter={enter}
              onOffsetChange={rememberOffset}
              {...(savedOffset !== undefined ? { initialOffset: savedOffset } : {})}
              {...(walk ? { walkTo: walk } : {})}
              {...(name && !greeted ? { greeting: `Hola, ${name}!` } : {})}
            />
          </motion.main>
        ) : (
          <motion.main
            key={inside.id}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden"
            initial={reduced ? false : { scale: 0.25, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 0.3, opacity: 0 }}
            transition={zoom}
            style={{ transformOrigin: origin }}
          >
            <Suspense fallback={<PageLoader />}>
              <Place pending={board.pendingAt(inside.id)} callSignal={callSignal} onSolved={() => board.solved(inside.id)} onExit={exit} />
            </Suspense>
          </motion.main>
        )}
      </AnimatePresence>
      <Hud
        avatar={avatar}
        coins={coins}
        pendingErrands={board.pending}
        onWardrobe={() => (onWardrobe ? onWardrobe() : setWardrobe(true))}
        onErrands={() => {
          worldSfx.doorbell()
          setShowBoard(true)
        }}
      />
      {where.at === 'street' && <PlayerChip avatar={avatar} />}
      {showBoard && <ErrandBoard cards={cards} onGo={goTo} onClose={() => setShowBoard(false)} />}
      {board.reveal && <GiftReveal reveal={board.reveal} avatar={avatar} onWear={(spec) => void setAvatar(spec)} onClose={board.dismiss} />}
      {wardrobe && (
        <Suspense fallback={null}>
          <Wardrobe onClose={() => setWardrobe(false)} />
        </Suspense>
      )}
    </div>
  )
}
