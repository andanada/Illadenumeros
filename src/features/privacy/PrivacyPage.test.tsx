import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PRIVACY_CONTACT_PLACEHOLDER } from './contact'
import PrivacyPage from './PrivacyPage'

function renderPage(contactEmail?: string) {
  return render(
    <MemoryRouter initialEntries={['/privacitat']}>
      <Routes>
        <Route path="/privacitat" element={<PrivacyPage contactEmail={contactEmail} />} />
        <Route path="/" element={<p>Inici</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PrivacyPage (/privacitat)', () => {
  it('has one h1 and every block is a named region with its own h2', () => {
    renderPage()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const h2 = screen.getAllByRole('heading', { level: 2 })
    expect(h2.length).toBe(7)
    for (const heading of h2) {
      expect(screen.getByRole('region', { name: heading.textContent ?? '' })).toBeInTheDocument()
    }
  })

  it('has no skipped heading level', () => {
    renderPage()
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName.slice(1)))
    levels.reduce((prev, level) => {
      expect(level - prev).toBeLessThanOrEqual(1)
      return level
    }, 0)
  })

  it('explains what is stored, with and without a family account', () => {
    renderPage()
    const stored = screen.getByRole('region', { name: 'Quines dades es guarden' })
    expect(stored).toHaveTextContent(/nom de pila/i)
    expect(stored).toHaveTextContent(/personatge/i)
    expect(stored).toHaveTextContent(/progrés/i)
    expect(stored).toHaveTextContent(/correu electrònic/i)
    expect(stored).toHaveTextContent(/argon2id/i)
    expect(stored).toHaveTextContent(/galeta de sessió/i)
  })

  it('states there are no analytics, ads, third parties or external requests', () => {
    renderPage()
    const none = screen.getByRole('region', { name: 'Què no fem' })
    for (const word of [/analítiques/i, /publicitat/i, /tercers/i, /peticions externes/i]) expect(none).toHaveTextContent(word)
  })

  it('documents export and deletion with the real endpoint and the in-app buttons', () => {
    renderPage()
    const rights = screen.getByRole('region', { name: 'Exportar i esborrar les dades' })
    expect(rights).toHaveTextContent('/api/account/export')
    expect(rights).toHaveTextContent('Esborra el compte')
    expect(rights).toHaveTextContent('Esborra tot el progrés')
    expect(rights).toHaveTextContent('Per a la família')
  })

  it('covers retention, children, security and the EU server', () => {
    renderPage()
    expect(screen.getByRole('region', { name: 'Quant de temps es guarden' })).toHaveTextContent(/30 dies/)
    expect(screen.getByRole('region', { name: 'Les dades dels infants' })).toHaveTextContent(/pare, la mare o tutor/i)
    expect(screen.getByRole('region', { name: 'Com es protegeixen' })).toHaveTextContent(/HTTPS/)
    expect(screen.getByRole('region', { name: 'Quines dades es guarden' })).toHaveTextContent(/Unió Europea/)
  })

  it('shows the visible notice and a mailto link while the contact is the placeholder', () => {
    renderPage()
    expect(screen.getByRole('note')).toHaveTextContent(/adreça de contacte encara no està configurada/i)
    const link = screen.getByRole('link', { name: PRIVACY_CONTACT_PLACEHOLDER })
    expect(link).toHaveAttribute('href', `mailto:${PRIVACY_CONTACT_PLACEHOLDER}`)
  })

  it('hides the notice once a real address is configured', () => {
    renderPage('families@laweb.cat')
    expect(screen.queryByRole('note')).toBeNull()
    const contact = screen.getByRole('region', { name: 'Com contactar-nos' })
    expect(within(contact).getByRole('link', { name: 'families@laweb.cat' })).toHaveAttribute('href', 'mailto:families@laweb.cat')
  })

  it('has a labelled back button and no empty links or buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Enrere' })).toBeInTheDocument()
    for (const el of [...screen.getAllByRole('link'), ...screen.getAllByRole('button')]) {
      expect(el).toHaveAccessibleName()
    }
  })
})
