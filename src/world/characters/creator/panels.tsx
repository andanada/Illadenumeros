import type { Dispatch } from 'react'
import { COLOR_NAMES, PALETTE, PALETTE_ORDER, SKIN, SKIN_NAMES, SKIN_ORDER } from '../../art/palette'
import type { AvatarSpec, PaletteColor } from '../../model/types'
import { Avatar } from '../Avatar'
import type { AvatarCrop } from '../kit/geometry'
import { ACCESSORIES_BY_ID } from '../kit/accessories'
import { BOTTOMS_BY_ID } from '../kit/bottoms'
import { EYES_BY_ID, MOUTHS_BY_ID } from '../kit/face'
import { HAIR_BY_ID } from '../kit/hair'
import { SHOES_BY_ID } from '../kit/shoes'
import { TOPS_BY_ID } from '../kit/tops'
import type { ColorSlot, CreatorAction, CreatorState } from './creatorReducer'
import { RadioGrid, type RadioOption } from './RadioGrid'

const NONE = 'cap'
const THUMB = 76

/** Body crops hide the hair so long styles don't poke into the tile. */
const BODY_CROPS: readonly AvatarCrop[] = ['top', 'bottom', 'feet']

/** Price of a tile she does not own yet (undefined = hers / free). */
export type PriceOf = (id: string) => number | undefined

function PriceTag({ price }: { price: number }) {
  return (
    <span aria-hidden="true" className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-[var(--world-mango)] py-0.5 pl-1 pr-2 text-sm font-bold text-[var(--world-carbo)] shadow-[0_2px_0_rgba(43,36,64,0.18)]">
      <span className="block size-3.5 rounded-full bg-[#FFE07A] shadow-[inset_0_-2px_0_#E8901A]" />
      {price}
    </span>
  )
}

function thumb(spec: AvatarSpec, crop: AvatarCrop, price?: number) {
  const shown = BODY_CROPS.includes(crop) ? { ...spec, hair: { ...spec.hair, style: 'cabell-rapat' }, accessory: null } : spec
  return (
    <span className={`relative grid size-full place-items-center rounded-[14px] ${price === undefined ? 'bg-[var(--world-sky-bottom)]' : 'bg-[var(--world-surface-2)]'}`}>
      <Avatar spec={shown} crop={crop} size={crop === 'feet' ? 40 : THUMB} animated={false} />
      {price !== undefined && <PriceTag price={price} />}
    </span>
  )
}

function Swatches({ label, value, onPick }: { label: string; value: PaletteColor; onPick: (c: PaletteColor) => void }) {
  const options: RadioOption[] = PALETTE_ORDER.map((c) => ({
    id: c,
    label: COLOR_NAMES[c],
    content: (
      <span className="block size-full rounded-full" style={{ background: PALETTE[c].base, boxShadow: `inset 0 -6px 0 ${PALETTE[c].shade}` }} />
    ),
  }))
  return <RadioGrid label={label} variant="swatch" options={options} value={value} onChange={(id) => onPick(id as PaletteColor)} />
}

interface PanelProps {
  state: CreatorState
  dispatch: Dispatch<CreatorAction>
  priceOf?: PriceOf
}

/** A picture grid where each tile previews the current avatar wearing that option. */
function PartGrid({ label, ids, value, names, preview, crop, onPick, priceOf }: {
  label: string
  ids: readonly string[]
  value: string
  names: Readonly<Record<string, { name: string } | undefined>>
  preview: (id: string) => AvatarSpec
  crop: AvatarCrop
  onPick: (id: string) => void
  priceOf?: PriceOf
}) {
  const options = ids.map((id) => {
    const price = priceOf?.(id)
    const name = names[id]?.name ?? id
    return { id, label: price === undefined ? name : `${name}, ${price} monedes`, content: thumb(preview(id), crop, price) }
  })
  return <RadioGrid label={label} options={options} value={value} onChange={onPick} />
}

function colorPicker(state: CreatorState, dispatch: Dispatch<CreatorAction>, slot: ColorSlot, label: string) {
  const { spec } = state
  const value = slot === 'hair' ? spec.hair.color : slot === 'accessory' ? (spec.accessory?.color ?? state.accessoryColor) : spec[slot].color
  return <Swatches label={label} value={value} onPick={(color) => dispatch({ type: 'color', slot, color })} />
}

export function CreatorPanel({ state, dispatch, priceOf }: PanelProps) {
  const { spec, options, tab } = state
  switch (tab) {
    case 'pell':
      return (
        <RadioGrid
          label="To de pell"
          variant="swatch"
          value={spec.skin}
          onChange={(id) => dispatch({ type: 'skin', skin: id as AvatarSpec['skin'] })}
          options={SKIN_ORDER.map((s) => ({
            id: s,
            label: SKIN_NAMES[s],
            content: <span className="block size-full rounded-full" style={{ background: SKIN[s].base, boxShadow: `inset 0 -6px 0 ${SKIN[s].shade}` }} />,
          }))}
        />
      )
    case 'cabell':
      return (
        <>
          <PartGrid label="Pentinat" ids={options.hair} value={spec.hair.style} names={HAIR_BY_ID} crop="head" preview={(id) => ({ ...spec, accessory: null, hair: { ...spec.hair, style: id } })} onPick={(style) => dispatch({ type: 'hair', style })} />
          {colorPicker(state, dispatch, 'hair', 'Color del cabell')}
        </>
      )
    case 'cara':
      return (
        <>
          <PartGrid label="Ulls" ids={options.eyes} value={spec.eyes} names={EYES_BY_ID} crop="face" preview={(id) => ({ ...spec, accessory: null, eyes: id })} onPick={(id) => dispatch({ type: 'eyes', id })} />
          <PartGrid label="Boca" ids={options.mouth} value={spec.mouth} names={MOUTHS_BY_ID} crop="face" preview={(id) => ({ ...spec, accessory: null, mouth: id })} onPick={(id) => dispatch({ type: 'mouth', id })} />
        </>
      )
    case 'dalt':
      return (
        <>
          <PartGrid label="Roba de dalt" ids={options.top} value={spec.top.item} names={TOPS_BY_ID} priceOf={priceOf} crop="top" preview={(item) => ({ ...spec, top: { ...spec.top, item } })} onPick={(item) => dispatch({ type: 'wear', slot: 'top', item })} />
          {colorPicker(state, dispatch, 'top', 'Color')}
        </>
      )
    case 'baix':
      return (
        <>
          <PartGrid label="Roba de baix" ids={options.bottom} value={spec.bottom.item} names={BOTTOMS_BY_ID} priceOf={priceOf} crop="bottom" preview={(item) => ({ ...spec, top: TOPS_BY_ID[spec.top.item]?.long ? { ...spec.top, item: 'samarreta' } : spec.top, bottom: { ...spec.bottom, item } })} onPick={(item) => dispatch({ type: 'wear', slot: 'bottom', item })} />
          {colorPicker(state, dispatch, 'bottom', 'Color')}
        </>
      )
    case 'sabates':
      return (
        <>
          <PartGrid label="Sabates" ids={options.shoes} value={spec.shoes.item} names={SHOES_BY_ID} priceOf={priceOf} crop="feet" preview={(item) => ({ ...spec, shoes: { ...spec.shoes, item } })} onPick={(item) => dispatch({ type: 'wear', slot: 'shoes', item })} />
          {colorPicker(state, dispatch, 'shoes', 'Color')}
        </>
      )
    case 'complements': {
      const names = { ...ACCESSORIES_BY_ID, [NONE]: { name: 'Res' } }
      const color = spec.accessory?.color ?? state.accessoryColor
      return (
        <>
          <PartGrid
            label="Complements"
            ids={[NONE, ...options.accessory]}
            value={spec.accessory?.item ?? NONE}
            names={names}
            priceOf={priceOf}
            crop="head"
            preview={(item) => ({ ...spec, accessory: item === NONE ? null : { item, color } })}
            onPick={(item) => dispatch({ type: 'accessory', item: item === NONE ? null : item })}
          />
          {colorPicker(state, dispatch, 'accessory', 'Color')}
        </>
      )
    }
  }
}
