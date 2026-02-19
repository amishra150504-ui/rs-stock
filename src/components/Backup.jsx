import React from 'react'

export default function Backup({ items, entries, setItems, setEntries }) {
  const exportBackup = () => {
    const data = { items, entries, date: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `rs-stock-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url)
  }
  const importBackup = (e) => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => {
      try { const d = JSON.parse(ev.target.result); if (d.items && d.entries) { setItems(d.items); setEntries(d.entries); alert('Restored') } else alert('Invalid') } catch { alert('Invalid') }
    }; r.readAsText(f)
  }

  return (
    <section className="page">
      <h1>Backup</h1>
      <div className="actions"><button onClick={exportBackup}>Export</button> <input type="file" accept="application/json" onChange={importBackup} /></div>
    </section>
  )
}
