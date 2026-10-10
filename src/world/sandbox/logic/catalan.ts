import { toPlace } from '../../scene/logic/tapPlace'

export { toPlace }

/** "de" + a place with its article, contracted: de + el = del, de + els = dels. */
export const ofPlace = (label: string): string => (label.startsWith('el ') ? `del ${label.slice(3)}` : label.startsWith('els ') ? `dels ${label.slice(4)}` : `de ${label}`)

/** «Has posat una poma a la cistella: ara hi ha 7.» */
export const placedSaid = (single: string, zoneLabel: string, count: number | undefined): string => `Has posat ${single} ${toPlace(zoneLabel)}${count === undefined ? '' : `: ara hi ha ${count}`}.`

/** «Has tret una poma de la cistella: ara hi ha 6.» */
export const takenSaid = (single: string, zoneLabel: string, count: number): string => `Has tret ${single} ${ofPlace(zoneLabel)}: ara hi ha ${count}.`
