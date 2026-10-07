/**
 * Placeholder shown until the owner publishes a real address. It is deliberately obvious.
 * The privacy page flags it with a visible notice while it is still in use.
 */
export const PRIVACY_CONTACT_PLACEHOLDER = 'contacte@exemple.cat'

/**
 * Where families write about their data (access, correction, deletion, doubts).
 * The owner of the deployment must replace the value below with a mailbox they read
 * before publishing the app; this is the only place the address is defined.
 */
export const PRIVACY_CONTACT_EMAIL: string = PRIVACY_CONTACT_PLACEHOLDER

export function isPlaceholderContact(email: string = PRIVACY_CONTACT_EMAIL): boolean {
  return email.trim().toLowerCase() === PRIVACY_CONTACT_PLACEHOLDER
}
