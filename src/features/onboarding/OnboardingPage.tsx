import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { speak } from '../../core/audio/speech'
import { useProgress } from '../../core/progress/store'
import type { CharacterId, ThemeColor } from '../../core/storage/db'
import { Button } from '../../ui/Button'
import { Screen } from '../../ui/Screen'
import { CharacterStep, ColorStep, NameStep, WelcomeStep } from './OnboardingSteps'
import { validateName } from './nameSchema'
import { welcomeText } from './welcomeText'

const STEPS = ['nom', 'personatge', 'color', 'benvinguda'] as const
const LAST_STEP = STEPS.length - 1

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

export default function OnboardingPage() {
  const navigate = useNavigate()
  const saveProfile = useProgress((s) => s.saveProfile)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [character, setCharacter] = useState<CharacterId>()
  const [color, setColor] = useState<ThemeColor>('lila')
  const [saving, setSaving] = useState(false)

  const pickColor = (c: ThemeColor) => {
    setColor(c)
    document.documentElement.dataset.theme = c
  }

  useEffect(() => {
    if (step === LAST_STEP && character) speak(welcomeText(name, character))
  }, [step, character, name])

  const finish = async () => {
    const check = validateName(name)
    if (!check.ok || !character) return
    setSaving(true)
    try {
      await saveProfile({ name: check.name, character, color })
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

  const canContinue = step !== 1 || character !== undefined

  return (
    <Screen back={step === 0 ? '/start' : () => setStep(step - 1)} right={<Dots step={step} />}>
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
        {step === 1 && <CharacterStep value={character} onPick={setCharacter} />}
        {step === 2 && <ColorStep value={color} onPick={pickColor} />}
        {step === LAST_STEP && character && <WelcomeStep name={name} character={character} />}
        {step === LAST_STEP && error && (
          <p role="alert" className="text-xl font-semibold text-chicle">
            {error}
          </p>
        )}
        <Button big tilt={-1.5} disabled={!canContinue || saving} onClick={() => void next()}>
          {step === LAST_STEP ? 'Som-hi!' : 'Continua'}
        </Button>
      </div>
    </Screen>
  )
}
