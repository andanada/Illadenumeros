import { useEffect, useMemo, type ReactNode } from 'react'
import type { Choice } from '../../../core/ambit/types'
import { sfx, unlockAudio } from '../../../core/audio/sfx'
import { speak } from '../../../core/audio/speech'
import { VisualModelView } from '../../../ui/visual/VisualModelView'
import { ChoiceRow } from '../ChoiceRow'
import { FeedbackBar } from '../FeedbackBar'
import { NextButton } from '../NextButton'
import type { RoundProps } from '../useGameBase'
import { useRoundAnswer } from '../useRoundAnswer'
import { parseProblem, type Problem } from './problem'
import { useGuessSlot } from './useGuessSlot'

export interface ArithBoardState {
  problem: Problem | undefined
  /** Value to show in the hidden slot: the guess, or the solution after the last hint. */
  shown: number | null
  /** The slot has its right value (the round is finished). */
  solved: boolean
  /** Hint level 1+ asked: boards may highlight their strategy. */
  hinting: boolean
  /** Hint level of the flow (0..3). */
  hintLevel: number
}

export interface TrayProps {
  choices: readonly Choice[]
  wrongValues: readonly string[]
  disabled: boolean
  /** `helped`: the child needed hints of her own, so the answer is not clean. */
  onPick: (choice: Choice, helped?: boolean) => void
  /** Right answer of the item, the value shown in the gap and whether the round is finished. */
  answer: string
  shown: number | null
  solved: boolean
}

interface ArithFrameProps extends RoundProps {
  /** Replaces the answer stickers (domino tray, pins, jars...). Buttons must be named `Resposta N`. */
  tray?: (props: TrayProps) => ReactNode
  /** First instruction, shown until the child answers. */
  prompt: string
  /** Draws the game's board for the current state. */
  board: (state: ArithBoardState) => ReactNode
}

/** Shared round layout of the addition/subtraction games: question, board, hint picture, answer stickers, mascot. */
export function ArithFrame({ flow, rounds, onNext, prompt, board, tray }: ArithFrameProps) {
  const { item } = flow
  const problem = useMemo(() => parseProblem(item.text), [item.text])
  const { feedback, done, answer } = useRoundAnswer(flow, rounds)
  const { guess, put } = useGuessSlot()

  useEffect(() => {
    speak(item.speech)
  }, [item.speech])

  const pick = (choice: Choice, helped = false): void => {
    if (done || guess !== null) return
    unlockAudio()
    const right = choice.value === item.answer
    if (right) sfx.pop()
    put(Number(choice.value), right)
    void answer(choice, helped)
  }

  const hinting = flow.hintLevel >= 1
  const shown = flow.hintLevel === 3 ? Number(item.answer) : guess
  return (
    <div className="flex flex-1 flex-col">
      <p data-testid="question-text" className="text-center text-5xl font-bold tracking-tight text-brand-dark">
        {item.text}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-1">
        {board({ problem, shown, solved: done, hinting, hintLevel: flow.hintLevel })}
        {hinting && item.hintVisual.kind !== 'none' && <VisualModelView model={item.hintVisual} size="sm" animate={flow.hintLevel === 1} />}
        {(tray ?? ChoiceRow)({ choices: item.choices, wrongValues: flow.wrongValues, disabled: done || guess !== null, onPick: pick, answer: item.answer, shown, solved: done })}
      </div>
      <FeedbackBar
        mood={feedback?.mood ?? 'pensa'}
        tone={feedback?.tone ?? 'neutral'}
        message={feedback?.text ?? prompt}
        action={done ? <NextButton last={rounds.finished} onClick={onNext} /> : undefined}
      />
    </div>
  )
}
