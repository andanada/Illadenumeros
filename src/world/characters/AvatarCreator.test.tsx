import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvatarCreator } from './AvatarCreator'
import { defaultAvatar } from './wearables'

const initial = defaultAvatar('blau', 'menta')

function setup(owned?: readonly string[]) {
  const onChange = vi.fn()
  const onDone = vi.fn()
  const user = userEvent.setup()
  render(<AvatarCreator initial={initial} onChange={onChange} onDone={onDone} owned={owned} />)
  return { onChange, onDone, user }
}

describe('AvatarCreator', () => {
  it('shows category tabs with accessible names and a live preview', () => {
    setup()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['Pell', 'Cabell', 'Cara', 'Roba de dalt', 'Roba de baix', 'Sabates', 'Complements'])
    expect(screen.getByRole('img', { name: 'El teu personatge' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'creator-tab-pell')
  })

  it('changes skin with a click and reports it', async () => {
    const { onChange, user } = setup()
    await user.click(screen.getByRole('radio', { name: 'Pell molt fosca' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ skin: 's6' }))
    expect(screen.getByRole('radio', { name: 'Pell molt fosca' })).toHaveAttribute('aria-checked', 'true')
  })

  it('is keyboard operable: arrows move between tabs and inside radio groups', async () => {
    const { onChange, user } = setup()
    screen.getByRole('tab', { name: 'Pell' }).focus()
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    const top = screen.getByRole('tab', { name: 'Roba de dalt' })
    expect(top).toHaveAttribute('aria-selected', 'true')
    expect(top).toHaveFocus()
    const group = screen.getByRole('radiogroup', { name: 'Roba de dalt' })
    const checked = within(group).getByRole('radio', { checked: true })
    checked.focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0].top.item).not.toBe(initial.top.item)
    expect(within(group).getByRole('radio', { checked: true })).toHaveFocus()
  })

  it('colours a garment from the swatches', async () => {
    const { onChange, user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Roba de baix' }))
    await user.click(screen.getByRole('radio', { name: 'Corall' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ bottom: { item: initial.bottom.item, color: 'coral' } }))
  })

  it('can remove the accessory', async () => {
    const { onChange, user } = setup()
    await user.click(screen.getByRole('tab', { name: 'Complements' }))
    await user.click(screen.getByRole('radio', { name: 'Res' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ accessory: null }))
  })

  it('randomises and finishes', async () => {
    const { onChange, onDone, user } = setup()
    await user.click(screen.getByRole('button', { name: /Sorpresa/ }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const randomised = onChange.mock.calls[0]?.[0]
    await user.click(screen.getByRole('button', { name: 'Fet!' }))
    expect(onDone).toHaveBeenCalledWith(randomised)
  })

  it('only offers owned clothes (plus what is worn)', async () => {
    const { user } = setup(['samarreta'])
    await user.click(screen.getByRole('tab', { name: 'Roba de dalt' }))
    const names = within(screen.getByRole('radiogroup', { name: 'Roba de dalt' }))
      .getAllByRole('radio')
      .map((r) => r.getAttribute('aria-label'))
    expect(names.sort()).toEqual(['Samarreta', 'Samarreta estel'])
  })

  it('shop mode: unowned clothes show a price tag in their name and in the tile, plus a footer slot', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <AvatarCreator initial={initial} onDone={vi.fn()} onChange={onChange} priceOf={(id) => (id === 'camisa' ? 15 : undefined)} footer={<p>Barra de compra</p>} title="L’armari" />,
    )
    expect(screen.getByRole('region', { name: 'L’armari' })).toBeInTheDocument()
    expect(screen.getByText('Barra de compra')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Roba de dalt' }))
    const shirt = screen.getByRole('radio', { name: 'Camisa, 15 monedes' })
    expect(within(shirt).getByText('15')).toBeInTheDocument()
    await user.click(shirt)
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ top: expect.objectContaining({ item: 'camisa' }) }))
  })

  it('every option is at least 64 px (class contract)', () => {
    setup()
    screen.getAllByRole('radio').forEach((r) => expect(r.className).toMatch(/size-16|min-h-\[84px\]/))
    screen.getAllByRole('tab').forEach((t) => expect(t.className).toMatch(/min-h-\[76px\]/))
  })
})
