import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { focusSkill } from '../../core/engine/sessionSelector'
import { todayKey, useProgress } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Mascot } from '../../ui/mascot/Mascot'
import { MuteToggle, Screen } from '../../ui/Screen'
import { SyncStatusDot } from '../account/SyncStatusDot'
import { AdultGate } from '../family/AdultGate'
import { RegionSection } from './RegionSection'
import { StopSheet } from './StopSheet'
import { starsFor, REGIONS, GRADE_LABEL, playableRegions } from './stops'
import type { SkillNode } from '../../core/ambit/types'

export default function MapPage() {
  const navigate = useNavigate()
  const profile = useProgress((s) => s.profile)
  const states = useProgress((s) => s.skillStates)
  const rewards = useProgress((s) => s.rewards)
  const clearActivePlayer = useProgress((s) => s.clearActivePlayer)
  const [open, setOpen] = useState<SkillNode>()
  /** Seed of the adult check while the lock dialog is open. */
  const [gateSeed, setGateSeed] = useState<string>()

  const focusId = useMemo(() => focusSkill(MATES_SKILLS, states), [states])
  const regions = useMemo(() => playableRegions(MATES_SKILLS), [])
  if (!profile) return null
  const missionDone = rewards.missionsDone.includes(todayKey())

  return (
    <Screen
      title="L’Illa dels Números"
      right={
        <>
          <div
            aria-label={`${rewards.petals} pètals`}
            className="sticker flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-xl font-bold text-brand-dark sm:min-h-16 sm:px-5 sm:text-2xl"
          >
            <span aria-hidden="true">🌸</span>
            {rewards.petals}
          </div>
          <button
            type="button"
            aria-label="Àlbum de pegatines"
            onClick={() => navigate('/album')}
            className="sticker grid size-12 shrink-0 rotate-3 place-items-center rounded-2xl bg-white text-2xl sm:size-16 sm:text-3xl"
          >
            📒
          </button>
          <MuteToggle />
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
        <div className="flex items-end gap-3">
          <Mascot character={profile.character} mood="salut" size={110} />
          <p className="sticker mb-6 rounded-[1.6rem] rounded-bl-md bg-white px-5 py-3 text-2xl font-bold text-brand-dark">
            Hola, {profile.name}!
          </p>
        </div>
        <button
          type="button"
          aria-label={`Canvia de jugador/a (ara juga ${profile.name})`}
          onClick={() => {
            // Leave the map first: once nobody is active, the protected routes would redirect.
            navigate('/qui-juga')
            void clearActivePlayer()
          }}
          className="sticker -mt-3 flex min-h-14 items-center gap-2 self-start rounded-full bg-white py-1 pl-1 pr-5 text-lg font-bold text-brand-dark"
        >
          <span className="grid size-12 place-items-center overflow-hidden rounded-full bg-brand-soft">
            <Mascot character={profile.character} mood="pensa" size={44} />
          </span>
          <span className="max-w-40 truncate">{profile.name}</span>
          <span className="text-base font-semibold text-ink/60">· Canvia</span>
        </button>

        <Button
          big
          tilt={-1.5}
          variant={missionDone ? 'ok' : 'primary'}
          className="min-h-24 w-full text-4xl"
          onClick={() => navigate('/mission')}
        >
          {missionDone ? '✓ ' : ''}Missió d’avui
        </Button>
        {missionDone && <p className="-mt-3 text-center text-lg font-semibold text-ok">Ja l’has feta! Pots jugar més.</p>}

        {regions.map(({ region, skills }) => (
          <RegionSection key={region.id} region={region} skills={skills} states={states} focusId={focusId} onOpen={setOpen} />
        ))}

        {REGIONS.some((r) => !regions.some((entry) => entry.region.id === r.id)) && (
          <ul className="flex flex-col gap-4">
            {REGIONS.filter((r) => !regions.some((entry) => entry.region.id === r.id)).map((region, i) => (
              <li
                key={region.id}
                className={`sticker flex items-center gap-4 rounded-[1.6rem] bg-white/70 p-4 ${i % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
              >
                <span aria-hidden="true" className="text-4xl grayscale">
                  {region.emoji}
                </span>
                <div className="flex-1">
                  <p className="text-xl font-bold leading-tight text-ink/60">{region.name}</p>
                  <p className="text-base font-semibold text-ink/50">{GRADE_LABEL[region.grade]}</p>
                </div>
                <span className="rounded-full bg-sol px-4 py-1 text-lg font-bold">Aviat!</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-center pt-4">
          <span className="relative">
            <button
              type="button"
              aria-label="Per a la família (només adults)"
              onClick={() => setGateSeed(crypto.randomUUID())}
              className="sticker grid size-12 place-items-center rounded-full bg-white/80 text-xl opacity-70"
            >
              <span aria-hidden="true">🔒</span>
            </button>
            {/* Adults only: account sync state (decorative, nothing for the child to read). */}
            <span className="pointer-events-none absolute -right-1 -top-1 flex">
              <SyncStatusDot />
            </span>
          </span>
        </div>
      </div>

      {gateSeed && <AdultGate seed={gateSeed} onPass={() => navigate('/familia')} onCancel={() => setGateSeed(undefined)} />}

      {open && (
        <StopSheet
          skill={open}
          stars={starsFor(states[open.id])}
          onClose={() => setOpen(undefined)}
          onPlay={(gameId) => navigate(`/play/${gameId}?skills=${open.id}`)}
        />
      )}
    </Screen>
  )
}
