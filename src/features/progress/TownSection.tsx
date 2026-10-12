import { EmptyNote, Section } from './Section'
import type { TownReport } from './townReport'
import { VISIT_DAYS } from './townReport'
import { useTownReport } from './useTownReport'

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex min-w-0 flex-col justify-center rounded-2xl bg-brand/10 p-3 text-center">
      <span className="text-base font-semibold leading-tight text-ink/70">{label}</span>
      <span className="text-2xl font-bold text-brand-dark">{value}</span>
    </li>
  )
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

function TodayBlock({ today }: { today: TownReport['today'] }) {
  const percent = today.target === 0 ? 0 : Math.min(100, Math.round((today.done / today.target) * 100))
  const text = !today.started
    ? `Avui el poble encara no s’ha obert. L’objectiu és d’uns ${today.targetMinutes} minuts de matemàtiques.`
    : today.complete
      ? `Avui ja ha omplert el tarro d’estrelles: ${plural(today.done, 'encàrrec fet', 'encàrrecs fets')}, uns ${today.minutes} minuts de matemàtiques.`
      : `Avui porta ${today.done} de ${plural(today.target, 'encàrrec', 'encàrrecs')}, uns ${today.minutes} de ${today.targetMinutes} minuts de matemàtiques.`
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-bold text-ink">Avui</h3>
      <div
        role="progressbar"
        aria-label="Tarro d’estrelles d’avui"
        aria-valuemin={0}
        aria-valuemax={Math.max(today.target, 1)}
        aria-valuenow={Math.min(today.done, Math.max(today.target, 1))}
        className="h-4 w-full overflow-hidden rounded-full bg-brand/15"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-lg leading-snug text-ink">{text}</p>
    </div>
  )
}

function PlacesBlock({ places }: { places: TownReport['places'] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-bold text-ink">Llocs del poble</h3>
      <ul aria-label="Llocs del poble" className="flex flex-col gap-2">
        {places.map((p) => (
          <li key={p.id} className="flex min-w-0 flex-col gap-0.5 rounded-2xl bg-brand/10 px-4 py-2">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-lg font-bold text-ink">
              <span>{p.name}</span>
              <span className={p.open ? 'text-brand-dark' : 'text-ink/70'}>{p.open ? 'Obert' : 'Tancat per ara'}</span>
            </span>
            {!p.open && <span className="text-base leading-snug text-ink/80">{p.hint}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function VisitsBlock({ visits }: { visits: TownReport['visits'] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-bold text-ink">Llocs visitats darrerament</h3>
      {visits.length === 0 ? (
        <EmptyNote>Encara no hi ha visites en els últims {VISIT_DAYS} dies. El poble l’espera quan vulgui!</EmptyNote>
      ) : (
        <ul aria-label={`Visites dels últims ${VISIT_DAYS} dies`} className="flex flex-col gap-2">
          {visits.map((v) => (
            <li key={v.id} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-2xl bg-brand/10 px-4 py-2 text-lg text-ink">
              <span className="font-bold">{v.name}</span>
              <span>{plural(v.answers, 'resposta', 'respostes')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TownView({ report }: { report: TownReport }) {
  const { coins } = report
  return (
    <Section title="El poble" tilt={0.3} hint="Com avança el dia de matemàtiques al poble i què ha fet darrerament. Només per a vosaltres.">
      <TodayBlock today={report.today} />
      <ul aria-label="Xifres del poble" className="grid grid-cols-2 gap-3">
        <Tile label="Encàrrecs resolts (7 dies)" value={String(report.solvedThisWeek)} />
        <Tile label="Monedes que té ara" value={String(coins.balance)} />
        <Tile label="Monedes guanyades" value={String(coins.earned)} />
        <Tile label="Monedes gastades" value={String(coins.spent)} />
      </ul>
      <PlacesBlock places={report.places} />
      <VisitsBlock visits={report.visits} />
    </Section>
  )
}

/** The adults' view of the town: loads its own data from this device. */
export function TownSection({ now }: { now?: () => number }) {
  const state = useTownReport(now)
  if (state.status === 'loading') return <p role="status" className="px-1 text-lg font-semibold text-ink">Carregant el poble…</p>
  if (state.status === 'error') return <EmptyNote>No s’ha pogut llegir el poble d’aquest dispositiu. Torna-ho a provar més tard.</EmptyNote>
  return <TownView report={state.report} />
}
