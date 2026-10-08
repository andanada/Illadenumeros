import { useMemo } from 'react'
import { ArithFrame } from '../shared/arith/ArithFrame'
import { hashText, levelOf, parseProblem } from '../shared/arith/problem'
import type { RoundProps } from '../shared/useGameBase'
import { buildPyramid } from './pyramidLogic'
import { PyramidView } from './PyramidView'

const PROMPTS = {
  sum: 'Cada bloc és la suma dels dos de sota. Quin número falta a dalt?',
  diff: 'El bloc de dalt és la suma dels dos de sota. Quin número falta a baix?',
  missing: 'El bloc de dalt és la suma dels dos de sota. Quin número falta?',
} as const

/** One "Piràmide Màgica" question (remounted per item). */
export function PiramideMagicaRound(props: RoundProps) {
  const { item } = props.flow
  const setup = useMemo(() => {
    const problem = parseProblem(item.text)
    return problem ? { pyramid: buildPyramid(problem, levelOf(problem), hashText(item.id)), kind: problem.kind } : undefined
  }, [item.id, item.text])

  return (
    <ArithFrame
      {...props}
      prompt={PROMPTS[setup?.kind ?? 'sum']}
      board={({ shown, solved }) => (setup ? <PyramidView pyramid={setup.pyramid} shown={shown} solved={solved} /> : null)}
    />
  )
}
