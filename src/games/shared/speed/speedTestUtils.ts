import { screen } from '@testing-library/react'
import { newSkillState } from '../../../core/engine/mastery'
import { useProgress } from '../../../core/progress/store'

/** Test helper: the sum currently on screen, solved ("3 + 4 = ?" gives "7"). */
export function currentSum(): { text: string; answer: string } {
  const text = (screen.getByTestId('speed-question').textContent ?? '').trim()
  const m = /^(\d+) \+ (\d+) = \?$/.exec(text)
  if (!m) throw new Error(`Suma no reconeguda: "${text}"`)
  return { text, answer: String(Number(m[1]) + Number(m[2])) }
}

/** Test helper: a child who is learning A4 (so the speed games pick from the unlocked addition facts). */
export function seedLearningAddition(): void {
  useProgress.setState({
    skillStates: { A3: { ...newSkillState('A3'), status: 'consolidant', mastery: 0.8 }, A4: { ...newSkillState('A4'), status: 'aprenent', mastery: 0.5 } },
  })
}
