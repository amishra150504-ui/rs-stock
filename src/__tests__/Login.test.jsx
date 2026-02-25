import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Login from '../components/Login'

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('logs in with trimmed user id and valid password', () => {
    const setCurrentUser = vi.fn()
    localStorage.setItem('rs_users', JSON.stringify([
      { id: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' }
    ]))

    render(<Login setCurrentUser={setCurrentUser} />)

    fireEvent.change(screen.getByPlaceholderText('User ID'), { target: { value: '  admin  ' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(setCurrentUser).toHaveBeenCalledWith({ id: 'admin', role: 'admin', name: 'Administrator' })
  })

  it('shows invalid credentials when authentication fails', () => {
    const setCurrentUser = vi.fn()
    localStorage.setItem('rs_users', JSON.stringify([
      { id: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' }
    ]))

    render(<Login setCurrentUser={setCurrentUser} />)

    fireEvent.change(screen.getByPlaceholderText('User ID'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(screen.getByText('Invalid credentials')).toBeTruthy()
    expect(setCurrentUser).not.toHaveBeenCalled()
  })

  it('accepts Enter key to submit', () => {
    const setCurrentUser = vi.fn()
    localStorage.setItem('rs_users', JSON.stringify([
      { id: 'staff1', password: 'staff123', role: 'staff', name: 'Staff One' }
    ]))

    render(<Login setCurrentUser={setCurrentUser} />)

    fireEvent.change(screen.getByPlaceholderText('User ID'), { target: { value: 'staff1' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'staff123' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Password'), { key: 'Enter', code: 'Enter' })

    expect(setCurrentUser).toHaveBeenCalledWith({ id: 'staff1', role: 'staff', name: 'Staff One' })
  })

  it('shows a storage error if user data is malformed', () => {
    const setCurrentUser = vi.fn()
    localStorage.setItem('rs_users', '{bad json')

    render(<Login setCurrentUser={setCurrentUser} />)

    fireEvent.change(screen.getByPlaceholderText('User ID'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(screen.getByText('Unable to read user data. Please reset users.')).toBeTruthy()
    expect(setCurrentUser).not.toHaveBeenCalled()
  })
})
