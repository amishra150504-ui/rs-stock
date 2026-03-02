import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Login from '../components/Login'

const { getDocMock, docMock } = vi.hoisted(() => {
  return {
    getDocMock: vi.fn(),
    docMock: vi.fn(() => ({}))
  }
})

vi.mock('firebase/firestore', () => ({
  getDoc: getDocMock,
  doc: docMock
}))

vi.mock('../firebaseClient', () => ({
  db: {},
  firebaseReady: true
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('logs in with trimmed user id and valid password', async () => {
    const setCurrentUser = vi.fn()

    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'admin', name: 'Administrator', password: 'admin123' })
    })

    render(<Login setCurrentUser={setCurrentUser} />)

    fireEvent.change(screen.getByPlaceholderText('User ID'), { target: { value: '  admin  ' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(setCurrentUser).toHaveBeenCalledWith({
        id: 'admin',
        role: 'admin',
        name: 'Administrator'
      })
    })
  })

  it('shows invalid credentials when user does not exist', async () => {
    const setCurrentUser = vi.fn()

    getDocMock.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({})
    })

    render(<Login setCurrentUser={setCurrentUser} />)

    fireEvent.change(screen.getByPlaceholderText('User ID'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Invalid credentials')).toBeTruthy()
    expect(setCurrentUser).not.toHaveBeenCalled()
  })

  it('shows cloud connection error on firestore failure', async () => {
    const setCurrentUser = vi.fn()

    getDocMock.mockRejectedValueOnce(new Error('network'))

    render(<Login setCurrentUser={setCurrentUser} />)

    fireEvent.change(screen.getByPlaceholderText('User ID'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Unable to connect to cloud. Check setup/network.')).toBeTruthy()
    expect(setCurrentUser).not.toHaveBeenCalled()
  })
})
