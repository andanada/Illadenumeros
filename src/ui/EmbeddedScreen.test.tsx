import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { EmbeddedScreenProvider } from './EmbeddedScreen'
import { Screen } from './Screen'

const page = (embedded: boolean) =>
  render(
    <MemoryRouter>
      <EmbeddedScreenProvider value={embedded}>
        <Screen title="Joc" back={() => undefined} right={<span>dreta</span>}>
          <p>contingut</p>
        </Screen>
      </EmbeddedScreenProvider>
    </MemoryRouter>,
  )

describe('Screen inside a frame', () => {
  it('by default it is the full notebook page, as every game has always been', () => {
    const { container } = page(false)
    expect(container.querySelector('.notebook')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Joc' })).toBeVisible()
  })

  it('embedded: no notebook, the same back button, content and right-hand tools; the title stays for screen readers', () => {
    const { container } = page(true)
    expect(container.querySelector('.notebook')).toBeNull()
    expect(container.querySelector('[data-embedded-screen="true"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Enrere' })).toBeInTheDocument()
    expect(screen.getByText('contingut')).toBeInTheDocument()
    expect(screen.getByText('dreta')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Joc' })).toHaveClass('sr-only')
  })
})
