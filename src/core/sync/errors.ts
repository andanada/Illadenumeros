import { ApiError } from './api'

/** Friendly Catalan text for any error of the account / sync flows (shown to the adult only). */

const GENERIC = 'No s’ha pogut completar. Torna-ho a provar d’aquí a una estona.'
const UNAVAILABLE = 'El servidor no està disponible ara mateix. L’app continua funcionant; torna-ho a provar més tard.'
const WEAK_PASSWORD =
  'La contrasenya no és prou segura: ha de tenir almenys 10 caràcters i no pot ser una contrasenya habitual (com «1234567890» o «contrasenya»).'

function waitText(ms: number | undefined): string {
  if (ms === undefined) return 'Torna-ho a provar d’aquí a una estona.'
  const minutes = Math.ceil(ms / 60_000)
  return ms < 60_000 ? `Torna-ho a provar d’aquí a ${Math.ceil(ms / 1000)} segons.` : `Torna-ho a provar d’aquí a ${minutes} ${minutes === 1 ? 'minut' : 'minuts'}.`
}

function validationText(err: ApiError): string {
  const paths = (err.issues ?? []).map((i) => i.path)
  if (paths.some((p) => p === 'password' || p === 'new')) return WEAK_PASSWORD
  if (paths.includes('email')) return 'Revisa l’adreça de correu: no sembla vàlida.'
  return 'Alguna de les dades no és vàlida. Revisa-les i torna-ho a provar.'
}

const BY_CODE: Record<string, (err: ApiError) => string> = {
  invalid_invite: () => 'El codi d’invitació no és correcte. Demana’l a qui gestiona el servidor.',
  registration_closed: () => 'Ara mateix no es poden crear comptes nous en aquest servidor.',
  validation_failed: validationText,
  invalid_credentials: (e) => (e.status === 403 ? 'La contrasenya no és correcta.' : 'El correu o la contrasenya no són correctes.'),
  email_taken: () => 'Aquest correu ja té un compte. Prova d’entrar-hi amb «Entra».',
  network: () => 'Sense connexió. L’app continua funcionant i es sincronitzarà quan torni la connexió.',
  timeout: () => 'El servidor no respon. L’app continua funcionant; torna-ho a provar més tard.',
  quota_exceeded: () => 'S’ha arribat al límit d’espai d’aquest jugador al servidor. El progrés continua desat en aquest dispositiu.',
  profile_limit: () => 'S’ha arribat al màxim de jugadors del compte (12).',
  unauthorized: () => 'La sessió ha caducat. Torna a entrar al compte (el progrés d’aquest dispositiu es manté).',
  bad_response: () => 'El servidor ha donat una resposta inesperada. Torna-ho a provar més tard.',
}

export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC
  if (error.status === 429) return `Massa intents seguits. ${waitText(error.retryAfterMs)}`
  const byCode = BY_CODE[error.code]
  if (byCode) return byCode(error)
  if (error.status >= 500) return UNAVAILABLE
  return GENERIC
}
