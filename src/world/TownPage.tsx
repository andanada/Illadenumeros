import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { PageLoader } from '../app/PageLoader'
import { Hud } from './hud/Hud'
import { Street, type StreetPlaceId } from './scene/street/Street'
import { useWorldReducedMotion } from './scene/useReducedMotion'
import { useWorld } from './data'
import { worldSfx } from './scene/worldSfx'

const BotigaPlace = lazy(() => import('./places/botiga/BotigaPlace'))

/** Errands on the board per visit until the daily board (Phase 2) exists. */
export const ERRANDS_PER_VISIT = 3

type Where = { at: 'street' } | { at: 'botiga'; origin: { x: number; y: number } }

export interface TownPageProps {
  /** Slot for the wardrobe screen (built by the art / data agents). */
  onWardrobe?: () => void
}

function WardrobeSoon({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="L’armari" className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="rounded-[2rem] bg-white p-6 text-center shadow-[var(--world-shadow-lift)]" onClick={(e) => e.stopPropagation()}>
        <p className="text-2xl font-bold text-[var(--world-ink,#2b2440)]">L’armari obre aviat!</p>
        <button type="button" onClick={onClose} className="mt-4 min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-7 text-2xl font-bold text-white">
          D’acord
        </button>
      </div>
    </div>
  )
}

/** «El Poble dels Números»: the street, the places behind its doors, and the HUD on top. */
export default function TownPage({ onWardrobe }: TownPageProps) {
  const { avatar, coins } = useWorld()
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
      {wardrobe && <WardrobeSoon onClose={() => setWardrobe(false)} />}
    </div>
  )
}
