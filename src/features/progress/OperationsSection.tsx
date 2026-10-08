import type { OperationSummary } from './analytics/operations'
import type { ProgressReport } from './analytics/report'
import { Section } from './Section'

const STATE_LABEL: Record<OperationSummary['state'], string> = {
  dominada: 'Dominada',
  'en-curs': 'En curs',
  esperant: 'Encara no oberta',
}

function Bar({ done, review, total }: { done: number; review: number; total: number }) {
  const pct = (n: number): string => `${total === 0 ? 0 : Math.min(100, (n / total) * 100)}%`
  return (
    <div aria-hidden="true" className="flex h-3 w-full overflow-hidden rounded-full bg-ink/10">
      <div className="bg-ok" style={{ width: pct(done) }} />
      <div className="bg-sol" style={{ width: pct(review) }} />
    </div>
  )
}

function OperationRow({ op }: { op: OperationSummary }) {
  return (
    <li data-operation={op.id} data-state={op.state} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-brand/10 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xl font-bold text-ink">{op.headline}</p>
        <span className="text-base font-semibold text-brand-dark">{STATE_LABEL[op.state]}</span>
      </div>
      <Bar done={op.automatised} review={op.inReview} total={op.total} />
      <p className="text-base leading-snug text-ink">
        {op.inReview} en revisió · {op.unseen} per començar
      </p>
      {op.note && <p className="text-base leading-snug text-ink/80">{op.note}</p>}
    </li>
  )
}

/** Per operation: facts automatised, in review and not started. No dates: it depends on each day. */
export function OperationsSection({ report }: { report: ProgressReport }) {
  return (
    <Section
      title="Operacions"
      tilt={0.3}
      hint="Una operació es dóna per apresa quan gairebé tots els seus fets es responen bé, ràpid i en dies diferents. Les operacions s’obren en ordre: sumes, restes, multiplicacions i divisions."
    >
      <ul aria-label="Operacions" className="flex flex-col gap-3">
        {report.operations.map((op) => (
          <OperationRow key={op.id} op={op} />
        ))}
      </ul>
      <p className="text-base leading-snug text-ink/80">
        No podem dir quan acabarà cada operació: depèn del ritme de cada dia. Una mica cada dia val més que molt un sol dia.
      </p>
    </Section>
  )
}
