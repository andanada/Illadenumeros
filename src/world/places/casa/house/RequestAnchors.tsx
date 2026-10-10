import { Anchor, type AnchorState } from '../../../sandbox/Anchor'
import { IngredientArt } from '../kitchen/IngredientArt'
import { ASKERS, MEMBERS, PET_MEMBER } from './family'

export interface Bubble {
  readonly askerId: string
  readonly state: AnchorState
  readonly requestId: string
}

const ICON: Readonly<Record<string, 'maduixa' | 'tovallola' | 'galeta' | 'croqueta'>> = {
  ...Object.fromEntries(MEMBERS.map((m) => [m.id, m.icon])),
  [PET_MEMBER.id]: PET_MEMBER.icon,
}

const WANTS: Readonly<Record<string, string>> = {
  iaia: 'vol cuinar amb tu',
  pare: 'necessita unes tovalloles',
  germana: 'vol fer unes galetes',
  mascota: 'té gana',
}

const NAME: Readonly<Record<string, string>> = { iaia: 'La iaia', pare: 'El pare', germana: 'La germana', mascota: 'La mascota' }

export const bubbleLabel = (askerId: string, state: AnchorState): string => {
  const who = NAME[askerId] ?? 'Algú'
  if (state === 'done') return `${who} diu: gràcies!`
  if (state === 'calm') return `${who} descansa. Toca per despertar`
  return `${who} ${WANTS[askerId] ?? 'necessita ajuda'}`
}

/** One bubble per character with something to ask (ignoring it is fine). Each one hides while its character is on another floor. */
export function RequestAnchors({ bubbles, onTap }: { bubbles: readonly Bubble[]; onTap: (bubble: Bubble) => void }) {
  return (
    <>
      {bubbles
        .filter((b) => ASKERS.some((a) => a.id === b.askerId))
        .map((b) => (
          <Anchor
            key={b.askerId}
            actorId={b.askerId}
            state={b.state}
            label={bubbleLabel(b.askerId, b.state)}
            icon={<IngredientArt id={ICON[b.askerId] ?? 'maduixa'} size={30} />}
            onActivate={() => onTap(b)}
          />
        ))}
    </>
  )
}
