import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLoader } from '../app/PageLoader'
import { AvatarCreator } from './characters'
import { Hud } from './hud/Hud'
import { Street, type StreetPlaceId } from './scene/street/Street'
import { useWorldReducedMotion } from './scene/useReducedMotion'
import { useWorld } from './data'
import { worldSfx } from './scene/worldSfx'
import { wardrobeOwned } from './wardrobe/wardrobeLogic'

const Wardrobe = lazy(() => import('./wardrobe/Wardrobe').then((m) => ({ default: m.Wardrobe })))

const BotigaPlace = lazy(() => import('./places/botiga/BotigaPlace'))

/** Errands on the board per visit until the daily board (Phase 2) exists. */
export const ERRANDS_PER_VISIT = 3

type Where = { at: 'street' } | { at: 'botiga'; origin: { x: number; y: number } }

export interface TownPageProps {
  /** Overrides the wardrobe (tests); by default the avatar bubble opens L’armari. */
  onWardrobe?: () => void
}

/** «El Poble dels Números»: the street, the places behind its doors, and the HUD on top. */
export default function TownPage({ onWardrobe }: TownPageProps) {
  const { avatar, coins, owned, ready, avatarUpdatedAt, setAvatar } = useWorld()
  const navigate = useNavigate()
  /** First visit: she makes her character before the street (dismissed even if saving fails). */
  const [created, setCreated] = useState(false)
  const reduced = useWorldReducedMotion()
  const [where, setWhere] = useState<Where>({ at: 'street' })
  const [pending, setPending] = useState(ERRANDS_PER_VISIT)
  const [callSignal, setCallSignal] = useState(0)
  const [wardrobe, setWardrobe] = useState(false)
  const streetOffset = useRef<number | undefined>(undefined)
  /** Where the street was when the child went in, so she comes out at the same door. */
  const [savedOffset, setSavedOffset] = useState<number | undefined>(undefined)

  const enter = useCallback((place: StreetPlaceId, from?: DOMRect) => {
    if (place !== 'botiga') return
    const origin = from ? { x: from.left + from.width / 2, y: from.top + from.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    setSavedOffset(streetOffset.current)
    setWhere({ at: 'botiga', origin })
  }, [])

  const exit = useCallback(() => setWhere({ at: 'street' }), [])
  const onSolved = useCallback(() => setPending((n) => Math.max(0, n - 1)), [])
  const rememberOffset = useCallback((v: number) => {
    streetOffset.current = v
  }, [])

  const onErrands = (): void => {
    if (where.at === 'street') {
      worldSfx.doorbell()
      enter('botiga')
    } else {
      worldSfx.doorbell()
      setCallSignal((n) => n + 1)
    }
  }

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
  const origin = where.at === 'botiga' ? `${where.origin.x}px ${where.origin.y}px` : '50% 50%'

  return (
    <div data-world="dia" className="relative h-dvh w-full overflow-hidden bg-[var(--world-sky-bottom,#d7f0ff)] font-display">
      <h1 className="sr-only">El Poble dels Números</h1>
      <AnimatePresence initial={false} mode="popLayout">
        {where.at === 'street' ? (
          <motion.main
            key="street"
            className="absolute inset-0"
            initial={reduced ? false : { scale: 2.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 2.6, opacity: 0 }}
            transition={zoom}
            style={{ transformOrigin: origin }}
          >
            <Street avatar={avatar} onEnter={enter} onOffsetChange={rememberOffset} {...(savedOffset !== undefined ? { initialOffset: savedOffset } : {})} />
          </motion.main>
        ) : (
          <motion.main
            key="botiga"
            className="absolute inset-0 overflow-y-auto overflow-x-hidden"
            initial={reduced ? false : { scale: 0.25, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 0.3, opacity: 0 }}
            transition={zoom}
            style={{ transformOrigin: origin }}
          >
            <Suspense fallback={<PageLoader />}>
              <BotigaPlace pending={pending} callSignal={callSignal} onSolved={onSolved} onExit={exit} />
            </Suspense>
          </motion.main>
        )}
      </AnimatePresence>
      <Hud
        avatar={avatar}
        coins={coins}
        pendingErrands={pending}
        onWardrobe={() => (onWardrobe ? onWardrobe() : setWardrobe(true))}
        onErrands={onErrands}
      />
      {where.at === 'street' && (
        <button
          type="button"
          onClick={() => navigate('/map')}
          className="absolute bottom-3 left-3 z-40 flex min-h-12 items-center gap-1.5 rounded-full bg-white/85 px-4 text-lg font-bold text-[var(--world-text-soft,#6b5f80)] shadow-[var(--world-shadow-soft)]"
        >
          <span aria-hidden="true">‹</span>Mapa
        </button>
      )}
      {wardrobe && (
        <Suspense fallback={null}>
          <Wardrobe onClose={() => setWardrobe(false)} />
        </Suspense>
      )}
    </div>
  )
}
