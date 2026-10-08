import { CHARACTER_IDS, THEME_COLORS } from '../../core/storage/db'
import { avatarSpecSchema, type AvatarSpec } from '../model/types'
import { PROPS } from '../art/props'
import { ACCESSORIES_BY_ID } from './kit/accessories'
import { BOTTOMS_BY_ID } from './kit/bottoms'
import { EYES_BY_ID, MOUTHS_BY_ID } from './kit/face'
import { HAIR_BY_ID } from './kit/hair'
import { SHOES_BY_ID } from './kit/shoes'
import { TOPS_BY_ID } from './kit/tops'
import { NEIGHBOURS, neighbourFromSeed } from './neighbours'
import { PET_CATALOG } from './pets/petDefs'
import { defaultAvatar, STARTER_WEARABLES, WEARABLES, WEARABLES_BY_ID } from './wearables'

const CATALOG_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Every id of an AvatarSpec exists in the kit (and wearables in the catalogue). */
function assertDrawable(spec: AvatarSpec) {
  expect(avatarSpecSchema.safeParse(spec).success).toBe(true)
  expect(HAIR_BY_ID[spec.hair.style]).toBeDefined()
  expect(EYES_BY_ID[spec.eyes]).toBeDefined()
  expect(MOUTHS_BY_ID[spec.mouth]).toBeDefined()
  expect(TOPS_BY_ID[spec.top.item]).toBeDefined()
  expect(BOTTOMS_BY_ID[spec.bottom.item]).toBeDefined()
  expect(SHOES_BY_ID[spec.shoes.item]).toBeDefined()
  if (spec.accessory) expect(ACCESSORIES_BY_ID[spec.accessory.item]).toBeDefined()
  const worn = [spec.hair.style, spec.top.item, spec.bottom.item, spec.shoes.item, ...(spec.accessory ? [spec.accessory.item] : [])]
  worn.forEach((id) => expect(WEARABLES_BY_ID[id], id).toBeDefined())
}

describe('wearables catalogue', () => {
  it('meets the minimum variety of the brief', () => {
    const count = (kind: string) => WEARABLES.filter((w) => w.kind === kind).length
    expect(count('hair')).toBeGreaterThanOrEqual(8)
    expect(count('top')).toBeGreaterThanOrEqual(10)
    expect(count('bottom')).toBeGreaterThanOrEqual(8)
    expect(count('shoes')).toBeGreaterThanOrEqual(6)
    expect(count('accessory')).toBeGreaterThanOrEqual(8)
    expect(Object.keys(EYES_BY_ID).length).toBeGreaterThanOrEqual(6)
    expect(Object.keys(MOUTHS_BY_ID).length).toBeGreaterThanOrEqual(6)
  })

  it('has unique, contract-valid ids across wearables, pets and props', () => {
    const ids = [...WEARABLES.map((w) => w.id), ...PET_CATALOG.map((p) => p.id), ...PROPS.map((p) => p.id), ...Object.keys(EYES_BY_ID), ...Object.keys(MOUTHS_BY_ID)]
    expect(new Set(ids).size).toBe(ids.length)
    ids.forEach((id) => {
      expect(id).toMatch(CATALOG_ID)
      expect(id.length).toBeLessThanOrEqual(40)
    })
  })

  it('prices are 0 (starter) or 5–60 coins, with Catalan names', () => {
    ;[...WEARABLES, ...PET_CATALOG].forEach((w) => {
      expect(Number.isInteger(w.price)).toBe(true)
      expect(w.price === 0 || (w.price >= 5 && w.price <= 60)).toBe(true)
      expect(w.name.trim().length).toBeGreaterThan(1)
    })
    expect(STARTER_WEARABLES.length).toBeGreaterThan(0)
    expect(WEARABLES.some((w) => w.price > 0)).toBe(true)
  })

  it('catalogues every drawable wearable and nothing else', () => {
    const drawable = [HAIR_BY_ID, TOPS_BY_ID, BOTTOMS_BY_ID, SHOES_BY_ID, ACCESSORIES_BY_ID].flatMap((m) => Object.keys(m))
    expect(WEARABLES.map((w) => w.id).sort()).toEqual([...drawable].sort())
  })
})

describe('defaultAvatar', () => {
  it.each(CHARACTER_IDS.flatMap((c) => THEME_COLORS.map((t) => [c, t] as const)))('%s / %s is valid and only uses starter items', (character, theme) => {
    const spec = defaultAvatar(character, theme)
    assertDrawable(spec)
    const worn = [spec.hair.style, spec.top.item, spec.bottom.item, spec.shoes.item, ...(spec.accessory ? [spec.accessory.item] : [])]
    worn.forEach((id) => expect(STARTER_WEARABLES).toContain(id))
  })

  it('takes the theme colour for the top (unless it would vanish into the hair)', () => {
    expect(defaultAvatar('blau', 'menta').top.color).toBe('menta')
    expect(defaultAvatar('blau', 'taronja').top.color).toBe('mango')
    expect(defaultAvatar('nyx', 'negre').top.color).toBe('neu')
  })
})

describe('neighbours', () => {
  it('has at least 8 distinct, drawable presets', () => {
    expect(NEIGHBOURS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(NEIGHBOURS.map((n) => n.id)).size).toBe(NEIGHBOURS.length)
    expect(new Set(NEIGHBOURS.map((n) => JSON.stringify(n.spec))).size).toBe(NEIGHBOURS.length)
    NEIGHBOURS.forEach((n) => {
      assertDrawable(n.spec)
      expect(n.stature).toBeGreaterThanOrEqual(0.9)
      expect(n.stature).toBeLessThanOrEqual(1.25)
    })
  })

  it('seeded townspeople are deterministic and drawable', () => {
    for (let i = 0; i < 40; i += 1) {
      const a = neighbourFromSeed(i)
      expect(neighbourFromSeed(i)).toEqual(a)
      assertDrawable(a.spec)
    }
    expect(neighbourFromSeed('a')).not.toEqual(neighbourFromSeed('b'))
  })
})
