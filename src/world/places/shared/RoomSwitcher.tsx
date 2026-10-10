import { Avatar, NEIGHBOURS_BY_ID, neighbourFromSeed, Pet } from '../../characters'
import { useCast } from '../../sandbox/CastContext'
import { useItems } from '../../sandbox/ItemsContext'

/**
 * «Qui mous?»: one round button for each character who is in the room the child is looking at (the
 * customers outside in the street are not offered), plus «Accions». The touch / keyboard way to choose.
 */
export function RoomSwitcher({ className = '', room: wanted }: { className?: string; room?: string }) {
  const cast = useCast()
  const api = useItems()
  const room = wanted ?? cast.state.actors[cast.state.selected]?.room ?? cast.defaultRoom
  const here = cast.order.filter((id) => (cast.state.actors[id]?.room ?? cast.defaultRoom) === room)
  return (
    <div role="group" aria-label="Qui mous?" className={`absolute z-[3000] flex flex-wrap items-center gap-1.5 sm:gap-2 ${className}`} style={className ? { maxWidth: '70%' } : { left: 12, top: 12, maxWidth: '70%' }}>
      {here.map((id) => {
        const seed = cast.seeds[id]
        if (!seed) return null
        const selected = cast.state.selected === id
        const person = seed.kind === 'neighbour' && seed.neighbour ? (NEIGHBOURS_BY_ID[seed.neighbour] ?? neighbourFromSeed(seed.neighbour)).spec : seed.avatar
        return (
          <button
            key={id}
            type="button"
            data-switch={id}
            aria-label={`Mou ${seed.name}`}
            aria-pressed={selected}
            onClick={(e) => {
              e.stopPropagation()
              api.selectActor(id)
            }}
            className={`grid size-12 cursor-pointer place-items-center overflow-hidden rounded-full border-4 sm:size-14 bg-white p-0 shadow-[var(--world-shadow-soft)] outline-none transition-transform active:scale-90 focus-visible:outline-4 focus-visible:outline-[var(--world-focus,#4da6ec)] ${selected ? 'scale-110 border-[var(--world-sol,#ffb834)]' : 'border-white'}`}
          >
            {seed.kind === 'pet' && seed.pet ? <Pet id={seed.pet} size={36} animated={false} title="" /> : person ? <Avatar spec={person} crop="head" size={44} animated={false} /> : null}
          </button>
        )
      })}
      <button
        type="button"
        aria-label="Accions"
        aria-expanded={api.ringOpen}
        onClick={(e) => {
          e.stopPropagation()
          api.setRingOpen(!api.ringOpen)
        }}
        className="grid size-12 cursor-pointer place-items-center rounded-full border-4 border-white bg-[var(--world-lila,#9a7be6)] p-0 text-3xl font-bold text-white shadow-[var(--world-shadow-soft)] outline-none sm:size-14 active:scale-90 focus-visible:outline-4 focus-visible:outline-[var(--world-focus,#4da6ec)]"
      >
        <span aria-hidden="true">✦</span>
      </button>
    </div>
  )
}
