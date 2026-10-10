import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { unlockAudio } from '../../core/audio/sfx'
import { isMuted, setMuted } from '../../core/audio/speech'
import { SyncStatusDot } from '../../features/account/SyncStatusDot'
import { AdultGate } from '../../features/family/AdultGate'
import type { AvatarSpec } from '../model/types'
import { Avatar } from '../scene/art'
import { worldSfx } from '../scene/worldSfx'
import { CoinCounter } from './CoinCounter'
import type { JarProgress } from './jarMessage'
import { StarJar } from './StarJar'

export interface HudProps {
  avatar: AvatarSpec
  coins: number
  /** Today's maths as a jar of stars (passive). */
  jar: JarProgress
  /** The avatar bubble: opens the wardrobe (slot for the wardrobe screen). */
  onWardrobe: () => void
}

const round = 'grid size-16 shrink-0 place-items-center rounded-full bg-white text-3xl shadow-[var(--world-shadow-lift)] active:translate-y-0.5 active:shadow-[var(--world-shadow-press)]'

function MuteButton() {
  const [muted, setLocal] = useState(isMuted)
  return (
    <button
      type="button"
      aria-label={muted ? 'Activa el so' : 'Silencia'}
      aria-pressed={muted}
      onClick={() => {
        unlockAudio()
        setMuted(!muted)
        setLocal(!muted)
      }}
      className={round}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔈'}</span>
    </button>
  )
}

function ParentsLock() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [seed] = useState(() => `poble-${new Date().toDateString()}`)
  return (
    <>
      <span className="relative">
        <button type="button" aria-label="Per a les famílies" onClick={() => setOpen(true)} className={`${round} text-2xl opacity-80`}>
          <span aria-hidden="true">🔒</span>
        </button>
        {/* Adults only: account sync state (decorative, nothing for the child to read). */}
        <span className="pointer-events-none absolute -right-1 -top-1 flex">
          <SyncStatusDot />
        </span>
      </span>
      {open && <AdultGate seed={seed} onPass={() => navigate('/familia')} onCancel={() => setOpen(false)} />}
    </>
  )
}

function AlbumButton() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      aria-label="Àlbum de pegatines"
      onClick={() => {
        unlockAudio()
        worldSfx.squish()
        navigate('/album')
      }}
      className={`${round} text-[1.7rem]`}
    >
      <span aria-hidden="true">📒</span>
    </button>
  )
}

/** Always-visible town HUD: avatar (wardrobe), coins, sticker album, the jar of stars, sound and the parents' lock. */
export function Hud({ avatar, coins, jar, onWardrobe }: HudProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between gap-2 p-2 sm:p-3 [&>*]:pointer-events-auto">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="El meu armari"
          onClick={() => {
            unlockAudio()
            worldSfx.squish()
            onWardrobe()
          }}
          className="grid size-16 place-items-center overflow-hidden rounded-full bg-[var(--world-cel-light,#9ccff7)] shadow-[var(--world-shadow-lift)] sm:size-[4.5rem]"
          style={{ background: '#9CCFF7' }}
        >
          <Avatar spec={avatar} crop="head" size={58} animated={false} />
        </button>
        <CoinCounter coins={coins} />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <AlbumButton />
        <StarJar jar={jar} />
        {/* Phones: sound and parents' lock wait in the bottom-right corner, so the top row fits. */}
        <div className="pointer-events-auto fixed bottom-3 right-3 flex items-center gap-2 sm:static">
          <MuteButton />
          <ParentsLock />
        </div>
      </div>
    </header>
  )
}
