import { BaguetteArt, CroissantArt, MuffinArt } from './bakeArt'

/** A product as a small standalone picture (the bubble of a customer). */
export function ProductIcon({ id, size = 30 }: { id: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {id === 'croissant' ? <CroissantArt /> : id === 'baguette' ? <BaguetteArt /> : <MuffinArt stage="simple" />}
    </svg>
  )
}
