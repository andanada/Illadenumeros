import { Fragment, type ReactNode } from 'react'
import { FallbackTokens } from './FallbackTokens'
import { neighbourFor } from './requestText'
import type { Errand } from './useErrand'

/**
 * The errand pieces a place lays out in its own scene: `ErrandRegion` names the whole errand for screen
 * readers (and e2e), `ErrandPerson` (./ErrandPerson) is the neighbour with their bubble, and
 * `ErrandTaskArea` is what the child does with her hands on the counter.
 */
export function ErrandRegion({ errand, placeName, children, className = '' }: { errand: Errand; placeName: string; children: ReactNode; className?: string }) {
  const { name } = neighbourFor(errand.visit)
  return (
    <section aria-label={`Encàrrec a ${placeName}: ${name}`} className={className} data-errand-kind={errand.task?.adapterId ?? 'fichas'}>
      {children}
    </section>
  )
}

/** The task of this item (basket, change…) or, with no adapter, the answers as price tags. Never a red cross. */
export function ErrandTaskArea({ errand }: { errand: Errand }) {
  const { phase, item, task, hintLevel, submit } = errand
  const locked = phase !== 'asking'
  const solution = phase === 'shown'
  // Keyed by item: every neighbour starts with a fresh basket / tray.
  return (
    <Fragment key={item.id}>
      {task ? (
        task.render({ item, hintLevel, wrongValues: errand.flow.wrongValues, locked, solution, tries: errand.tries, submit: (c) => void submit(c) })
      ) : (
        <FallbackTokens choices={item.choices} wrongValues={errand.flow.wrongValues} locked={locked} submit={(c) => void submit(c)} {...(solution ? { reveal: item.answer } : {})} />
      )}
    </Fragment>
  )
}
