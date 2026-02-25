import React, { useState, useEffect } from 'react'

export default function Login({ setCurrentUser }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    setError('')

    if (!id || !password) {
      setError('Please enter ID and Password')
      return
    }

    const saved = localStorage.getItem('rs_users')
    const users = saved ? JSON.parse(saved) : []

    const found = users.find(
      u => u.id === id && u.password === password
    )

    if (!found) {
      setError('Invalid credentials')
      return
    }

    setCurrentUser({
      id: found.id,
      role: found.role,
      name: found.name
    })
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
            onChange={e => setId(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} type="submit">
          Sign In
        </button>
      </form>
    </div>
  )
}

const styles = {
  wrapper: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f5f7fb', // clean minimal background
    fontFamily: 'Segoe UI, sans-serif'
  },
  card: {
    width: 380,
    padding: 40,
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
  input: {
    padding: 14,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
    background: '#ffffff',
    transition: 'all 0.3s ease'
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
    transition: 'all 0.3s ease'
  },
}