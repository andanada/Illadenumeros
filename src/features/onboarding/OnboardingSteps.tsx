import { motion } from 'motion/react'
import { sfx } from '../../core/audio/sfx'
import { CHARACTER_IDS, THEME_COLORS, type CharacterId, type ThemeColor } from '../../core/storage/db'
import { CHARACTERS } from '../../ui/mascot/characters'
import { Mascot } from '../../ui/mascot/Mascot'
import { welcomeText } from './welcomeText'

export const MAX_NAME = 20

export function NameStep({
  name,
  error,
  onChange,
  onSubmit,
}: {
  name: string
  error: string | undefined
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <form
      className="flex w-full max-w-xl flex-col items-center gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor="nom" className="text-4xl font-bold tracking-tight text-brand-dark">
        Com et dius?
      </label>
      <input
        id="nom"
        value={name}
        maxLength={MAX_NAME}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        aria-invalid={error !== undefined}
        aria-describedby={error ? 'nom-error' : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder="El teu nom"
        className="sticker min-h-20 w-full select-text rounded-[1.6rem] bg-white px-6 text-center text-4xl font-bold text-ink placeholder:text-ink/30"
      />
      <p id="nom-error" role="alert" className="min-h-8 text-xl font-semibold text-chicle">
        {error}
      </p>
    </form>
  )
}

export function CharacterStep({ value, onPick }: { value: CharacterId | undefined; onPick: (id: CharacterId) => void }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <h2 className="text-4xl font-bold tracking-tight text-brand-dark">Qui és el teu preferit?</h2>
      <div role="radiogroup" aria-label="Personatge preferit" className="flex flex-wrap justify-center gap-4">
        {CHARACTER_IDS.map((id, i) => {
          const selected = value === id
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={CHARACTERS[id].name}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                sfx.pop()
                onPick(id)
              }}
              style={{ rotate: selected ? 0 : i % 2 === 0 ? -3 : 3 }}
              className={`sticker flex min-h-40 w-36 flex-col items-center rounded-[1.8rem] px-2 pb-3 pt-2 ${selected ? 'bg-brand-soft ring-4 ring-brand' : 'bg-white'}`}
            >
              <Mascot character={id} mood={selected ? 'balla' : 'pensa'} size={96} />
              <span className="mt-1 text-2xl font-bold text-brand-dark">{CHARACTERS[id].name}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

const SWATCH: Record<ThemeColor, { hex: string; label: string }> = {
  lila: { hex: '#8b5cf6', label: 'Lila' },
  rosa: { hex: '#ec4899', label: 'Rosa' },
  blau: { hex: '#3b82f6', label: 'Blau' },
  menta: { hex: '#14b8a6', label: 'Menta' },
  taronja: { hex: '#f97316', label: 'Taronja' },
  negre: { hex: '#1d1530', label: 'Negre' },
}

export function ColorStep({ value, onPick }: { value: ThemeColor; onPick: (c: ThemeColor) => void }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <h2 className="text-4xl font-bold tracking-tight text-brand-dark">Quin color t’agrada?</h2>
      <div role="radiogroup" aria-label="Color preferit" className="grid grid-cols-3 gap-5">
        {THEME_COLORS.map((c, i) => (
          <motion.button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={SWATCH[c].label}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              sfx.pop()
              onPick(c)
            }}
            style={{ background: SWATCH[c].hex, rotate: value === c ? 0 : i % 2 === 0 ? -4 : 4 }}
            className={`sticker grid size-24 place-items-center rounded-full text-4xl text-white ${value === c ? 'ring-4 ring-ink ring-offset-2' : ''}`}
          >
            {value === c ? '✓' : ''}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export function WelcomeStep({ name, character }: { name: string; character: CharacterId }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Mascot character={character} mood="salut" size={190} />
      <p className="sticker max-w-md rounded-[2rem] bg-white px-6 py-4 text-3xl font-bold leading-snug text-brand-dark">
        {welcomeText(name, character)}
      </p>
    </div>
  )
}
