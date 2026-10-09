import { motion } from 'motion/react'
import { useEffect, useMemo, useReducer, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Grain } from '../art/Grain'
import type { AvatarSpec } from '../model/types'
import { CREATOR_TABS, creatorReducer, initCreator, optionsFor, type CreatorTab } from './creator/creatorReducer'
import { CreatorStage } from './creator/CreatorStage'
import { DiceIcon, TabIcon } from './creator/icons'
import { CreatorPanel, type PriceOf } from './creator/panels'
import { useCalm } from './useBlink'

export interface AvatarCreatorProps {
  /** Starting look (e.g. defaultAvatar(profile.character, profile.color) or the saved one). */
  initial: AvatarSpec
  /** Called after every change (live preview elsewhere, autosave). Not called for the initial spec. */
  onChange?: (spec: AvatarSpec) => void
  /** "Fet!" pressed. */
  onDone: (spec: AvatarSpec) => void
  /** Owned wearable ids. Undefined = everything selectable. Faces, skin and worn items are always available. */
  owned?: readonly string[]
  /** Heading. Default "Crea el teu personatge". */
  title?: string
  /** Accessible name of the preview avatar. Default "El teu personatge". */
  avatarName?: string
  className?: string
  /** Wardrobe shop: price of tiles she does not own yet (shown as a tag, read in the tile's name). */
  priceOf?: PriceOf
  /** Extra row above the bottom buttons (e.g. the wardrobe's buy bar). */
  footer?: ReactNode
}

const TAB_LABELS: Readonly<Record<CreatorTab, { short: string; long: string }>> = {
  pell: { short: 'Pell', long: 'Pell' },
  cabell: { short: 'Cabell', long: 'Cabell' },
  cara: { short: 'Cara', long: 'Cara' },
  dalt: { short: 'Dalt', long: 'Roba de dalt' },
  baix: { short: 'Baix', long: 'Roba de baix' },
  sabates: { short: 'Sabates', long: 'Sabates' },
  complements: { short: 'Extres', long: 'Complements' },
}

export function AvatarCreator({ initial, onChange, onDone, owned, title = 'Crea el teu personatge', avatarName = 'El teu personatge', className, priceOf, footer }: AvatarCreatorProps) {
  const options = useMemo(() => optionsFor(owned, initial), [owned, initial])
  const [state, dispatch] = useReducer(creatorReducer, undefined, () => initCreator(initial, options))
  const calm = useCalm()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const first = useRef(true)
  const changed = useRef(onChange)

  useEffect(() => {
    changed.current = onChange
  }, [onChange])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    changed.current?.(state.spec)
  }, [state.spec])

  const onTabKey = (e: KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const n = CREATOR_TABS.length
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (index + step + n) % n
    const tab = CREATOR_TABS[next]
    if (tab) dispatch({ type: 'tab', tab })
    tabRefs.current[next]?.focus()
  }

  return (
    <section
      data-world="dia"
      aria-label={title}
      className={['relative isolate flex h-full min-h-0 flex-col overflow-hidden text-[var(--world-text)] lg:flex-row', className].filter(Boolean).join(' ')}
      style={{ background: 'linear-gradient(180deg, var(--world-sky-top), var(--world-sky-bottom) 70%)' }}
    >
      <div className="relative flex h-[38%] min-h-[250px] shrink-0 flex-col lg:h-auto lg:flex-[0_0_44%]">
        <h1 className="relative z-10 px-5 pt-4 text-2xl font-bold leading-tight text-[var(--world-carbo)] drop-shadow-[0_2px_0_rgba(255,255,255,0.6)] sm:text-3xl lg:px-8 lg:pt-8 lg:text-4xl">
          {title}
        </h1>
        <CreatorStage spec={state.spec} spins={state.spins} fits={state.fits} name={avatarName} />
      </div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col rounded-t-[36px] bg-[var(--world-surface)] shadow-[0_-10px_0_rgba(43,36,64,0.06)] lg:m-5 lg:rounded-[36px] lg:shadow-[var(--world-shadow-lift)]">
        <div role="tablist" aria-label="Categories" className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 pt-4 [scrollbar-width:none]">
          {CREATOR_TABS.map((tab, i) => {
            const selected = state.tab === tab
            return (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                id={`creator-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="creator-panel"
                aria-label={TAB_LABELS[tab].long}
                tabIndex={selected ? 0 : -1}
                onClick={() => dispatch({ type: 'tab', tab })}
                onKeyDown={(e) => onTabKey(e, i)}
                className="world-chip flex min-h-[76px] min-w-[72px] shrink-0 flex-col items-center justify-center gap-0.5 px-2 text-sm font-semibold"
              >
                <TabIcon tab={tab} size={36} />
                <span aria-hidden="true">{TAB_LABELS[tab].short}</span>
              </button>
            )
          })}
        </div>

        <div id="creator-panel" role="tabpanel" aria-labelledby={`creator-tab-${state.tab}`} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 pt-2">
          <CreatorPanel state={state} dispatch={dispatch} {...(priceOf ? { priceOf } : {})} />
        </div>
        {footer}

        <div className="flex shrink-0 gap-3 border-t-4 border-[var(--world-surface-2)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <motion.button
            type="button"
            onClick={() => dispatch({ type: 'randomise', seed: `${Date.now()}-${state.spins}` })}
            whileTap={calm ? undefined : { scale: 0.92, rotate: -6 }}
            className="world-chip flex min-h-16 flex-1 items-center justify-center gap-2 bg-[var(--world-mango)]! text-xl font-bold text-[var(--world-carbo)]"
          >
            <motion.span key={state.spins} initial={calm ? false : { rotate: -200, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }} className="grid">
              <DiceIcon />
            </motion.span>
            Sorpresa!
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onDone(state.spec)}
            whileTap={calm ? undefined : { scale: 0.94 }}
            className="world-chip min-h-16 flex-1 bg-[var(--world-coral)]! text-2xl font-bold text-white"
          >
            Fet!
          </motion.button>
        </div>
      </div>
      <Grain />
    </section>
  )
}
