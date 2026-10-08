import { useEffect, useState } from 'react'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { speak } from '../../core/audio/speech'
import { ChoiceRow } from '../shared/ChoiceRow'
import { FeedbackBar } from '../shared/FeedbackBar'
import { NextButton } from '../shared/NextButton'
import { usePrefersReducedMotion } from '../shared/speed/usePrefersReducedMotion'
import { PlainRound } from '../shared/tables/PlainRound'
import { groupsOf, isTrivial, levelOf, tableFactOf, type TableFact } from '../shared/tables/tableFact'
import type { RoundProps } from '../shared/useGameBase'
import { useRoundAnswer } from '../shared/useRoundAnswer'
import { Drums } from './Drums'
import { barBeats, preCounted, ritmeTexts, tapeEntries, tapsRequired, weakBeatMessage } from './ritmeLogic'
import { useBeat } from './useBeat'

function RitmeBoard({ flow, rounds, onNext, fact }: RoundProps & { fact: TableFact }) {
  const { item } = flow
  const { groups, size, total } = groupsOf(fact)
  const level = levelOf(item.cpaStage)
  const required = tapsRequired(groups, level)
  const pre = preCounted(size, groups, required).length
  const [tapped, setTapped] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const reduced = usePrefersReducedMotion()
  const { feedback, done, answer } = useRoundAnswer(flow, rounds)
  const texts = ritmeTexts(fact.kind, size, groups, total)

  const counted = pre + tapped
  const tapping = tapped < required && flow.hintLevel < 3
  const pulse = useBeat(size, !reduced && tapping)
  const solution = flow.hintLevel === 3
  const hideLast = fact.kind === 'mul' && !done && !solution
  const tape = tapeEntries(size, solution || !tapping ? groups : counted, groups, hideLast)

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const onTap = (beat: number): void => {
    unlockAudio()
    if (beat % size !== 0) {
      sfx.tap()
      setNote(weakBeatMessage(beat, size))
      return
    }
    sfx.pop()
    setNote(null)
    setTapped((n) => Math.min(required, n + 1))
  }

  const message = feedback?.text ?? note ?? (tapping ? texts.instruction : texts.question)
  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-5xl font-bold tracking-tight text-brand-dark" data-testid="question-text">
        {item.text}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-2">
        <p aria-label="Cinta de compassos" className="sticker min-h-12 rounded-full bg-white px-5 py-1 text-2xl font-bold text-brand-dark">
          {tape.length > 0 ? tape.join(' · ') : 'Compta de ' + size + ' en ' + size}
        </p>
        {tapping && (
          <>
            <p className="text-xl font-semibold text-brand-dark">
              Compàs {counted + 1} de {groups}
            </p>
            <Drums
              beats={barBeats(size, counted)}
              size={size}
              pulse={pulse}
              showNumbers={level === 1 || flow.hintLevel >= 1}
              reduced={reduced}
              disabled={false}
              maskStrong={fact.kind === 'mul' && counted + 1 === groups}
              onTap={onTap}
            />
          </>
        )}
        {!tapping && <ChoiceRow choices={item.choices} wrongValues={flow.wrongValues} disabled={done} onPick={(c) => void answer(c)} />}
      </div>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={message}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}

/** One "Ritme de les Taules" question, remounted per item (key = item.id). */
export function RitmeTaulesRound(props: RoundProps) {
  const fact = tableFactOf(props.flow.item)
  if (!fact || isTrivial(fact)) return <PlainRound {...props} />
  return <RitmeBoard {...props} fact={fact} />
}
