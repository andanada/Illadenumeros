import { useMemo } from 'react'
import { ArithFrame } from '../shared/arith/ArithFrame'
import { hashText, parseProblem } from '../shared/arith/problem'
import type { RoundProps } from '../shared/useGameBase'
import { bridgeHint, buildJar } from './jarLogic'
import { JarView } from './JarView'

/** One "Cuina de Sumes" question (remounted per item): ingredients and a measuring jar. */
export function CuinaSumesRound(props: RoundProps) {
  const { item } = props.flow
  const setup = useMemo(() => {
    const problem = parseProblem(item.text)
    return problem ? { jar: buildJar(problem, hashText(item.id)), bridge: bridgeHint(problem) } : undefined
  }, [item.id, item.text])

  return (
    <ArithFrame
      {...props}
      prompt={setup?.jar.caption ?? 'Quin ingredient falta a la recepta?'}
      board={({ shown, solved, hintLevel }) =>
        setup ? (
          <>
            <JarView jar={setup.jar} shown={shown} solved={solved} />
            {hintLevel >= 2 && setup.bridge && <p className="text-center text-xl font-semibold text-brand-dark">{setup.bridge}</p>}
          </>
        ) : null
      }
    />
  )
}
