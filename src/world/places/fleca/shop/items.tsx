import { PALETTE as P } from '../../../art/palette'
import type { InteractableDef } from '../../../sandbox/defs'
import type { UseChain } from '../../../sandbox/logic/useChain'
import { Contact } from '../../../sandbox/art/foodArt'
import { PRODUCTS, type Product } from '../bake/products'
import { BaguetteArt, CroissantArt, DoughArt, DoughCrateArt, IcingArt, MuffinArt, RollingPinArt, ShaperArt, SprinklesArt } from './bakeArt'

const doughChain: UseChain = {
  stages: [
    { id: 'massa', label: 'una bola de massa', said: '' },
    { id: 'estesa', label: 'estesa', tool: 'rodet', said: 'Has estès la massa amb el corró!' },
    { id: 'modelada', label: 'modelada', tool: 'modelador', said: 'Ja té forma! Ara, a la safata del forn.' },
  ],
}

const decorChain: UseChain = {
  stages: [
    { id: 'simple', label: 'sense decorar', said: '' },
    { id: 'glassa', label: 'amb glassa', tool: 'glassa', said: 'Glassa a sobre!' },
    { id: 'fideus', label: 'amb fideus de colors', tool: 'fideus', said: 'Quina festa de colors!' },
  ],
}

const ofProduct = (p: Product): readonly InteractableDef[] => {
  const article = p.gender === 'f' ? 'la' : 'el'
  const art = (hot: boolean) => (s: { stage: string }) => (p.id === 'magdalena' ? <MuffinArt stage={s.stage} hot={hot} /> : p.id === 'croissant' ? <CroissantArt hot={hot} /> : <BaguetteArt hot={hot} />)
  return [
    { id: p.raw, label: `${article} massa de ${p.many}`, single: `una massa de ${p.one}`, height: p.height * 1.2, pickup: true, use: doughChain, art: (s) => <DoughArt kind={p.id} stage={s.stage} /> },
    { id: p.hot, label: `${article} ${p.one} calent${p.gender === 'f' ? 'a' : ''}`, single: `${p.gender === 'f' ? 'una' : 'un'} ${p.one}`, height: p.height, pickup: true, art: art(true) },
    { id: p.id, label: `${article} ${p.one}`, single: `${p.gender === 'f' ? 'una' : 'un'} ${p.one}`, height: p.height, pickup: true, ...(p.id === 'magdalena' ? { use: decorChain } : {}), art: art(false) },
  ]
}

function SurpriseBox({ charge, revealed }: { charge: number; revealed: string | undefined }) {
  return (
    <g>
      <Contact rx={36} />
      <rect x="14" y="36" width="72" height="54" rx="8" fill={P.rosa.base} />
      <rect x="10" y="26" width="80" height="16" rx="7" fill={P.rosa.shade} />
      <rect x="44" y="26" width="12" height="64" fill={P.neu.light} opacity="0.85" />
      {revealed === undefined && charge > 0.3 && <path d="M30 40 L40 54 L32 66" stroke={P.carbo.base} strokeWidth="3" fill="none" strokeLinecap="round" />}
      {revealed !== undefined && <path d="M50 2 L58 22 L78 22 L62 34 L68 54 L50 42 L32 54 L38 34 L22 22 L42 22Z" fill={P.mango.base} />}
    </g>
  )
}

export const FLECA_DEFS: readonly InteractableDef[] = [
  ...PRODUCTS.flatMap(ofProduct),
  { id: 'rodet', label: 'el corró', height: 0.1, pickup: true, tool: 'rodet', art: () => <RollingPinArt /> },
  { id: 'modelador', label: 'el modelador', height: 0.1, pickup: true, tool: 'modelador', art: () => <ShaperArt /> },
  { id: 'glassa', label: 'la mànega de glassa', height: 0.11, pickup: true, tool: 'glassa', art: () => <IcingArt /> },
  { id: 'fideus', label: 'els fideus de colors', height: 0.1, pickup: true, tool: 'fideus', art: () => <SprinklesArt /> },
  { id: 'caixa-massa', label: 'la caixa de massa', height: 0.2, container: true, art: (s) => <DoughCrateArt open={s.open} /> },
  { id: 'caixa-sorpresa', label: 'la caixa sorpresa', height: 0.13, surprise: true, surpriseTaps: 3, surpriseOptions: ['un pollet', 'una estrella', 'un cor'], art: (s) => <SurpriseBox charge={s.charge} revealed={s.revealed} /> },
]
