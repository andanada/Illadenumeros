import { useMemo } from 'react'
import { hashText, levelOf, parseProblem } from '../shared/arith/problem'
import { ArithFrame } from '../shared/arith/ArithFrame'
import type { RoundProps } from '../shared/useGameBase'
import { buildChain, describeChain } from './dominoLogic'
import { DominoChain, DominoTray } from './DominoView'

/** One "Dòmino de Sumes" question (remounted per item): the touching halves must be equal. */
export function DominoSumesRound(props: RoundProps) {
  const { item } = props.flow
  const chain = useMemo(() => {
    const problem = parseProblem(item.text)
    return problem ? buildChain(problem, levelOf(problem), hashText(item.id)) : undefined
  }, [item.id, item.text])

  return (
    <ArithFrame
      {...props}
      prompt="Busca el dòmino que encaixa: les dues meitats que es toquen han de valer el mateix."
      tray={DominoTray}
      board={({ shown }) =>
        chain ? (
          <div role="img" aria-label={describeChain(chain, shown)}>
            <DominoChain chain={chain} shown={shown} />
          </div>
        ) : null
      }
    />
  )
}
