import type { CharacterId } from '../../core/storage/db'
import { PropArt } from '../../world/art/props'
import { Avatar, Neighbour, Pet } from '../../world/characters'
import type { AvatarSpec } from '../../world/model/types'
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

/** «Benvinguda al poble!»: her new character in the street, her pet and a neighbour waving. */
export function WelcomeTownStep({ name, avatar, pet }: { name: string; avatar: AvatarSpec; pet: CharacterId }) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
      <h2 className="text-4xl font-bold tracking-tight text-brand-dark">Benvinguda al poble!</h2>
      <div
        data-world="dia"
        className="sticker relative flex h-64 w-full items-end justify-center gap-2 overflow-hidden rounded-[2rem] px-4 sm:h-72"
        style={{ background: 'linear-gradient(var(--world-sky-top), var(--world-sky-bottom))' }}
      >
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-12" style={{ background: 'var(--world-ground)' }} />
        <div aria-hidden="true" className="absolute bottom-8 left-[4%] opacity-90">
          <PropArt id="facana-botiga" size={170} title="" shadow={false} />
        </div>
        <div className="relative flex items-end gap-1">
          <Neighbour id="senyora-pilar" pose="wave" size={150} />
          <Avatar spec={avatar} pose="wave" size={190} title={`${name}, el teu personatge`} />
          <Pet id={pet} pose="happy" size={84} />
        </div>
      </div>
      <p className="sticker max-w-md rounded-[2rem] bg-white px-6 py-4 text-2xl font-bold leading-snug text-brand-dark">{welcomeText(name, pet)}</p>
    </div>
  )
}
