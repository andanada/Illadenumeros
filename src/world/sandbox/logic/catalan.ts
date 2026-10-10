export { toPlace } from '../../scene/logic/tapPlace'

/** "de" + a place with its article, contracted: de + el = del, de + els = dels. */
export const ofPlace = (label: string): string => (label.startsWith('el ') ? `del ${label.slice(3)}` : label.startsWith('els ') ? `dels ${label.slice(4)}` : `de ${label}`)
