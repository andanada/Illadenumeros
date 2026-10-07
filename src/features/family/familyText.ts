/** Dates shown to the adult, e.g. "7 d’octubre de 2026". */
export const formatDate = (at: number): string =>
  new Date(at).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })

/** Case- and accent-insensitive comparison, so "laia" or "LAIA " also confirm. */
export const sameName = (typed: string, name: string): boolean => {
  const norm = (s: string) => s.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ca')
  return norm(typed).length > 0 && norm(typed) === norm(name)
}
