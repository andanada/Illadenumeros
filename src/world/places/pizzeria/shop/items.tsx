import type { InteractableDef } from '../../../sandbox/defs'
import type { UseChain } from '../../../sandbox/logic/useChain'
import { RollingPinArt } from '../../fleca/shop/bakeArt'
import { CUTS } from '../pizza/cutLogic'
import { CheeseArt, CoinArt, CutterArt, DoughBinArt, PepperoniBowlArt, PizzaArt, PizzaBoxArt, SauceArt, SliceArt } from './pizzaArt'

const pizzaChain: UseChain = {
  stages: [
    { id: 'massa', label: 'una bola de massa', said: '' },
    { id: 'base', label: 'estesa', tool: 'corro', said: 'Has estès la base de la pizza!' },
    { id: 'amb-tomaquet', label: 'amb tomàquet', tool: 'salsa', said: 'Tomàquet a sobre!' },
    { id: 'amb-formatge', label: 'amb formatge', tool: 'formatge', said: 'I ara el formatge!' },
    { id: 'feta', label: 'amb pepperoni', tool: 'pepperoni', said: 'Ja està preparada per al forn!' },
  ],
}

const cutChain: UseChain = {
  stages: [
    { id: 'sencera', label: 'sencera', said: '' },
    { id: 'tallada', label: 'tallada', tool: 'tallador', said: 'Zas! La pizza està tallada.' },
  ],
}

export const CUTTER_IDS = CUTS.map((n) => `tallador-${n}`)

/** The defs of the pizzeria. The cutters all act as the same tool kind: the slicer reads which one is in hand. */
export const PIZZERIA_DEFS: readonly InteractableDef[] = [
  { id: 'massa-pizza', label: 'la massa de pizza', single: 'una massa de pizza', height: 0.12, pickup: true, use: pizzaChain, art: (s) => <PizzaArt stage={s.stage} /> },
  { id: 'pizza-cuita', label: 'la pizza cuita', single: 'una pizza', height: 0.13, pickup: true, use: cutChain, art: () => <PizzaArt stage="feta" baked /> },
  { id: 'tros', label: 'el tros de pizza', single: 'un tros de pizza', height: 0.08, pickup: true, art: () => <SliceArt /> },
  { id: 'corro', label: 'el corró', height: 0.1, pickup: true, tool: 'corro', art: () => <RollingPinArt /> },
  { id: 'salsa', label: 'el pot de tomàquet', height: 0.11, pickup: true, tool: 'salsa', art: () => <SauceArt /> },
  { id: 'formatge', label: 'el formatge', height: 0.1, pickup: true, tool: 'formatge', art: () => <CheeseArt /> },
  { id: 'pepperoni', label: 'el bol de pepperoni', height: 0.1, pickup: true, tool: 'pepperoni', art: () => <PepperoniBowlArt /> },
  ...CUTS.map<InteractableDef>((n) => ({ id: `tallador-${n}`, label: `el tallador de ${n} trossos`, height: 0.11, pickup: true, tool: 'tallador', art: () => <CutterArt parts={n} /> })),
  { id: 'pastera', label: 'la pastera de massa', height: 0.2, container: true, art: (s) => <DoughBinArt open={s.open} /> },
  { id: 'caixa-pizza', label: 'la caixa de pizza', height: 0.1, pickup: true, toss: true, art: () => <PizzaBoxArt /> },
  { id: 'moneda', label: 'la moneda', single: 'una moneda', height: 0.06, pickup: true, sound: 'coin', art: () => <CoinArt /> },
]
