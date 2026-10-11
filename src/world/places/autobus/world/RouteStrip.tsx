import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { stopsAround } from './route'

export interface RouteStripProps {
  stop: number
  driving: boolean
  /** A friend waits at this stop (the «quantes parades» request) or the stop is flagged as a help; shown when it is on the strip. */
  mark?: { at: number; icon: string; label: string }
}

/** The connected road, drawn as stops on a line with the bus on its current stop. Decorative for the eye, one label for the ear. */
export function RouteStrip({ stop, driving, mark }: RouteStripProps) {
  const reduced = useWorldReducedMotion()
  const stops = stopsAround(stop)
  return (
    <div role="img" aria-label={`El carrer té parades numerades. L’autobús és a la parada ${stop}.${mark && stops.includes(mark.at) ? ` ${mark.label} ${mark.at}.` : ''}`} data-testid="road-bus" data-stop={stop} data-driving={driving} className="mx-auto flex w-full max-w-[48rem] items-end justify-between rounded-full bg-[#5B5672] px-3 pb-1 pt-5 shadow-[var(--world-shadow-soft)]">
      {stops.map((n) => {
        const here = n === stop
        const numbered = n % 10 === 0 || here || n === mark?.at
        return (
          <span key={n} className="relative flex w-0 flex-1 flex-col items-center">
            {here && (
              <span aria-hidden="true" className={`absolute -top-9 text-3xl ${reduced ? '' : 'sb-bubble-bob'}`}>
                🚌
              </span>
            )}
            {mark?.at === n && !here && (
              <span aria-hidden="true" data-testid="road-mark" className="absolute -top-9 text-3xl">
                {mark.icon}
              </span>
            )}
            <span aria-hidden="true" className={`block rounded-full ${here ? 'h-4 w-4 bg-[#ffb834]' : n % 10 === 0 ? 'h-3 w-3 bg-white' : 'h-2 w-2 bg-white/60'}`} />
            <span aria-hidden="true" className={`mt-0.5 text-sm font-bold tabular-nums leading-none ${numbered ? 'text-white' : 'text-transparent'}`}>
              {n}
            </span>
          </span>
        )
      })}
    </div>
  )
}
