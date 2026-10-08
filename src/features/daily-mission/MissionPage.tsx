import { Suspense, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLoader } from '../../app/PageLoader'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { todayKey, useProgress } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Mascot } from '../../ui/mascot/Mascot'
import { Screen } from '../../ui/Screen'
import { GAME_REGISTRY } from '../play/gameRegistry'
import { GAME_EMOJI } from '../play/gameMeta'
import { GAME_TITLES } from '../play/gameTypes'
import { ChestScene } from './ChestScene'
import { buildMissionPlan } from './missionPlan'
import { MissionStrip } from './MissionStrip'

type Mode = 'intro' | 'choose' | 'play' | 'between' | 'chest'

const DAY_MS = 86_400_000

export default function MissionPage() {
  const navigate = useNavigate()
  const profile = useProgress((s) => s.profile)
  const grantSticker = useProgress((s) => s.grantSticker)
  const completeMission = useProgress((s) => s.completeMission)
  const [rewardedToday] = useState(() => useProgress.getState().rewards.missionsDone.includes(todayKey()))

  // The plan is frozen when the mission starts so progress made during it does not reshuffle the steps.
  const [plan] = useState(() => buildMissionPlan(MATES_SKILLS, useProgress.getState().skillStates, Math.floor(Date.now() / DAY_MS), useProgress.getState().factStates))
  const [mode, setMode] = useState<Mode>('intro')
  const [step, setStep] = useState(0)
  const [chosen, setChosen] = useState<string>()

  const toMap = useCallback(() => navigate('/map'), [navigate])
  const current = plan[step]

  const finishStep = useCallback(
    () => {
      setChosen(undefined)
      setMode(step === plan.length - 1 ? 'chest' : 'between')
    },
    [step, plan.length],
  )

  const next = () => {
    const upcoming = step + 1
    setStep(upcoming)
    setMode(plan[upcoming]?.gameId === undefined ? 'choose' : 'play')
  }

  const openChest = useCallback(async () => {
    const id = await grantSticker()
    await completeMission()
    return id
  }, [grantSticker, completeMission])

  if (!profile || !current) return null

  if (mode === 'play') {
    const gameId = current.gameId ?? chosen
    const Game = gameId ? GAME_REGISTRY[gameId] : undefined
    if (!Game) return null
    return (
      <Suspense fallback={<PageLoader />}>
        <Game
          key={`${step}-${gameId}`}
          {...(current.skillIds ? { skillIds: current.skillIds } : {})}
          {...(current.maxRounds !== undefined ? { maxRounds: current.maxRounds } : {})}
          onExit={toMap}
          onComplete={finishStep}
        />
      </Suspense>
    )
  }

  if (mode === 'chest') {
    return (
      <Screen>
        <ChestScene character={profile.character} alreadyRewarded={rewardedToday} onOpen={openChest} onMap={toMap} onAlbum={() => navigate('/album')} />
      </Screen>
    )
  }

  if (mode === 'choose') {
    return (
      <Screen title="Tria un joc" back={toMap}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-10">
          <div className="flex w-full max-w-md flex-col gap-5">
            {current.options.map((id, i) => (
              <Button
                key={id}
                big
                variant={i === 1 ? 'soft' : 'primary'}
                tilt={i % 2 === 0 ? -2 : 2}
                className="flex min-h-24 items-center justify-center gap-4"
                onClick={() => {
                  setChosen(id)
                  setMode('play')
                }}
              >
                <span aria-hidden="true">{GAME_EMOJI[id] ?? '🎮'}</span>
                {GAME_TITLES[id] ?? id}
              </Button>
            ))}
          </div>
        </div>
      </Screen>
    )
  }

  const doneCount = mode === 'intro' ? 0 : step + 1
  const upcoming = mode === 'intro' ? current : plan[step + 1]
  return (
    <Screen title="Missió d’avui" back={toMap}>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-10 text-center">
        <Mascot character={profile.character} mood={mode === 'intro' ? 'anims' : 'content'} size={150} />
        <p className="sticker max-w-md rounded-[2rem] bg-white px-6 py-4 text-3xl font-bold leading-snug text-brand-dark">
          {mode === 'intro' ? `Hola, ${profile.name}! Són 4 jocs ràpids.` : 'Molt bé! Anem pel següent.'}
        </p>
        <MissionStrip steps={plan} done={doneCount} />
        <Button big tilt={-1.5} onClick={mode === 'intro' ? () => setMode(current.gameId === undefined ? 'choose' : 'play') : next}>
          {upcoming ? `Som-hi: ${upcoming.label.toLowerCase()}` : 'Continua'}
        </Button>
      </div>
    </Screen>
  )
}
