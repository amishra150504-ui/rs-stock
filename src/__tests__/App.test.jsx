import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import React from 'react'

describe('App basic render', () => {
  it('renders app title', () => {
    render(<App />)
    expect(screen.getByText(/RS Stock/i)).toBeTruthy()
  })
})
