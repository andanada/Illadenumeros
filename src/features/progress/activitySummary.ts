import { formatDuration, shortDay } from './analytics/format'
import type { ProgressReport } from './analytics/report'

export function activitySummary(activity: ProgressReport['activity']): string {
  const active = activity.filter((d) => d.answers > 0 || d.minutes > 0)
  const minutes = activity.reduce((n, d) => n + d.minutes, 0)
  if (active.length === 0) return 'Cap activitat en els últims 28 dies.'
  const best = active.reduce((a, b) => (b.minutes > a.minutes ? b : a))
  return `Últims 28 dies: ${active.length} dies jugats, ${formatDuration(minutes)} en total. El dia amb més estona va ser el ${shortDay(best.day)} (${formatDuration(best.minutes)}).`
}
