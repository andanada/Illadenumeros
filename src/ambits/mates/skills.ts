import type { SkillNode } from '../../core/ambit/types'

const ADD_TARGET_MS = 3000
const STEP_TARGET_MS = 6000
const TABLE_TARGET_MS = 4000
const MULTI_STEP_TARGET_MS = 9000

/** Skill graph for 1r (A), 2n (B), 3r (C) and 4t (D). A later phase adds E (5è). */
export const MATES_SKILLS: SkillNode[] = [
  { id: 'A1', code: 'A1', grade: 1, title: 'Comptar fins a 20', prereqs: [], hasFacts: false, games: ['marc-magic', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'A2', code: 'A2', grade: 1, title: 'Comparar nombres fins a 20', prereqs: ['A1'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'A3', code: 'A3', grade: 1, title: 'Descompondre el 5 i el 10', prereqs: ['A1'], hasFacts: false, games: ['bombolles', 'marc-magic'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'A4', code: 'A4', grade: 1, title: 'Sumar fins a 10', prereqs: ['A3'], hasFacts: true, games: ['marc-magic', 'duel-llampec'], fluencyTargetMs: ADD_TARGET_MS },
  { id: 'A5', code: 'A5', grade: 1, title: 'Els amics del 10', prereqs: ['A3'], hasFacts: true, games: ['bombolles', 'duel-llampec'], fluencyTargetMs: ADD_TARGET_MS },
  { id: 'A6', code: 'A6', grade: 1, title: 'Restar fins a 10', prereqs: ['A4'], hasFacts: true, games: ['marc-magic', 'duel-llampec'], fluencyTargetMs: ADD_TARGET_MS },
  { id: 'A7', code: 'A7', grade: 1, title: 'Dobles i gairebé dobles', prereqs: ['A4'], hasFacts: true, games: ['marc-magic', 'duel-llampec'], fluencyTargetMs: ADD_TARGET_MS },
  { id: 'A8', code: 'A8', grade: 1, title: 'Sumar passant per la desena', prereqs: ['A5', 'A7'], hasFacts: true, games: ['bombolles', 'marc-magic', 'duel-llampec'], fluencyTargetMs: ADD_TARGET_MS },
  { id: 'A9', code: 'A9', grade: 1, title: 'Restar fins a 20', prereqs: ['A6', 'A8'], hasFacts: true, games: ['cursa-recta', 'duel-llampec'], fluencyTargetMs: ADD_TARGET_MS },
  { id: 'A10', code: 'A10', grade: 1, title: 'El número amagat', prereqs: ['A4', 'A6'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'B1', code: 'B1', grade: 2, title: 'Desenes i unitats fins a 199', prereqs: ['A1'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'B2', code: 'B2', grade: 2, title: 'La recta numèrica fins a 199', prereqs: ['B1'], hasFacts: false, games: ['cursa-recta', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'B3', code: 'B3', grade: 2, title: 'Comparar nombres fins a 199', prereqs: ['B1', 'A2'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'B4', code: 'B4', grade: 2, title: 'Sumar desenes', prereqs: ['B1'], hasFacts: false, games: ['cursa-recta', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'B5', code: 'B5', grade: 2, title: 'Sumar 2 xifres + 1 xifra', prereqs: ['A8', 'B4'], hasFacts: false, games: ['cursa-recta', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'B6', code: 'B6', grade: 2, title: 'Restar 2 xifres − 1 xifra', prereqs: ['A9', 'B4'], hasFacts: false, games: ['cursa-recta', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'B7', code: 'B7', grade: 2, title: 'Sumar i restar de 2 xifres', prereqs: ['B5', 'B6'], hasFacts: false, games: ['cursa-recta', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'C1', code: 'C1', grade: 3, title: 'Centenes, desenes i unitats fins a 1.000', prereqs: ['B1'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'C2', code: 'C2', grade: 3, title: 'Sumar i restar de 3 xifres', prereqs: ['B7', 'C1'], hasFacts: false, games: ['repte-illa', 'cursa-recta'], fluencyTargetMs: MULTI_STEP_TARGET_MS },
  { id: 'C3', code: 'C3', grade: 3, title: 'Què vol dir multiplicar', prereqs: ['B5'], hasFacts: false, games: ['fleca-files', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'C4', code: 'C4', grade: 3, title: 'Taules del 2, del 5 i del 10', prereqs: ['C3'], hasFacts: true, games: ['fleca-files', 'duel-llampec'], fluencyTargetMs: TABLE_TARGET_MS },
  { id: 'C5', code: 'C5', grade: 3, title: 'Taules del 3 i del 4', prereqs: ['C4'], hasFacts: true, games: ['fleca-files', 'duel-llampec'], fluencyTargetMs: TABLE_TARGET_MS },
  { id: 'C6', code: 'C6', grade: 3, title: 'Repartir i fer grups', prereqs: ['C3'], hasFacts: false, games: ['llaminadures', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'C7', code: 'C7', grade: 3, title: 'Dividir entre 2, 5 i 10', prereqs: ['C4', 'C6'], hasFacts: true, games: ['llaminadures', 'duel-llampec'], fluencyTargetMs: TABLE_TARGET_MS },
  { id: 'C8', code: 'C8', grade: 3, title: 'La meitat, el terç i el quart', prereqs: ['C6'], hasFacts: false, games: ['llaminadures', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'C9', code: 'C9', grade: 3, title: 'Euros, cèntims i canvi', prereqs: ['B7', 'C2'], hasFacts: false, games: ['botiga-pluja', 'repte-illa'], fluencyTargetMs: MULTI_STEP_TARGET_MS },
  { id: 'C10', code: 'C10', grade: 3, title: 'Problemes de dos passos', prereqs: ['C3', 'C2'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: MULTI_STEP_TARGET_MS },
  { id: 'D1', code: 'D1', grade: 4, title: 'Nombres fins a 9.999', prereqs: ['C1'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'D2', code: 'D2', grade: 4, title: 'Taules del 6 i del 9', prereqs: ['C5'], hasFacts: true, games: ['fleca-files', 'duel-llampec'], fluencyTargetMs: TABLE_TARGET_MS },
  { id: 'D3', code: 'D3', grade: 4, title: 'Taules del 7 i del 8', prereqs: ['D2'], hasFacts: true, games: ['fleca-files', 'duel-llampec'], fluencyTargetMs: TABLE_TARGET_MS },
  { id: 'D4', code: 'D4', grade: 4, title: 'Totes les divisions de les taules', prereqs: ['D3', 'C7'], hasFacts: true, games: ['llaminadures', 'duel-llampec'], fluencyTargetMs: TABLE_TARGET_MS },
  { id: 'D5', code: 'D5', grade: 4, title: 'Multiplicar 2 xifres per 1 xifra', prereqs: ['D2', 'C1'], hasFacts: false, games: ['fleca-files', 'repte-illa'], fluencyTargetMs: MULTI_STEP_TARGET_MS },
  { id: 'D6', code: 'D6', grade: 4, title: 'Divisions amb residu', prereqs: ['D4'], hasFacts: false, games: ['llaminadures', 'repte-illa'], fluencyTargetMs: MULTI_STEP_TARGET_MS },
  { id: 'D7', code: 'D7', grade: 4, title: 'Fraccions d’una col·lecció', prereqs: ['C8'], hasFacts: false, games: ['llaminadures', 'repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'D8', code: 'D8', grade: 4, title: 'Arrodonir i estimar', prereqs: ['D1'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
  { id: 'D9', code: 'D9', grade: 4, title: 'El número amagat de × i :', prereqs: ['A10', 'D4'], hasFacts: false, games: ['repte-illa'], fluencyTargetMs: STEP_TARGET_MS },
]

/**
 * Placement test path: the first step is "sumar fins a 10", never the 4th-grade level.
 * It climbs through 3r (meaning of ×, 2-5-10 tables) up to the 4t tables.
 */
export const DIAGNOSTIC_ANCHORS = ['A4', 'A5', 'A8', 'A9', 'B5', 'B7', 'C3', 'C4', 'D2'] as const
