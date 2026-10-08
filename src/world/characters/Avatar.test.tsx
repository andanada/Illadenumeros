import { render, screen } from '@testing-library/react'
import { PALETTE_COLORS, SKIN_TONES, type AvatarSpec } from '../model/types'
import { PropArt, PROPS } from '../art/props'
import { Grain } from '../art/Grain'
import { Avatar } from './Avatar'
import { ACCESSORIES } from './kit/accessories'
import { BOTTOMS } from './kit/bottoms'
import { EYES, MOUTHS } from './kit/face'
import { AVATAR_CROPS, lookToward, POSES, type AvatarCrop } from './kit/geometry'
import { HAIR } from './kit/hair'
import { SHOES } from './kit/shoes'
import { TOPS } from './kit/tops'
import { Neighbour } from './Neighbour'
import { NEIGHBOURS } from './neighbours'
import { Pet } from './pets/Pet'
import { PET_IDS, PETS } from './pets/petDefs'
import { defaultAvatar } from './wearables'

const BASE: AvatarSpec = defaultAvatar('mixa', 'lila')

const variants: readonly [string, (id: string) => AvatarSpec, readonly { id: string }[]][] = [
  ['hair', (style) => ({ ...BASE, hair: { ...BASE.hair, style } }), HAIR],
  ['eyes', (eyes) => ({ ...BASE, eyes }), EYES],
  ['mouth', (mouth) => ({ ...BASE, mouth }), MOUTHS],
  ['top', (item) => ({ ...BASE, top: { ...BASE.top, item } }), TOPS],
  ['bottom', (item) => ({ ...BASE, bottom: { ...BASE.bottom, item } }), BOTTOMS],
  ['shoes', (item) => ({ ...BASE, shoes: { ...BASE.shoes, item } }), SHOES],
  ['accessory', (item) => ({ ...BASE, accessory: { item, color: 'coral' } }), ACCESSORIES],
]

describe('Avatar', () => {
  it.each(variants)('renders every %s part in every pose', (_, make, parts) => {
    parts.forEach((p) =>
      POSES.forEach((pose) => {
        const { container, unmount } = render(<Avatar spec={make(p.id)} pose={pose} animated={false} />)
        expect(container.querySelector('svg')?.getAttribute('data-pose')).toBe(pose)
        expect(container.querySelectorAll('path, rect, circle, ellipse').length).toBeGreaterThan(10)
        unmount()
      }),
    )
  })

  it('renders every skin tone and every palette colour on every slot', () => {
    SKIN_TONES.forEach((skin) =>
      PALETTE_COLORS.forEach((color) => {
        const spec: AvatarSpec = { ...BASE, skin, hair: { ...BASE.hair, color }, top: { ...BASE.top, color }, bottom: { ...BASE.bottom, color }, shoes: { ...BASE.shoes, color }, accessory: { item: 'gorra', color } }
        const { unmount } = render(<Avatar spec={spec} animated={false} />)
        unmount()
      }),
    )
  })

  it('is an accessible image with a title, decorative without', () => {
    const { rerender, container } = render(<Avatar spec={BASE} title="La Laia" animated={false} />)
    expect(screen.getByRole('img', { name: 'La Laia' })).toBeInTheDocument()
    rerender(<Avatar spec={BASE} animated={false} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('falls back gracefully on unknown ids', () => {
    const spec = { ...BASE, eyes: 'ulls-del-futur', top: { item: 'roba-nova', color: 'coral' as const } }
    expect(() => render(<Avatar spec={spec} animated={false} title="x" />)).not.toThrow()
  })

  it('renders the held item in the hand slot and every crop', () => {
    const { container } = render(<Avatar spec={BASE} pose="hold" holding={<circle data-testid="held" r={5} />} animated={false} />)
    expect(container.querySelector('[data-slot="hand"] [data-testid="held"]')).not.toBeNull()
    ;(Object.keys(AVATAR_CROPS) as AvatarCrop[]).forEach((crop) => {
      const { container: c, unmount } = render(<Avatar spec={BASE} crop={crop} animated={false} />)
      expect(c.querySelector('svg')?.getAttribute('viewBox')).toBe(AVATAR_CROPS[crop].join(' '))
      unmount()
    })
  })

  it('lookToward clamps to -1..1', () => {
    const box = { left: 0, top: 0, width: 100, height: 200 }
    expect(lookToward(box, { x: 5000, y: -5000 })).toEqual({ x: 1, y: -1 })
    const centre = lookToward(box, { x: 50, y: 64 })
    expect(centre.x).toBeCloseTo(0)
    expect(centre.y).toBeCloseTo(0)
  })
})

describe('Neighbour, Pet, props', () => {
  it('names preset neighbours and seeded passers-by', () => {
    NEIGHBOURS.forEach((n) => {
      const { unmount } = render(<Neighbour id={n.id} animated={false} />)
      expect(screen.getByRole('img', { name: n.name })).toBeInTheDocument()
      unmount()
    })
    render(<Neighbour id="cua-7" animated={false} />)
    expect(screen.getByRole('img', { name: 'Veí' })).toBeInTheDocument()
  })

  it('renders every pet in every pose with its name', () => {
    PET_IDS.forEach((id) =>
      (['idle', 'happy', 'sleep'] as const).forEach((pose) => {
        const { unmount } = render(<Pet id={id} pose={pose} animated={false} />)
        expect(screen.getByRole('img', { name: PETS[id].name })).toBeInTheDocument()
        unmount()
      }),
    )
  })

  it('renders every prop with an accessible name, and nothing for unknown ids', () => {
    PROPS.forEach((p) => {
      const { unmount } = render(<PropArt id={p.id} color="lila" label="3 €" />)
      expect(screen.getByRole('img', { name: p.name })).toBeInTheDocument()
      unmount()
    })
    const { container } = render(<PropArt id="no-existeix" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('grain overlay is decorative', () => {
    render(<Grain opacity={0.3} />)
    expect(screen.getByTestId('world-grain')).toHaveAttribute('aria-hidden', 'true')
  })
})
