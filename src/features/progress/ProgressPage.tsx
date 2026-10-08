import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../core/progress/store'
import { Button } from '../../ui/Button'
import { Screen } from '../../ui/Screen'
import { AdultGate } from '../family/AdultGate'
import { ActivitySection } from './ActivitySection'
import { EvolutionSection } from './EvolutionSection'
import { FactHeatmap } from './FactHeatmap'
import { MisconceptionsSection } from './MisconceptionsSection'
import { OperationsSection } from './OperationsSection'
import { RecommendationsSection } from './RecommendationsSection'
import { SkillHeatmap } from './SkillHeatmap'
import { SummarySection } from './SummarySection'
import { useProgressReport } from './useProgressReport'
import './print.css'

function Report({ now }: { now?: () => number }) {
  const profile = useProgress((s) => s.profile)
  const state = useProgressReport(true, now)
  if (!profile) return null
  if (state.status === 'loading') return <p role="status" className="px-4 text-xl font-semibold text-ink">Carregant el progrés…</p>
  if (state.status === 'error') {
    return (
      <p role="alert" className="sticker mx-4 rounded-2xl bg-sol px-4 py-3 text-xl font-bold text-punk">
        No s’ha pogut llegir el progrés d’aquest dispositiu. Torna-ho a provar més tard.
      </p>
    )
  }
  const { report } = state
  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6 px-4 pb-16">
      <Button variant="soft" className="no-print self-start" onClick={() => window.print()}>
        Imprimeix / desa en PDF
      </Button>
      <SummarySection report={report} name={profile.name} character={profile.character} />
      <RecommendationsSection report={report} />
      <OperationsSection report={report} />
      <SkillHeatmap report={report} />
      <FactHeatmap report={report} />
      <ActivitySection report={report} />
      <EvolutionSection report={report} />
      <MisconceptionsSection report={report} />
    </div>
  )
}

/** Calm, adult-only dashboard of the active player's learning (behind the adult check). */
export default function ProgressPage({ now }: { now?: () => number }) {
  const navigate = useNavigate()
  const [seed] = useState(() => crypto.randomUUID())
  const [passed, setPassed] = useState(false)
  return (
    <Screen title="Progrés" back="/map">
      {passed ? <Report now={now} /> : <AdultGate seed={seed} onPass={() => setPassed(true)} onCancel={() => navigate('/map', { replace: true })} />}
    </Screen>
  )
}
