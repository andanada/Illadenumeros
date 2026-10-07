import { render, screen } from '@testing-library/react'
import type { VisualModel } from '../../core/ambit/types'
import { VisualModelView } from './VisualModelView'

const CASES: [string, VisualModel, RegExp][] = [
  ['array', { kind: 'array', rows: 3, cols: 4 }, /3 files de 4 magdalenes, 12 en total/],
  ['share', { kind: 'share', total: 14, groups: 4 }, /3 a cada plat i en sobren 2/],
  ['fraction pizza', { kind: 'fraction', parts: 4, selected: 3 }, /4 parts iguals, amb 3 pintades/],
  ['fraction collection', { kind: 'fraction', parts: 4, selected: 3, collection: 12 }, /en pintem 9/],
  ['money', { kind: 'money', coins: [200, 50, 20] }, /Total: 2,70 €/],
]

describe('new visual views', () => {
  it.each(CASES)('renders %s with an accessible name', (_name, model, name) => {
    render(<VisualModelView model={model} animate={false} />)
    expect(screen.getByRole('img', { name })).toBeInTheDocument()
  })
  it('keeps big arrays honest (23 x 4) with compact counters', () => {
    render(<VisualModelView model={{ kind: 'array', rows: 23, cols: 4 }} animate={false} />)
    expect(screen.getByRole('img', { name: '23 files de 4 fitxes, 92 en total' })).toBeInTheDocument()
  })
  it('renders extreme values without crashing', () => {
    render(<VisualModelView model={{ kind: 'array', rows: 0, cols: 99 }} animate={false} />)
    render(<VisualModelView model={{ kind: 'share', total: 3, groups: 0 }} animate={false} />)
    render(<VisualModelView model={{ kind: 'money', coins: [] }} animate={false} />)
    expect(screen.getByRole('img', { name: 'Cap moneda' })).toBeInTheDocument()
  })
})
