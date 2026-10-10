export interface JarProgress {
  /** 0..1: how much of today's maths is done. */
  level: number
  /** Whole minutes still to do (0 = full). */
  minutesLeft: number
  done: boolean
}

/** Plain Catalan for the popup: what is left, never a list of tasks. */
export function jarMessage({ done, minutesLeft }: Pick<JarProgress, 'done' | 'minutesLeft'>): string {
  if (done) return 'El tarro és ple! Avui ja has fet les mates. Si vols ajudar més veïns, et pagaran amb monedes.'
  if (minutesLeft <= 1) return 'Només falta una miqueta per omplir el tarro d’estrelles. Ajuda algú quan vulguis!'
  return `Al tarro li falten uns ${minutesLeft} minuts d’estrelles. Ajuda els veïns quan vulguis, sense pressa!`
}
