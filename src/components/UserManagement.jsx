import React, { useState, useEffect } from 'react'

export default function UserManagement() {
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('rs_users')
    return saved ? JSON.parse(saved) : []
  })
  const [editingIndex, setEditingIndex] = useState(null)
  const [form, setForm] = useState({
    id: '',
    password: '',
    role: 'staff',
    name: '',
    gender: '',
    phone: '',
    email: '',
    address: ''
  })
  const [filter, setFilter] = useState('')

  useEffect(() => {
    localStorage.setItem('rs_users', JSON.stringify(users))
  }, [users])

  const startAdd = () => {
    setEditingIndex(-1)
    setForm({ id: '', password: '', role: 'staff', name: '', gender: '', phone: '', email: '', address: '' })
  }
  const startEdit = (i) => { setEditingIndex(i); setForm({ ...users[i] }) }
  const cancel = () => { setEditingIndex(null); setForm({ id: '', password: '', role: 'staff', name: '', gender: '', phone: '', email: '', address: '' }) }

  const save = () => {
    if (!form.id || !form.name) return alert('Enter ID and Name')
    setUsers(prev => {
      const dupe = prev.find((u, idx) => u.id === form.id && idx !== editingIndex)
      if (dupe) { alert('ID exists'); return prev }
      if (editingIndex === -1) return [...prev, form]
      const clone = [...prev]; clone[editingIndex] = form; return clone
    })
    cancel()
  }

  const remove = (i) => { if (!confirm('Delete user?')) return; setUsers(prev => prev.filter((_, idx) => idx !== i)) }

  return (
    <section className="page">
      <h1>User Management</h1>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
        <button onClick={startAdd} style={{background:'#2563eb',color:'#fff',border:'none',padding:'10px 16px',borderRadius:8,cursor:'pointer',fontWeight:600}}>+ Add User</button>
        <input placeholder="Search users" value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #e6eef6',flex:1,minWidth:200}} />
      </div>

      {editingIndex !== null && (
        <div className="edit-modal" style={{background:'#fff',padding:20,borderRadius:12,boxShadow:'0 12px 30px rgba(0,0,0,0.08)',marginBottom:20,animation:'slideDown .3s ease',borderLeft:'4px solid #2563eb'}}>
          <h2 style={{marginTop:0,marginBottom:16}}>{editingIndex === -1 ? 'Add New User' : 'Edit User'}</h2>
          <div className="form-grid" style={{gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            <div className="form-group">
              <label>User ID</label>
              <input placeholder="e.g., staff1" value={form.id} onChange={e=>setForm(f=>({...f,id:e.target.value}))} disabled={editingIndex !== -1} style={{opacity:editingIndex !== -1 ? 0.6 : 1}} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input placeholder="Enter password" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input placeholder="Enter full name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input placeholder="Phone number" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input placeholder="Email address" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input placeholder="Address" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} />
            </div>
          </div>
          <div style={{marginTop:16,display:'flex',gap:8}}>
            <button onClick={save} style={{background:'#16a34a',color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,cursor:'pointer',fontWeight:600}}>Save User</button>
            <button onClick={cancel} style={{background:'#e5e7eb',color:'#374151',border:'none',padding:'10px 20px',borderRadius:8,cursor:'pointer',fontWeight:600}}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="sheet">
          <thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.filter(u=> u.id.includes(filter) || u.name.toLowerCase().includes(filter.toLowerCase())).map((u,i)=> (
              <tr key={u.id} className="row-anim" style={{animation:'fadeIn .25s ease'}}>
                <td><strong>{u.id}</strong></td>
                <td>{u.name}</td>
                <td>{u.phone || '—'}</td>
                <td><span style={{background:u.role==='admin'?'#fee2e2':'#e0f2fe',color:u.role==='admin'?'#dc2626':'#0369a1',padding:'4px 10px',borderRadius:6,fontSize:'13px',fontWeight:600}}>{u.role}</span></td>
                <td style={{display:'flex',gap:6}}>
                  <button onClick={()=>startEdit(i)} style={{background:'#3b82f6',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:'13px'}}>Edit</button>
                  <button onClick={()=>remove(i)} style={{background:'#ef4444',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:'13px'}}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
