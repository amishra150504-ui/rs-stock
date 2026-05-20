import React, { useState } from 'react'

const iconForName = (name) => {
  const clean = name.trim()
  if (!clean) return 'CO'
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function DistributorCompanyMaster({ title, description, records, setRecords, currentUser }) {
  const [companyName, setCompanyName] = useState('')
  const [startingDate, setStartingDate] = useState('')
  const [editingId, setEditingId] = useState(null)

  const isStaff = currentUser?.role === 'staff'

  const reset = () => {
    setCompanyName('')
    setStartingDate('')
    setEditingId(null)
  }

  const save = () => {
    const name = companyName.trim()
    if (!name) return alert('Enter company name')
    if (!startingDate) return alert('Select starting date')

    const duplicate = records.some((record) => (
      record.name.toLowerCase() === name.toLowerCase() && record.id !== editingId
    ))
    if (duplicate) return alert('Company already exists')

    if (editingId) {
      setRecords((prev) => prev.map((record) => (
        record.id === editingId
          ? { ...record, name, startingDate, icon: iconForName(name) }
          : record
      )))
    } else {
      setRecords((prev) => [
        ...prev,
        {
          id: `company-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name,
          startingDate,
          icon: iconForName(name)
        }
      ])
    }

    reset()
  }

  const edit = (record) => {
    if (isStaff) return
    setCompanyName(record.name)
    setStartingDate(record.startingDate)
    setEditingId(record.id)
  }

  const remove = (id) => {
    if (isStaff) return alert('Staff cannot delete records')
    if (!confirm('Delete this record?')) return
    setRecords((prev) => prev.filter((record) => record.id !== id))
    if (editingId === id) reset()
  }

  return (
    <section className="page">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Company</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="company-master-layout">
        <div className="company-master-form">
          <h2>{editingId ? 'Edit Record' : 'Add New Record'}</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Company Name</label>
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="form-group">
              <label>Starting Date</label>
              <input
                type="date"
                value={startingDate}
                onChange={(event) => setStartingDate(event.target.value)}
              />
            </div>
          </div>
          <div className="actions">
            <button onClick={save} disabled={isStaff}>
              {editingId ? 'Save Changes' : '+ Add Company'}
            </button>
            {editingId && <button className="secondary-btn" onClick={reset}>Cancel</button>}
          </div>
        </div>

        <div className="company-card-grid">
          {records.length === 0 ? (
            <div className="empty-state">
              <strong>No records yet</strong>
              <span>Add the first company to show it here.</span>
            </div>
          ) : records.map((record) => (
            <article className="company-record-card" key={record.id}>
              <div className="company-record-icon">{record.icon || iconForName(record.name)}</div>
              <div>
                <h3>{record.name}</h3>
                <p>Starting Date: {record.startingDate}</p>
              </div>
              <div className="company-record-actions">
                <button onClick={() => edit(record)} disabled={isStaff}>Edit</button>
                <button className="danger-btn" onClick={() => remove(record.id)} disabled={isStaff}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
