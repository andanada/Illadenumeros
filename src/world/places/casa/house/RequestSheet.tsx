import { Neighbour, Pet, type PetId } from '../../../characters'
import { ErrandTaskArea } from '../../../errands/ErrandStage'
import { useErrand, type Errand } from '../../../errands/useErrand'
import type { Request } from '../../../requests/types'
import { Scene } from '../../../scene/Scene'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { VisualModelView } from '../../../../ui/visual/VisualModelView'
import { CASA_GAME_ID, CASA_SKILLS } from '../casaSkills'
import { CASA_ADAPTERS, themedAdapters } from '../kitchen/casaAdapters'
import { askerById, MEMBERS } from './family'

const pill = 'min-h-16 rounded-full px-6 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5'

function Words({ errand }: { errand: Errand }) {
  const reduced = useWorldReducedMotion()
  const { phase, request, hintText, item, earned, hintLevel } = errand
  const text = phase === 'thanks' ? `Moltes gràcies! ${earned > 0 ? `Et dono ${earned} ${earned === 1 ? 'moneda' : 'monedes'}.` : ''}` : phase === 'shown' ? item.hints[2] : request.text
  const visual = hintLevel >= 1 && item.hintVisual.kind !== 'none' && phase !== 'thanks'
  return (
    <div className="relative min-w-0 flex-1 rounded-[1.6rem] bg-white px-4 py-3 shadow-[var(--world-shadow-lift)]">
      <span aria-hidden="true" className="absolute -left-2.5 top-7 size-6 rotate-45 rounded-[4px] bg-white" />
      <p role="status" aria-live="polite" data-testid="errand-request" className="relative text-xl font-bold leading-snug text-[var(--world-ink,#2b2440)] lg:text-2xl">
        {text}
      </p>
      {hintText && phase === 'asking' && (
        <p data-testid="errand-hint" className="relative mt-1 text-lg font-semibold leading-snug text-[var(--world-text-soft,#6b5f80)]">
          {hintText}
        </p>
      )}
      {visual && (
        <div role="group" aria-label="Pista" className="relative mt-2 flex justify-center rounded-[1.1rem] bg-[var(--world-surface-2,#ffeccd)] p-1.5">
          <VisualModelView model={item.hintVisual} size="sm" animate={!reduced && hintLevel === 1} />
        </div>
      )}
    </div>
  )
}

export interface RequestSheetProps {
  request: Request
  /** Who asks (a family member or the pet). */
  askerId: string
  pet: PetId | undefined
  onSolved: (coins: number) => void
  /** The sheet closes: the child let it be, or said goodbye after the thanks. */
  onClose: (solved: boolean) => void
  forced?: { skillId: string; factKey?: string }
}

/** A family member's request played in place: their bubble text and the bowl on the worktop (same logic as always). */
export function RequestSheet({ request, askerId, pet, onSolved, onClose, forced }: RequestSheetProps) {
  const asker = askerById(askerId)
  const member = MEMBERS.find((m) => m.id === askerId)
  const adapters = asker?.theme ? themedAdapters(asker.theme) : CASA_ADAPTERS
  const target = forced ?? (request.skillId ? { skillId: request.skillId, ...(request.factKey ? { factKey: request.factKey } : {}) } : undefined)
  const errand = useErrand({ gameId: CASA_GAME_ID, skillIds: CASA_SKILLS, adapters, onSolved, ...(target ? { forced: target } : {}) })
  const { phase, hintLevel } = errand
  const thanked = phase === 'thanks'
  const name = member?.name ?? 'la mascota'
  const leave = (): void => {
    errand.next()
    onClose(thanked)
  }
  return (
    <div className="absolute inset-0 z-[900] grid place-items-center bg-[rgba(43,36,64,0.35)] p-2">
      <section aria-label={`Encàrrec a la Casa: ${name}`} data-errand-kind={errand.task?.adapterId ?? 'fichas'} className="flex max-h-full w-full max-w-3xl flex-col gap-2 overflow-y-auto rounded-[2rem] bg-[#FFF3DC] p-3 shadow-[var(--world-shadow-lift)]">
        <div className="flex items-end gap-3">
          <div data-testid="errand-neighbour" data-pose={thanked ? 'cheer' : 'idle'} role="img" aria-label={name} className="grid h-28 w-24 shrink-0 place-items-end overflow-hidden">
            {member ? <Neighbour id={member.preset} pose={thanked ? 'cheer' : 'idle'} size={150} title="" /> : pet ? <Pet id={pet} pose={thanked ? 'happy' : 'idle'} size={110} title="" /> : null}
          </div>
          <Words errand={errand} />
        </div>
        <Scene label="Taulell de feina" className="flex flex-wrap items-center justify-center gap-3 rounded-[1.6rem] bg-[#EFE6D6] p-2">
          <ErrandTaskArea errand={errand} />
        </Scene>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {phase === 'asking' && hintLevel < 2 && (
            <button type="button" onClick={errand.askHelp} className={`${pill} bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]`}>
              <span aria-hidden="true">💡 </span>Ajuda
            </button>
          )}
          {phase === 'asking' && (
            <button type="button" onClick={() => onClose(false)} className={`${pill} bg-white text-[var(--world-text-soft,#6b5f80)]`}>
              Ara no
            </button>
          )}
          {(thanked || phase === 'shown') && (
            <button type="button" onClick={leave} className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}>
              {thanked ? 'Adéu!' : 'D’acord!'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
