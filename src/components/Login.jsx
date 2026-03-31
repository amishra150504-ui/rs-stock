import React, { useState, useEffect } from 'react'

export default function Login({ setCurrentUser, users = [] }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const userId = id.trim()
    const userPassword = password

    if (!userId || !userPassword) {
      setError('Please enter ID and Password')
      return
    }

    setSubmitting(true)

    try {
      const user = users.find((u) => String(u.id || '').trim() === userId)
      if (!user || (user?.password || '') !== userPassword) {
        setError('Invalid credentials')
        return
      }

      setCurrentUser({
        id: userId,
        role: user.role,
        name: user.name
      })
    } catch (err) {
      console.error('Login error:', err)
      setError('Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-bg login-bg-1" aria-hidden="true" />
      <div className="login-bg login-bg-2" aria-hidden="true" />
      <div className="login-bg login-bg-3" aria-hidden="true" />
      <form
        onSubmit={submit}
        className={`login-card ${mounted ? 'is-mounted' : ''}`}
      >
        <h2 className="login-heading">
          <img
            src="/rs-logo.png"
            alt="RS Logo"
            className="login-logo"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <span>RS Traders</span>
        </h2>
        <p className="login-subheading">Stock Management Login</p>

        <div className="login-input-group">
          <input
            className="login-input"
            placeholder="User ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />

          <div className="login-password-wrap">
            <input
              className="login-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="login-icon-button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.92-2.18 2.5-4.1 4.5-5.5" />
                  <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a11.72 11.72 0 0 1-1.67 2.68" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <path d="M1 1l22 22" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="login-button" type="submit" disabled={submitting}>
          {submitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
