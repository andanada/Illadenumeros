import { Neighbour } from '../characters/Neighbour'
import { Pet } from '../characters/pets/Pet'
import { Avatar } from '../characters/Avatar'
import { defaultAvatar } from '../characters/wearables'
import { PaletteSection, PartsSections, PeopleSections, PrimitivesSection, PropsSections, Section } from './gallery/sections'
import { Grain } from './Grain'
import { PropArt } from './props'

/**
 * Dev-only visual QA sheet of the whole art kit (palette, primitives, every avatar part, poses,
 * neighbours, pets and props). The host mounts it on a dev route; it is not part of the game.
 */
export function Gallery() {
  return (
    <div data-world="dia" className="relative isolate min-h-full bg-[var(--world-ground)] text-[var(--world-text)]">
      <StreetPreview />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 p-4 sm:p-8">
        <PaletteSection />
        <PrimitivesSection />
        <PartsSections />
        <PeopleSections />
        <PropsSections />
        <Section title="Nit (interiors)">
          <div data-world="nit" className="relative flex items-end gap-4 overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(var(--world-sky-top), var(--world-sky-bottom))' }}>
            <PropArt id="fanal" size={180} />
            <Avatar spec={defaultAvatar('nyx', 'negre')} size={180} title="Nyx de nit" />
            <Pet id="nyx" pose="sleep" size={90} />
            <Grain />
          </div>
        </Section>
      </main>
      <Grain />
    </div>
  )
}

/** The three Phase 1 buildings composed as a street, to judge cohesion and scale together. */
function StreetPreview() {
  return (
    <div className="relative h-[460px] overflow-hidden" style={{ background: 'linear-gradient(var(--world-sky-top), var(--world-sky-bottom))' }}>
      <div className="absolute right-8 top-6">
        <PropArt id="sol" size={120} />
      </div>
      <div className="absolute left-[8%] top-10">
        <PropArt id="nuvol-cel" size={56} />
      </div>
      <div className="absolute left-[46%] top-20">
        <PropArt id="nuvol-cel" size={40} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[86px] bg-[var(--world-ground)]" />
      <div className="absolute inset-x-0 bottom-[78px] h-[22px] bg-[var(--world-grass)]" style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
      <div className="absolute bottom-[56px] left-0 flex w-max items-end gap-2 px-6">
        <PropArt id="arbre" size={230} />
        <PropArt id="facana-casa" size={300} />
        <PropArt id="fanal" size={210} />
        <PropArt id="facana-botiga" size={300} />
        <div className="-ml-24 mb-[-6px] flex items-end">
          <Neighbour id="senyora-pilar" size={150} pose="wave" />
          <Avatar spec={defaultAvatar('mixa', 'rosa')} size={150} title="Avatar" look={{ x: -0.8, y: 0 }} />
          <Pet id="blau" size={70} pose="happy" />
        </div>
        <PropArt id="mata" size={60} />
        <PropArt id="parada-autobus" size={260} />
        <Neighbour id="en-kofi" size={150} />
        <PropArt id="banc" size={80} />
        <PropArt id="pi" size={230} />
      </div>
    </div>
  )
}
