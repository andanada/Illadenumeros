/**
 * Non-drag alternative: tap (or Enter on) a prop to hold it, then tap (or Enter on) a place to put it.
 * Pure state + the Catalan sentence announced to screen readers for each step.
 */

export interface Held {
  propId: string
  label: string
}

export type TapPlaceState = { held: Held | undefined }

export type TapPlaceEvent =
  | { type: 'pick'; propId: string; label: string }
  | { type: 'place'; zoneId: string; zoneLabel: string; accepted: boolean }
  | { type: 'cancel' }

export type TapPlaceEffect = { type: 'drop'; propId: string; zoneId: string } | { type: 'reject'; propId: string }

export interface TapPlaceStep {
  state: TapPlaceState
  effect?: TapPlaceEffect
  announce: string
}

export const EMPTY_HAND: TapPlaceState = { held: undefined }

export function tapPlaceReducer(state: TapPlaceState, event: TapPlaceEvent): TapPlaceStep {
  switch (event.type) {
    case 'pick':
      if (state.held?.propId === event.propId) return { state: EMPTY_HAND, announce: `Has deixat anar ${event.label}.` }
      return { state: { held: { propId: event.propId, label: event.label } }, announce: `Has agafat ${event.label}. Ara tria on el vols posar.` }
    case 'place': {
      const held = state.held
      if (!held) return { state, announce: '' }
      if (!event.accepted) return { state: EMPTY_HAND, effect: { type: 'reject', propId: held.propId }, announce: `${capitalise(held.label)} no va ${toPlace(event.zoneLabel)}. Prova un altre lloc.` }
      return { state: EMPTY_HAND, effect: { type: 'drop', propId: held.propId, zoneId: event.zoneId }, announce: `Has posat ${held.label} ${toPlace(event.zoneLabel)}.` }
    }
    case 'cancel':
      return { state: EMPTY_HAND, announce: state.held ? `Has deixat anar ${state.held.label}.` : '' }
  }
}

/** "a" + a place with its article, contracted as Catalan requires: a + el = al, a + els = als. */
export const toPlace = (label: string): string => (label.startsWith('el ') ? `al ${label.slice(3)}` : label.startsWith('els ') ? `als ${label.slice(4)}` : `a ${label}`)

export const capitalise = (text: string): string => (text.length === 0 ? text : `${text[0]?.toUpperCase() ?? ''}${text.slice(1)}`)
