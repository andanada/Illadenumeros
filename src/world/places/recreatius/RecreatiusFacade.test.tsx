import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecreatiusFacade } from './RecreatiusFacade'

describe('the arcade façade on the street', () => {
  it('is a decorative drawing that fills its box, open or closed', () => {
    const { container, rerender } = render(<RecreatiusFacade open />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveClass('h-full', 'w-full')
    expect(container.textContent).toContain('RECREATIUS')
    rerender(<RecreatiusFacade open={false} />)
    expect(container.querySelector('svg')).toHaveAttribute('data-open', 'false')
  })
})
