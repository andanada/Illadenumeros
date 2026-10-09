import { countWord } from '../../../errands/requestText'
import { TapProp } from '../../../scene/Scene'
import { alight, board, type BusState } from '../freePlay'
import { Bus, SeatFace } from './BusArt'
import { BusRow, BusStop } from './BusStop'
import { StandingPassenger } from './Passenger'

export interface FreeBusProps {
  bus: BusState
  onChange: (next: BusState) => void
  passenger: number
  portrait: boolean
}

/** Fills the window (a style, so it wins over the prop's own `relative`). */
const FILL = { position: 'absolute', inset: 0 } as const

const people = (n: number): string => countWord(n, 'passatger', 'passatgers')

/**
 * Free play: with the bus stopped, tap someone at the stop to let them on, or tap a window to let that
 * passenger off. While driving, the stop is left behind (the next one comes when she stops).
 */
export function FreeBus({ bus, onChange, passenger, portrait }: FreeBusProps) {
  const maxShown = portrait ? 3 : 5
  const queue = bus.waiting.slice(0, maxShown)
  const stop = (
    <div style={{ visibility: bus.driving ? 'hidden' : 'visible' }}>
      <BusStop label={`Parada ${bus.stop}: ${people(bus.waiting.length)}`} more={bus.waiting.length - queue.length}>
        {[...queue].reverse().map((seed, k) => (
          <TapProp
            key={seed}
            prop={{ id: `espera-${seed}`, label: `Passatger ${queue.length - k} de la cua, fes-lo pujar`, kind: 'passatger' }}
            sound="squish"
            onTap={() => onChange(board(bus, seed))}
            disabled={bus.driving}
            className="-ml-[6%]"
          >
            <StandingPassenger seed={seed} size={passenger} animated />
          </TapProp>
        ))}
      </BusStop>
    </div>
  )
  return (
    <BusRow
      portrait={portrait}
      stop={stop}
      bus={
        <Bus
          label={`L’autobús: ${people(bus.seated.length)}`}
          destination={String(bus.stop)}
          seat={(i) => {
            const seed = bus.seated[i]
            if (seed === undefined) return null
            return (
              <TapProp
                prop={{ id: `seu-${seed}`, label: `Seient ${i + 1}, fes baixar el passatger`, kind: 'passatger' }}
                sound="plop"
                onTap={() => onChange(alight(bus, seed))}
                disabled={bus.driving}
                style={FILL}
              >
                <SeatFace seed={seed} />
              </TapProp>
            )
          }}
        />
      }
    />
  )
}
