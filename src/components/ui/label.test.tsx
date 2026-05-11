import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Label } from './label'

describe('Label component', () => {
  it('renders correctly', () => {
    render(<Label htmlFor="test-input">Test Label</Label>)
    const label = screen.getByText('Test Label')
    expect(label).toBeInTheDocument()
    expect(label).toHaveAttribute('for', 'test-input')
  })

  it('applies custom classNames', () => {
    render(<Label className="custom-label-class">Custom Label</Label>)
    expect(screen.getByText('Custom Label')).toHaveClass('custom-label-class')
  })
})
