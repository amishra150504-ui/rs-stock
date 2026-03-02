import React, { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, firebaseReady } from '../firebaseClient'

export default function Login({ setCurrentUser }) {
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

    if (!firebaseReady) {
      setError('Firebase is not configured.')
      return
    }

    setSubmitting(true)

    try {
      const snapshot = await getDoc(doc(db, 'users', userId))

      if (!snapshot.exists()) {
        setError('Invalid credentials')
        return
      }

      const user = snapshot.data()
      if ((user?.password || '') !== userPassword) {
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
      setError('Unable to connect to cloud. Check setup/network.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <form
        onSubmit={submit}
        style={{
          ...styles.card,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.95)'
        }}
      >
        <h2 style={styles.heading}>RS Traders</h2>
        <p style={styles.subHeading}>Stock Management Login</p>

        <div style={styles.inputGroup}>
          <input
            style={styles.input}
            placeholder="User ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />

          <div style={styles.passwordWrap}>
            <input
              style={styles.input}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              style={styles.iconButton}
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

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} type="submit" disabled={submitting}>
          {submitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100dvh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f5f7fb',
    fontFamily: 'Segoe UI, sans-serif',
    padding: '16px'
  },
  card: {
    width: 'min(380px, 94vw)',
    padding: 28,
    borderRadius: 22,
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(12px)',
    position: 'relative',
    transition: 'all 0.4s ease',
    transformStyle: 'preserve-3d'
  },
  heading: {
    margin: 0,
    fontSize: 26,
    fontWeight: 600,
    background: 'linear-gradient(90deg,#2563eb,#7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subHeading: {
    marginTop: 6,
    marginBottom: 30,
    fontSize: 14,
    color: '#6b7280'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18
  },
  passwordWrap: {
    position: 'relative'
  },
  input: {
    padding: 14,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    background: '#ffffff',
    transition: 'all 0.3s ease',
    width: '100%'
  },
  iconButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  error: {
    marginTop: 12,
    color: '#ef4444',
    fontSize: 13
  },
  button: {
    marginTop: 25,
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%'
  }
}
