import type { ReactNode } from 'react'
import { Avatar } from '../../characters/Avatar'
import { ACCESSORIES } from '../../characters/kit/accessories'
import { BOTTOMS } from '../../characters/kit/bottoms'
import { EYES, MOUTHS } from '../../characters/kit/face'
import { POSES, type AvatarCrop } from '../../characters/kit/geometry'
import { HAIR } from '../../characters/kit/hair'
import { SHOES } from '../../characters/kit/shoes'
import { TOPS } from '../../characters/kit/tops'
import { Neighbour } from '../../characters/Neighbour'
import { NEIGHBOURS } from '../../characters/neighbours'
import { Pet } from '../../characters/pets/Pet'
import { PET_IDS } from '../../characters/pets/petDefs'
import { defaultAvatar } from '../../characters/wearables'
import type { AvatarSpec, PaletteColor } from '../../model/types'
import { COLOR_NAMES, PALETTE, PALETTE_ORDER, SKIN, SKIN_NAMES, SKIN_ORDER } from '../palette'
import { Blob, Shadow, Soft, Sparkle } from '../primitives'
import { PropArt, PROPS } from '../props'

const BASE: AvatarSpec = defaultAvatar('blau', 'menta')
const ROTATE: readonly PaletteColor[] = ['coral', 'mango', 'menta', 'cel', 'lila', 'rosa', 'llima', 'xocolata', 'neu', 'carbo']
const colorAt = (i: number): PaletteColor => ROTATE[i % ROTATE.length] ?? 'coral'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-[var(--world-carbo)]">{title}</h2>
      <div className="flex flex-wrap items-end gap-4 rounded-[28px] bg-[var(--world-surface)] p-4 shadow-[var(--world-shadow-soft)]">{children}</div>
    </section>
  )
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-1">
      {children}
      <figcaption className="text-xs font-semibold text-[var(--world-text-soft)]">{label}</figcaption>
    </figure>
  )
}

export function PaletteSection() {
  return (
    <Section title="Paleta i pells">
      {PALETTE_ORDER.map((c) => (
        <Labelled key={c} label={COLOR_NAMES[c]}>
          <div className="flex overflow-hidden rounded-2xl">
            {(['light', 'base', 'shade'] as const).map((k) => (
              <span key={k} className="h-14 w-8" style={{ background: PALETTE[c][k] }} />
            ))}
          </div>
        </Labelled>
      ))}
      {SKIN_ORDER.map((s) => (
        <Labelled key={s} label={SKIN_NAMES[s]}>
          <span className="block size-14 rounded-full" style={{ background: SKIN[s].base, boxShadow: `inset -8px -6px 0 ${SKIN[s].shade}` }} />
        </Labelled>
      ))}
    </Section>
  )
}

export function PrimitivesSection() {
  return (
    <Section title="Primitives">
      <svg viewBox="0 0 560 130" width={560} height={130} aria-label="Primitives" role="img">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <Shadow cx={60 + i * 120} cy={118} rx={46} long={40} />
            <Blob cx={60 + i * 120} cy={64} rx={48} ry={44} wobble={0.04 + i * 0.04} seed={`g${i}`} fill={PALETTE[colorAt(i)].base} />
          </g>
        ))}
        <Soft x={490} y={20} w={60} h={90} r={16} wobble={2} seed="s" fill={PALETTE.lila.base} />
        <Sparkle cx={520} cy={50} size={14} />
      </svg>
    </Section>
  )
}

function PartRow({ title, ids, crop, specFor, size = 120 }: { title: string; ids: readonly { id: string; name: string }[]; crop?: AvatarCrop; specFor: (id: string, i: number) => AvatarSpec; size?: number }) {
  return (
    <Section title={`${title} (${ids.length})`}>
      {ids.map((p, i) => (
        <Labelled key={p.id} label={p.name}>
          <Avatar spec={specFor(p.id, i)} crop={crop} size={size} animated={false} title={p.name} />
        </Labelled>
      ))}
    </Section>
  )
}

export function PartsSections() {
  return (
    <>
      <PartRow title="Pentinats" ids={HAIR} crop="head" specFor={(style, i) => ({ ...BASE, accessory: null, skin: SKIN_ORDER[i % 6] ?? 's1', hair: { style, color: colorAt(i + 7) } })} />
      <PartRow title="Ulls" ids={EYES} crop="face" size={70} specFor={(eyes) => ({ ...BASE, eyes })} />
      <PartRow title="Boques" ids={MOUTHS} crop="face" size={70} specFor={(mouth) => ({ ...BASE, mouth })} />
      <PartRow title="Roba de dalt" ids={TOPS} size={180} specFor={(item, i) => ({ ...BASE, accessory: null, top: { item, color: colorAt(i) } })} />
      <PartRow title="Roba de baix" ids={BOTTOMS} crop="bottom" size={100} specFor={(item, i) => ({ ...BASE, bottom: { item, color: colorAt(i + 3) } })} />
      <PartRow title="Sabates" ids={SHOES} crop="feet" size={60} specFor={(item, i) => ({ ...BASE, shoes: { item, color: colorAt(i + 1) } })} />
      <PartRow title="Complements" ids={ACCESSORIES} crop="head" specFor={(item, i) => ({ ...BASE, accessory: { item, color: colorAt(i + 4) } })} />
      <Section title="Poses">
        {POSES.map((pose) => (
          <Labelled key={pose} label={pose}>
            <Avatar spec={defaultAvatar('mixa', 'rosa')} pose={pose} size={200} title={pose} seed={pose} holding={pose === 'hold' ? <g transform="translate(-24 -36)"><PropArtG id="poma" /></g> : undefined} />
          </Labelled>
        ))}
        <Labelled label="mira a la dreta">
          <Avatar spec={defaultAvatar('nuvol', 'blau')} look={{ x: 1, y: -0.3 }} size={200} title="mira" seed="m" />
        </Labelled>
      </Section>
    </>
  )
}

/** A prop's raw <g> for use inside another SVG (the hold slot). */
function PropArtG({ id }: { id: string }) {
  const def = PROPS.find((p) => p.id === id)
  return <>{def?.render({})}</>
}

export function PeopleSections() {
  return (
    <>
      <Section title={`Veïns (${NEIGHBOURS.length}) + gent aleatòria`}>
        {NEIGHBOURS.map((n) => (
          <Labelled key={n.id} label={n.role}>
            <Neighbour id={n.id} size={180} />
          </Labelled>
        ))}
        {['bus-1', 'bus-2', 'cua-3'].map((seed) => (
          <Labelled key={seed} label={seed}>
            <Neighbour id={seed} size={180} />
          </Labelled>
        ))}
      </Section>
      <Section title="Mascotes">
        {PET_IDS.map((id, i) => (
          <Labelled key={id} label={id}>
            <Pet id={id} size={120} pose={i === 3 ? 'sleep' : i === 1 ? 'happy' : 'idle'} />
          </Labelled>
        ))}
      </Section>
    </>
  )
}

export function PropsSections() {
  const groups = ['botiga', 'diners', 'carrer', 'cel'] as const
  return (
    <>
      {groups.map((g) => (
        <Section key={g} title={`Objectes: ${g}`}>
          {PROPS.filter((p) => p.group === g).map((p) => (
            <Labelled key={p.id} label={p.id}>
              <PropArt id={p.id} size={Math.min(200, Math.max(48, p.h * 0.7))} label={p.id === 'etiqueta-preu' ? '2,50 €' : undefined} />
            </Labelled>
          ))}
        </Section>
      ))}
    </>
  )
}
