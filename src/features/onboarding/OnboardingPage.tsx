import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { speak } from '../../core/audio/speech'
import { useProgress } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Screen } from '../../ui/Screen'
import { AvatarCreator, defaultAvatar } from '../../world/characters'
import { saveAvatar } from '../../world/data'
import type { AvatarSpec } from '../../world/model/types'
import { wardrobeOwned } from '../../world/wardrobe/wardrobeLogic'
import { NameStep, WelcomeTownStep } from './OnboardingSteps'
import { validateName } from './nameSchema'
import { profileFromAvatar } from './profileFromAvatar'
import { welcomeText } from './welcomeText'

const STEPS = ['nom', 'personatge', 'benvinguda'] as const
const LAST_STEP = STEPS.length - 1
const STARTER = defaultAvatar('nuvol', 'menta')

function Dots({ step }: { step: number }) {
  return (
    <div role="img" aria-label={`Pas ${step + 1} de ${STEPS.length}`} className="flex gap-3 pr-2">
      {STEPS.map((s, i) => (
        <span
          key={s}
          className={`size-4 rounded-full border-2 border-white shadow ${i === step ? 'scale-125 bg-chicle' : i < step ? 'bg-brand' : 'bg-ink/20'}`}
        />
      ))}
    </div>
  )
}

const setTheme = (spec: AvatarSpec): void => {
  document.documentElement.dataset.theme = profileFromAvatar(spec).color
}

/** First day: her name → her character («Crea el teu personatge») → «Benvinguda al poble!» → the arrival errands. */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const createPlayer = useProgress((s) => s.createPlayer)
  const hasPlayers = useProgress((s) => s.players.length > 0)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [avatar, setAvatar] = useState<AvatarSpec>(STARTER)
  const [saving, setSaving] = useState(false)
  const owned = useMemo(() => wardrobeOwned([]), [])
  const pet = profileFromAvatar(avatar).character

  useEffect(() => {
    if (step === LAST_STEP) speak(welcomeText(name, pet))
  }, [step, name, pet])

  const finish = async () => {
    const check = validateName(name)
    if (!check.ok) return
    setSaving(true)
    try {
      // Every onboarding creates a new player, with an empty progress of their own; then her look is saved.
      await createPlayer({ name: check.name, ...profileFromAvatar(avatar) })
      await saveAvatar(avatar)
      navigate('/diagnostic', { replace: true })
    } catch {
      setError('Ui, no s’ha pogut desar. Torna-ho a provar!')
      setSaving(false)
    }
  }

  const next = async () => {
    if (step === 0) {
      const check = validateName(name)
      if (!check.ok) return setError(check.message)
      setError(undefined)
      setName(check.name)
    }
    if (step === LAST_STEP) return finish()
    setStep(step + 1)
  }

  if (step === 1) {
    return (
      <div className="h-dvh w-full overflow-hidden font-display">
        <AvatarCreator
          initial={avatar}
          owned={owned}
          onChange={setTheme}
          onDone={(spec) => {
            setAvatar(spec)
            setTheme(spec)
            setStep(2)
          }}
          className="h-full"
        />
      </div>
    )
  }

  return (
    <Screen back={step === 0 ? (hasPlayers ? '/qui-juga' : '/start') : () => setStep(step - 1)} right={<Dots step={step} />}>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-10 text-center">
        {step === 0 && (
          <NameStep
            name={name}
            error={error}
            onChange={(v) => {
              setName(v)
              setError(undefined)
            }}
            onSubmit={() => void next()}
          />
        )}
        {step === LAST_STEP && <WelcomeTownStep name={name} avatar={avatar} pet={pet} />}
        {step === LAST_STEP && error && (
          <p role="alert" className="text-xl font-semibold text-chicle">
            {error}
          </p>
        )}
        <Button big tilt={-1.5} disabled={saving} onClick={() => void next()}>
          {step === LAST_STEP ? 'Som-hi!' : 'Continua'}
        </Button>
      </div>
    </Screen>
  )
}
