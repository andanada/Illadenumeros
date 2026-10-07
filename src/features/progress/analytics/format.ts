/** "45 min", "2 h 05 min", "menys d’1 min". Never NaN. */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  if (minutes < 1) return 'menys d’1 min'
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`
}

/** 0.824 -> "82 %"; a dash when there is no data. */
export function formatPercent(ratio: number | undefined): string {
  return ratio === undefined || !Number.isFinite(ratio) ? '—' : `${Math.round(ratio * 100)} %`
}

/** "2026-10-07" -> "7/10". */
export function shortDay(day: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(day)
  return m ? `${Number(m[2])}/${Number(m[1])}` : day
}
