import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { newFactState, type FactState } from '../../core/engine/leitner'
import { newSkillState } from '../../core/engine/mastery'
import { att, batch, NOW } from './analytics/testData'
import { buildProgressReport } from './analytics/report'
import { FactHeatmap } from './FactHeatmap'
import { SkillHeatmap } from './SkillHeatmap'
import { ActivitySection } from './ActivitySection'
import { EvolutionSection } from './EvolutionSection'

const fact: FactState = { ...newFactState('mul:7x8', 0), attempts: 6, correct: 5, box: 3, recentRts: [4200] }
const report = buildProgressReport(
  {
    skills: MATES_SKILLS,
    skillStates: { A1: { ...newSkillState('A1'), status: 'dominada', mastery: 0.9, attempts: 30, accuracy: 0.9, fluency: 0.5 } },
    factStates: { 'mul:7x8': fact },
    daysPlayed: [],
    attempts: [...batch(0, 12), ...batch(8, 12), att(NOW - 1000)],
  },
  NOW,
)

describe('FactHeatmap', () => {
  it('is a grid with one tab stop (roving tabindex) and arrow-key navigation', async () => {
    const user = userEvent.setup()
    render(<FactHeatmap report={report} />)
    const grid = screen.getByRole('grid', { name: 'Taula de multiplicar (1 a 10)' })
    const cells = within(grid).getAllByRole('gridcell')
    expect(cells).toHaveLength(100)
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1)
    cells[0]?.focus()
    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(cells[11]).toHaveFocus()
    expect(cells.filter((c) => c.tabIndex === 0)).toEqual([cells[11]])
    await user.keyboard('{End}')
    expect(cells[19]).toHaveFocus()
    await user.keyboard('{Control>}{End}{/Control}')
    expect(cells[99]).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(cells[99]).toHaveFocus()
  })

  it('names every cell and shows the detail of the focused one', async () => {
    const user = userEvent.setup()
    render(<FactHeatmap report={report} />)
    const grid = screen.getByRole('grid', { name: 'Taula de multiplicar (1 a 10)' })
    const cell = within(grid).getByRole('gridcell', { name: '7 × 8: 5 encerts de 6, caixa 3, 4,2 s' })
    expect(within(grid).getByRole('gridcell', { name: '2 × 2: encara no practicat' })).toBeInTheDocument()
    await user.click(cell)
    expect(screen.getByText('7 × 8: 5 encerts de 6, caixa 3, 4,2 s')).toBeInTheDocument()
  })

  it('shows a symbol, not only a colour, and unpractised cells stay empty', () => {
    render(<FactHeatmap report={report} />)
    const grid = screen.getByRole('grid', { name: 'Taula de multiplicar (1 a 10)' })
    const practised = within(grid).getByRole('gridcell', { name: /^7 × 8/ })
    expect(practised).toHaveTextContent('●')
    const empty = within(grid).getByRole('gridcell', { name: /^2 × 2/ })
    expect(empty).toHaveTextContent('')
    expect(empty.dataset.tone).toBe('buit')
  })

  it('switches the colour mode and the legend', async () => {
    const user = userEvent.setup()
    render(<FactHeatmap report={report} />)
    const grid = screen.getByRole('grid', { name: 'Taula de multiplicar (1 a 10)' })
    const cell = within(grid).getByRole('gridcell', { name: /^7 × 8/ })
    expect(cell.dataset.tone).toBe('alta')
    await user.click(screen.getByRole('button', { name: 'Caixa de repàs' }))
    expect(screen.getByRole('button', { name: 'Caixa de repàs' })).toHaveAttribute('aria-pressed', 'true')
    expect(cell.dataset.tone).toBe('caixa-3')
    expect(cell).toHaveTextContent('3')
    await user.click(screen.getByRole('button', { name: 'Fluïdesa' }))
    expect(cell.dataset.tone).toBe('fluent')
    expect(screen.getByText('Fluid: ràpid i segur')).toBeInTheDocument()
  })

  it('also renders the addition grid', () => {
    render(<FactHeatmap report={report} />)
    expect(screen.getByRole('grid', { name: 'Sumes (1 a 10)' })).toBeInTheDocument()
  })
})

describe('SkillHeatmap', () => {
  it('groups skills by grade with accessible names and a legend', () => {
    render(<SkillHeatmap report={report} />)
    for (const label of ['1r', '2n', '3r', '4t']) expect(screen.getByRole('group', { name: `Habilitats de ${label}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A1, Comptar fins a 20: dominada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^D9, .*: bloquejada$/ })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Llegenda' }).children).toHaveLength(5)
  })

  it('shows mastery, attempts, accuracy, fluency and CPA stage on tap and on focus', async () => {
    const user = userEvent.setup()
    render(<SkillHeatmap report={report} />)
    await user.click(screen.getByRole('button', { name: /^A1,/ }))
    const detail = screen.getByRole('status')
    expect(detail).toHaveTextContent('Domini 90 %')
    expect(detail).toHaveTextContent('30 intents')
    expect(detail).toHaveTextContent('etapa concret')
    act(() => screen.getByRole('button', { name: /^A2,/ }).focus())
    expect(detail).toHaveTextContent('Encara no s’hi ha jugat')
  })
})

describe('charts', () => {
  it('offers the activity chart as an image with text and a table', () => {
    render(<ActivitySection report={report} />)
    const img = screen.getByRole('img', { name: /Minuts jugats per dia/ })
    expect(img).toBeInTheDocument()
    expect(screen.getByRole('table', { hidden: true, name: 'Minuts i respostes per dia' })).toBeInTheDocument()
  })

  it('says "poques dades" when a week has fewer than 10 attempts', () => {
    const sparse = buildProgressReport({ skills: MATES_SKILLS, skillStates: {}, factStates: {}, daysPlayed: [], attempts: batch(1, 4) }, NOW)
    render(<EvolutionSection report={sparse} />)
    expect(screen.getAllByText('poques dades').length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: /Encerts per setmana.*poques dades/ })).toBeInTheDocument()
  })

  it('draws a line when there is enough data', () => {
    render(<EvolutionSection report={report} />)
    expect(screen.getByRole('img', { name: /Encerts per setmana.*100 %/ })).toBeInTheDocument()
  })
})
