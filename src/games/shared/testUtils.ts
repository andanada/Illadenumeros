import { vi, type Mock } from 'vitest'
import { matesAmbit } from '../../ambits/mates'
import type { CpaStage, Item } from '../../core/ambit/types'
import { createRng } from '../../core/rng'
import type { AnswerResult, QuestionFlow } from '../../features/play/useQuestionFlow'
import type { GameRounds } from './useGameRounds'
import { emptySession } from './gameSession'

/** Builds a real item from the generators with a fixed seed. */
export function makeTestItem(skillId: string, factKey?: string, cpaStage: CpaStage = 'concret', seed = 'test'): Item {
  const generator = matesAmbit.generators[skillId]
  if (!generator) throw new Error(`Sense generador ${skillId}`)
  return generator({ rng: createRng(seed), cpaStage, ...(factKey ? { factKey } : {}) })
}

/** Mocked flow: `answer` resolves correct when the value equals the item answer. */
export function makeTestFlow(item: Item, hintLevel: 0 | 1 | 2 | 3 = 0): QuestionFlow & { answer: ReturnType<typeof vi.fn> } {
  const answer = vi.fn(
    async (choice: { value: string }): Promise<AnswerResult> => {
      const correct = choice.value === item.answer
      return { correct, itemDone: correct }
    },
  )
  return {
    item,
    skill: { id: item.skillId, code: item.skillId, grade: 1, title: '', prereqs: [], hasFacts: true, games: [], fluencyTargetMs: 3000 },
    hintLevel,
    errors: 0,
    wrongValues: [],
    streak: 0,
    answered: 0,
    correctCount: 0,
    answer,
    next: vi.fn(),
    markHint: vi.fn(),
  }
}

export function makeTestRounds(): GameRounds & { register: Mock<GameRounds['register']> } {
  return { session: emptySession, roundNumber: 1, finished: false, register: vi.fn<GameRounds['register']>(), completeIfFinished: () => false }
}
