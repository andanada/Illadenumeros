import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import { AvatarCreator, WEARABLES_BY_ID } from '../characters'
import { catalogEntry, useWorld } from '../data'
import type { AvatarSpec } from '../model/types'
import { FitProp } from '../scene/art'
import { useWorldReducedMotion } from '../scene/useReducedMotion'
import { worldSfx } from '../scene/worldSfx'
import { buyFeedback, NOT_ENOUGH, priceTag, unownedWorn, wardrobeOwned } from './wardrobeLogic'

export interface WardrobeProps {
  onClose: () => void
}

/** «L’armari»: try anything on; what she does not own has a price tag and can be bought here with her coins. */
export function Wardrobe({ onClose }: WardrobeProps) {
  const { ready } = useWorld()
  // Wait for her saved look: the creator starts from it.
  return ready ? <WardrobeBody onClose={onClose} /> : null
}

function WardrobeBody({ onClose }: WardrobeProps) {
  const world = useWorld()
  const reduced = useWorldReducedMotion()
  const [started] = useState<AvatarSpec>(world.avatar)
  const [spec, setSpec] = useState<AvatarSpec>(world.avatar)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const owned = useMemo(() => wardrobeOwned(world.owned), [world.owned])
  const priceOf = useCallback((id: string) => priceTag(id, owned), [owned])
  const toBuy = unownedWorn(spec, owned, started)[0]
  const entry = toBuy ? catalogEntry(toBuy) : undefined

  const buy = async (): Promise<void> => {
    if (!entry || busy) return
    if (world.coins < entry.price) {
      worldSfx.almost()
      setMessage(NOT_ENOUGH)
      return
    }
    setBusy(true)
    const result = await world.buy(entry)
    setBusy(false)
    if (result.ok) worldSfx.kaching()
    setMessage(buyFeedback(result.ok ? { ok: true, charged: result.charged } : { ok: false, reason: result.reason }, entry.name))
  }

  const done = async (next: AvatarSpec): Promise<void> => {
    if (unownedWorn(next, owned, started).length > 0) {
      setMessage('Primer compra el que t’emproves, o tria una altra peça!')
      return
    }
    const saved = await world.setAvatar(next)
    if (saved.ok) {
      worldSfx.happy()
      onClose()
    } else setMessage('Ui, no s’ha pogut desar. Torna-ho a provar!')
  }

  const footer = (
    <div className="flex min-h-[4.5rem] shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pt-2">
      <AnimatePresence mode="popLayout">
        {entry && (
          <motion.div
            key={entry.id}
            initial={reduced ? false : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 20, opacity: 0 }}
            className="flex min-w-0 max-w-full items-center gap-2"
          >
            <span className="min-w-0 truncate text-lg font-bold text-[var(--world-carbo)]">{WEARABLES_BY_ID[entry.id]?.name ?? entry.name}</span>
            <button
              type="button"
              onClick={() => void buy()}
              disabled={busy}
              aria-label={`Compra ${entry.name} per ${entry.price} monedes`}
              className="flex min-h-16 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--world-menta)] px-5 text-xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-60"
            >
              <FitProp id="moneda-poble" box={30} />
              {entry.price} · Compra-la!
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <p role="status" aria-live="polite" className="w-full text-center text-lg font-semibold text-[var(--world-text-soft)] empty:hidden">
        {message}
      </p>
    </div>
  )

  return (
    <div role="dialog" aria-modal="true" aria-label="L’armari" className="fixed inset-0 z-[60] bg-[var(--world-sky-bottom)]">
      <AvatarCreator
        initial={started}
        title="L’armari"
        avatarName="El teu personatge"
        priceOf={priceOf}
        onChange={(next) => {
          setSpec(next)
          setMessage('')
        }}
        onDone={(next) => void done(next)}
        footer={footer}
        className="h-full"
      />
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 lg:left-[calc(44%-11rem)] lg:right-auto">
        <p aria-label={`${world.coins} monedes`} className="flex min-h-14 items-center gap-2 rounded-full bg-white px-4 text-2xl font-bold tabular-nums text-[var(--world-ink)] shadow-[var(--world-shadow-lift)]">
          <FitProp id="moneda-poble" box={30} />
          <span aria-hidden="true">{world.coins}</span>
        </p>
        <button
          type="button"
          aria-label="Tanca l’armari"
          onClick={onClose}
          className="grid size-14 place-items-center rounded-full bg-white text-2xl font-bold text-[var(--world-ink)] shadow-[var(--world-shadow-lift)]"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  )
}
