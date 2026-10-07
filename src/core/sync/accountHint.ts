/**
 * "This device has a family account session" (a plain flag, no email, no token). Only with it does
 * the app ask the server at start-up, so families that never use an account make no network request.
 */
const KEY = 'mm-account'

export function hasAccountHint(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setAccountHint(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the adult simply logs in again next time.
  }
}
