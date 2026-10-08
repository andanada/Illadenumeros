import type { Choice } from '../../core/ambit/types'
import { Draggable } from '../scene/Draggable'
import type { PropInfo } from '../scene/SceneContext'
import { useScene } from '../scene/SceneContext'

export const TAG_KIND = 'tag'

/** Price-tag token for a choice; the value travels in the prop id. */
export const tagProp = (value: string): PropInfo => ({ id: `tag:${value}`, label: `l’etiqueta ${value}`, kind: TAG_KIND })

export const valueOfTag = (prop: PropInfo): string | undefined => (prop.kind === TAG_KIND && prop.id.startsWith('tag:') ? prop.id.slice(4) : undefined)

export interface FallbackTokensProps {
  choices: readonly Choice[]
  wrongValues: readonly string[]
  locked: boolean
  submit: (choice: Choice) => void
  /** Answer revealed: its tag glows, the others rest. */
  reveal?: string
}

const TAG_COLOURS = ['var(--world-mango,#ffb834)', 'var(--world-menta,#36c5a2)', 'var(--world-rosa,#ff8dba)', 'var(--world-cel,#4da6ec)', 'var(--world-llima,#a8d143)']

/**
 * Fallback for items no adapter takes: the answers hang as price tags. Tap one (or Enter) to hand it over,
 * or drag it to the neighbour's hand. Tried tags only fade a little; nothing is ever crossed out.
 */
export function FallbackTokens({ choices, wrongValues, locked, submit, reveal }: FallbackTokensProps) {
  const scene = useScene()
  return (
    <ul aria-label="Etiquetes de preu" className="flex flex-wrap items-start justify-center gap-3 px-2">
      {choices.map((choice, i) => {
        const tried = wrongValues.includes(choice.value)
        const glow = reveal === choice.value
        return (
          <li key={choice.value} className="flex flex-col items-center" style={{ rotate: `${(i % 2 === 0 ? -1 : 1) * (2 + (i % 3))}deg` }}>
            <span aria-hidden="true" className="block h-5 w-1 rounded-full bg-[var(--world-carbo,#34304a)]/40" />
            <Draggable
              prop={tagProp(choice.value)}
              name={`Resposta ${choice.value}`}
              sound="beep"
              pickOnTap={false}
              disabled={locked || tried}
              onTap={() => {
                if (scene.held) scene.cancel()
                submit(choice)
              }}
              className={`grid min-h-16 min-w-20 place-items-center rounded-2xl px-4 text-2xl font-bold tabular-nums text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)] sm:text-3xl ${tried ? 'opacity-45' : ''} ${glow ? 'ring-8 ring-[var(--color-sol)]' : ''}`}
              style={{ background: TAG_COLOURS[i % TAG_COLOURS.length] }}
            >
              <span aria-hidden="true" className="absolute left-2 top-2 size-3 rounded-full bg-white/80" />
              {choice.value}
            </Draggable>
          </li>
        )
      })}
    </ul>
  )
}
