import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { GAME_TITLES, type GameProps } from './gameTypes'

type GameComponent = LazyExoticComponent<ComponentType<GameProps>>

/** Single registry shared by the free-play page and the daily mission. */
export const GAME_REGISTRY: Readonly<Record<string, GameComponent>> = {
  'repte-illa': lazy(() => import('../../games/repte-illa/RepteIllaGame').then((m) => ({ default: m.RepteIllaGame }))),
  'duel-llampec': lazy(() => import('../../games/duel-llampec/DuelLlampecGame').then((m) => ({ default: m.DuelLlampecGame }))),
  'tren-sumes': lazy(() => import('../../games/tren-sumes/TrenSumesGame').then((m) => ({ default: m.TrenSumesGame }))),
  'pesca-sumes': lazy(() => import('../../games/pesca-sumes/PescaSumesGame').then((m) => ({ default: m.PescaSumesGame }))),
  bombolles: lazy(() => import('../../games/bombolles/BombollesGame').then((m) => ({ default: m.BombollesGame }))),
  'marc-magic': lazy(() => import('../../games/marc-magic/MarcMagicGame').then((m) => ({ default: m.MarcMagicGame }))),
  'cursa-recta': lazy(() => import('../../games/cursa-recta/CursaRectaGame').then((m) => ({ default: m.CursaRectaGame }))),
  'fleca-files': lazy(() => import('../../games/fleca-files/FlecaFilesGame').then((m) => ({ default: m.FlecaFilesGame }))),
  llaminadures: lazy(() => import('../../games/llaminadures/LlaminadureGame').then((m) => ({ default: m.LlaminadureGame }))),
  'botiga-pluja': lazy(() => import('../../games/botiga-pluja/BotigaPlujaGame').then((m) => ({ default: m.BotigaPlujaGame }))),
  'numero-amagat': lazy(() => import('../../games/numero-amagat/NumeroAmagatGame').then((m) => ({ default: m.NumeroAmagatGame }))),
  'pastis-fraccions': lazy(() => import('../../games/pastis-fraccions/PastisFraccionsGame').then((m) => ({ default: m.PastisFraccionsGame }))),
  'laberint-aventura': lazy(() => import('../../games/laberint-aventura/LaberintGame').then((m) => ({ default: m.LaberintGame }))),
  'domino-sumes': lazy(() => import('../../games/domino-sumes/DominoSumesGame').then((m) => ({ default: m.DominoSumesGame }))),
  'piramide-magica': lazy(() => import('../../games/piramide-magica/PiramideMagicaGame').then((m) => ({ default: m.PiramideMagicaGame }))),
  'cuina-sumes': lazy(() => import('../../games/cuina-sumes/CuinaSumesGame').then((m) => ({ default: m.CuinaSumesGame }))),
  'parelles-cartes': lazy(() => import('../../games/parelles-cartes/ParellesCartesGame').then((m) => ({ default: m.ParellesCartesGame }))),
  bitlles: lazy(() => import('../../games/bitlles/BitllesGame').then((m) => ({ default: m.BitllesGame }))),
  'detectiu-errors': lazy(() => import('../../games/detectiu-errors/DetectiuErrorsGame').then((m) => ({ default: m.DetectiuErrorsGame }))),
  'contes-numeros': lazy(() => import('../../games/contes-numeros/ContesNumerosGame').then((m) => ({ default: m.ContesNumerosGame }))),
  'escape-room': lazy(() => import('../../games/escape-room/EscapeRoomGame').then((m) => ({ default: m.EscapeRoomGame }))),
  'ritme-taules': lazy(() => import('../../games/ritme-taules/RitmeTaulesGame').then((m) => ({ default: m.RitmeTaulesGame }))),
  'jardi-arrays': lazy(() => import('../../games/jardi-arrays/JardiArraysGame').then((m) => ({ default: m.JardiArraysGame }))),
  'constructor-torres': lazy(() => import('../../games/constructor-torres/ConstructorTorresGame').then((m) => ({ default: m.ConstructorTorresGame }))),
}

export const isGameId = (id: string | undefined): id is string => id !== undefined && id in GAME_TITLES && id in GAME_REGISTRY
