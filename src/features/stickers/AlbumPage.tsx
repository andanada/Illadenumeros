import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Mascot } from '../../ui/mascot/Mascot'
import { Screen } from '../../ui/Screen'
import { stableTilt } from './albumUtils'
import { STICKERS, type Sticker } from './catalog'

const PAGES: ReadonlyArray<{ region: Sticker['region']; title: string }> = [
  { region: 'bosc', title: 'Bosc dels Comptes' },
  { region: 'platja', title: 'Platja de les Desenes' },
  { region: 'castell', title: 'Fleca-Castell' },
]

function Slot({ sticker, owned }: { sticker: Sticker; owned: boolean }) {
  if (!owned) {
    return (
      <li
        aria-label="Pegatina per descobrir"
        className="grid size-24 place-items-center rounded-[1.6rem] border-4 border-dashed border-ink/20 text-3xl font-bold text-ink/30"
      >
        ?
      </li>
    )
  }
  return (
    <li
      aria-label={sticker.name}
      style={{ ['--tilt' as string]: `${stableTilt(sticker.id)}deg` }}
      className="sticker animate-peel grid size-24 place-items-center rounded-[1.6rem] bg-white text-5xl"
    >
      <span aria-hidden="true">{sticker.emoji}</span>
    </li>
  )
}

function OwnStickers() {
  return (
    <section aria-labelledby="meves" className="rounded-[2rem] border-4 border-dashed border-ink/20 p-5">
      <h2 id="meves" className="text-2xl font-bold text-brand-dark">
        Les meves pegatines
      </h2>
      <p className="mt-1 text-lg text-ink/70">Aviat podràs tenir aquí les teves pròpies imatges. Els teus pares les podran afegir.</p>
      <Button variant="soft" disabled aria-disabled="true" className="mt-3 min-h-16 text-xl">
        Afegir una imatge (aviat)
      </Button>
    </section>
  )
}

export default function AlbumPage() {
  const navigate = useNavigate()
  const profile = useProgress((s) => s.profile)
  const owned = useProgress((s) => s.rewards.stickers)
  const ownedSet = new Set(owned)
  const count = STICKERS.filter((s) => ownedSet.has(s.id)).length

  return (
    <Screen
      title="Àlbum de pegatines"
      back="/map"
      right={
        <p aria-label={`${count} de ${STICKERS.length} pegatines`} className="sticker min-h-16 rounded-full bg-white px-5 text-2xl font-bold leading-[3.5rem] text-brand-dark">
          {count} / {STICKERS.length}
        </p>
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16">
        {count === 0 && profile && (
          <div className="flex flex-wrap items-center justify-center gap-4 text-center">
            <Mascot character={profile.character} mood="anims" size={110} />
            <div className="flex flex-col items-center gap-3">
              <p className="max-w-xs text-2xl font-bold text-brand-dark">Encara no tens cap pegatina. Juga per guanyar la primera!</p>
              <Button tilt={-1.5} onClick={() => navigate('/mission')}>
                Fer la missió
              </Button>
            </div>
          </div>
        )}

        {PAGES.map(({ region, title }) => (
          <section key={region} aria-labelledby={`p-${region}`} className="rounded-[2rem] bg-white/60 p-4 shadow-inner">
            <h2 id={`p-${region}`} className="mb-3 text-2xl font-bold text-brand-dark">
              {title}
            </h2>
            <ul className="flex flex-wrap gap-4">
              {STICKERS.filter((s) => s.region === region).map((s) => (
                <Slot key={s.id} sticker={s} owned={ownedSet.has(s.id)} />
              ))}
            </ul>
          </section>
        ))}

        <OwnStickers />
      </div>
    </Screen>
  )
}
