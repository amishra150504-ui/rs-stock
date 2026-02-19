import React, { useState } from 'react'

export default function Login({ setCurrentUser }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const saved = localStorage.getItem('rs_users')
    const users = saved ? JSON.parse(saved) : []
    const found = users.find(u => u.id === id && u.password === password)
    if (!found) { setError('Invalid credentials'); return }
    setCurrentUser({ id: found.id, role: found.role, name: found.name })
  }

  return (
    <div style={{background:'#fff',padding:20,borderRadius:10,boxShadow:'0 10px 30px rgba(0,0,0,0.08)'}}>
      <h2 style={{marginTop:0}}>Sign In</h2>
      <div style={{display:'grid',gap:8}}>
        <input placeholder="User ID" value={id} onChange={e=>setId(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div style={{color:'#ef4444'}}>{error}</div>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={submit}>Sign In</button>
        </div>
      </div>
    </div>
  )
}
