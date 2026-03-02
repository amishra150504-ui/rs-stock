import React, { useMemo, useState } from 'react'

export default function Backup({
  items,
  entries,
  dailyEntries,
  categories,
  entryCounter,
  users,
  setItems,
  setEntries,
  setDailyEntries,
  setCategories,
  setEntryCounter,
  setUsers
}) {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [status, setStatus] = useState('')

  const stats = useMemo(
    () => [
      { label: 'Items', value: items.length },
      { label: 'Entries', value: entries.length },
      { label: 'Daily', value: dailyEntries.length },
      { label: 'Users', value: users.length }
    ],
    [items.length, entries.length, dailyEntries.length, users.length]
  )

  const exportBackup = () => {
    const data = {
      items,
      entries,
      dailyEntries,
      categories,
      entryCounter,
      users,
      date: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rs-stock-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Backup exported successfully.')
  }

  const importBackup = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setSelectedFileName(f.name)
    const r = new FileReader()
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result)
        if (!Array.isArray(d.items) || !Array.isArray(d.entries)) {
          alert('Invalid backup file')
          return
        }

        if (!window.confirm('Restore backup and overwrite current cloud data?')) return

        setItems(d.items)
        setEntries(d.entries)

        if (Array.isArray(d.dailyEntries)) setDailyEntries(d.dailyEntries)
        if (Array.isArray(d.categories)) setCategories(d.categories)
        if (Number.isFinite(Number(d.entryCounter))) setEntryCounter(Number(d.entryCounter))
        if (Array.isArray(d.users)) setUsers(d.users)

        setStatus('Backup restored and synced to cloud.')
        alert('Backup restored and synced to cloud')
      } catch {
        setStatus('Invalid backup file.')
        alert('Invalid backup file')
      }
    }
    r.readAsText(f)
  }

  return (
    <section className="page backup-page">
      <div className="backup-hero">
        <div>
          <h1>Backup Center</h1>
          <p>Export everything to JSON, or restore a previous snapshot in one click.</p>
        </div>
        <div className="backup-pulse" aria-hidden="true" />
      </div>

      <div className="backup-stats">
        {stats.map((s) => (
          <div key={s.label} className="backup-stat-card">
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="backup-panel">
        <div className="backup-actions">
          <button onClick={exportBackup} className="backup-export-btn">
            Export Full Backup
          </button>

          <label className="backup-file-label">
            <input
              type="file"
              accept="application/json"
              onChange={importBackup}
              className="backup-file-input"
            />
            <span>Import Backup File</span>
          </label>
        </div>

        <div className="backup-meta">
          <div>Selected File: {selectedFileName || 'None'}</div>
          <div>Last Backup Time: {new Date().toLocaleString()}</div>
        </div>

        {status && <div className="backup-status">{status}</div>}
      </div>
    </section>
  )
}
