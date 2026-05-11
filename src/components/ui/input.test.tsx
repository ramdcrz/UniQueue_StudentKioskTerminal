import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Input } from './input'

describe('Input component', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Enter text here" />)
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument()
  })

  it('passes additional props to the input element', () => {
    render(<Input type="email" id="email-input" data-testid="test-input" />)
    const input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('id', 'email-input')
  })

  it('applies custom classNames', () => {
    render(<Input className="custom-input-class" data-testid="custom-input" />)
    expect(screen.getByTestId('custom-input')).toHaveClass('custom-input-class')
  })
})
