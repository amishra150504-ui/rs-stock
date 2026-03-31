import React, { useMemo, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const toDateKey = (value) => {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

const addDays = (key, days) => {
  const base = new Date(`${key}T00:00:00`)
  base.setDate(base.getDate() + days)
  return toDateKey(base)
}

const addMonths = (key, months) => {
  const base = new Date(`${key}T00:00:00`)
  base.setMonth(base.getMonth() + months)
  return toDateKey(base)
}

const sameEntry = (a, b) => {
  if (!a || !b) return false
  return (
    (a.item || '') === (b.item || '') &&
    Number(a.kg || 0) === Number(b.kg || 0) &&
    Number(a.pcs || 0) === Number(b.pcs || 0) &&
    (a.date || '') === (b.date || '') &&
    (a.purchasedFrom || '') === (b.purchasedFrom || '') &&
    (a.remark || '') === (b.remark || '')
  )
}

const findEntryIndex = (list, target) => {
  if (!target) return -1
  if (target.id !== undefined && target.id !== null) {
    const byId = list.findIndex((e) => e.id === target.id)
    if (byId >= 0) return byId
  }
  return list.findIndex((e) => sameEntry(e, target))
}

const removeEntryByIdOrMatch = (list, target) => {
  if (!target) return list
  if (target.id !== undefined && target.id !== null) {
    const hasId = list.some((e) => e.id === target.id)
    if (hasId) return list.filter((e) => e.id !== target.id)
  }
  const idx = list.findIndex((e) => sameEntry(e, target))
  if (idx < 0) return list
  return list.filter((_, i) => i !== idx)
}

export default function LaxmiItemReport({
  entries = [],
  items = [],
  setEntries,
  setDailyEntries,
  currentUser
}) {
  const [range, setRange] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [editingEntry, setEditingEntry] = useState(null)
  const [draftEntry, setDraftEntry] = useState({})

  const todayKey = toDateKey(new Date())

  const dateRange = useMemo(() => {
    if (range === 'all' || !todayKey) return { start: null, end: null }
    if (range === 'today') return { start: todayKey, end: todayKey }
    if (range === 'yesterday') {
      const y = addDays(todayKey, -1)
      return { start: y, end: y }
    }
    if (range === 'month') {
      const base = new Date(`${todayKey}T00:00:00`)
      const start = toDateKey(new Date(base.getFullYear(), base.getMonth(), 1))
      return { start, end: todayKey }
    }
    if (range === 'six_month') {
      return { start: addMonths(todayKey, -6), end: todayKey }
    }
    if (range === 'annual') {
      return { start: addMonths(todayKey, -12), end: todayKey }
    }
    if (range === 'custom') {
      const start = customStart || todayKey
      const end = customEnd || todayKey
      return { start, end }
    }
    return { start: null, end: null }
  }, [range, customStart, customEnd, todayKey])

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const key = toDateKey(e?.date)
      if (!key) return false
      if (!dateRange.start || !dateRange.end) return true
      return key >= dateRange.start && key <= dateRange.end
    })
  }, [entries, dateRange.start, dateRange.end])

  const rows = useMemo(() => {
    const categoryByItem = new Map(items.map((i) => [i.name, i.category || '']))
    return filteredEntries.map((e, originalIndex) => ({
      ...e,
      originalIndex,
      category: categoryByItem.get(e?.item) || ''
    }))
  }, [filteredEntries, items])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [items])

  const filteredRows = useMemo(() => {
    if (categoryFilter === 'all') return rows
    return rows.filter((row) => String(row.category || '') === categoryFilter)
  }, [rows, categoryFilter])

  const isStaff = String(currentUser?.role || '').toLowerCase() === 'staff'

  const startEditEntry = (entry, originalIndex) => {
    if (isStaff) return
    setEditingEntry(originalIndex)
    setDraftEntry({ ...entry })
  }

  const cancelEditEntry = () => {
    setEditingEntry(null)
    setDraftEntry({})
  }

  const saveEditEntry = (entryRef) => {
    const updated = {
      ...entryRef,
      ...draftEntry,
      kg: Number(draftEntry.kg || 0),
      pcs: Number(draftEntry.pcs || 0)
    }

    if (setEntries) {
      setEntries((prev) => {
        const idx = findEntryIndex(prev, entryRef)
        if (idx < 0) return prev
        const clone = [...prev]
        clone[idx] = { ...clone[idx], ...updated }
        return clone
      })
    }

    if (setDailyEntries) {
      setDailyEntries((prev) => {
        const idx = findEntryIndex(prev, entryRef)
        if (idx < 0) return prev
        const clone = [...prev]
        clone[idx] = { ...clone[idx], ...updated }
        return clone
      })
    }

    cancelEditEntry()
  }

  const deleteEntry = (entryRef) => {
    if (isStaff) return alert('Staff cannot delete entries')
    if (!window.confirm('Delete this entry?')) return
    if (setEntries) {
      setEntries((prev) => removeEntryByIdOrMatch(prev, entryRef))
    }
    if (setDailyEntries) {
      setDailyEntries((prev) => removeEntryByIdOrMatch(prev, entryRef))
    }
  }

  const exportReport = async (format) => {
    const el = document.getElementById('laxmi-item-report-export')
    if (!el) return

    const originalBg = el.style.backgroundColor
    const filters = el.querySelectorAll('.no-export')
    filters.forEach((f) => (f.style.display = 'none'))
    el.style.backgroundColor = '#ffffff'

    const rows = el.querySelectorAll('tr')
    rows.forEach((row) => (row.style.backgroundColor = '#ffffff'))
    const cells = el.querySelectorAll('td')
    cells.forEach((cell) => {
      cell.style.color = '#000000'
      cell.style.fontWeight = '600'
    })

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    filters.forEach((f) => (f.style.display = ''))
    el.style.backgroundColor = originalBg
    rows.forEach((row) => (row.style.backgroundColor = ''))
    cells.forEach((cell) => {
      cell.style.color = ''
      cell.style.fontWeight = ''
    })

    if (format === 'png') {
      const link = document.createElement('a')
      link.download = `item-wise-report-${new Date().toLocaleDateString().replace(/\//g, '_')}.png`
      link.href = canvas.toDataURL('image/png', 0.9)
      link.click()
      return
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const imgWidth = 190
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 20, imgWidth, imgHeight)
    pdf.save(`item-wise-report-${new Date().toLocaleDateString().replace(/\//g, '_')}.pdf`)
  }

  return (
    <section className="page">
      <div className="party-menu-hero">
        <div>
          <h1>Item Wise Report</h1>
          <p>Purchase party wise item quantity with date filters.</p>
        </div>
      </div>

      <div className="dashboard-toolbar">
        <div className="dashboard-filter">
          <div className="dashboard-filter-title">Date Filter</div>
          <div className="dashboard-filter-row">
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="month">Monthly</option>
              <option value="six_month">6 Month</option>
              <option value="annual">Annual</option>
              <option value="custom">Custom</option>
            </select>
            {range === 'custom' && (
              <>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </>
            )}
          </div>
          <div className="dashboard-filter-foot">
            {dateRange.start && dateRange.end ? `${dateRange.start} to ${dateRange.end}` : 'All dates'}
          </div>
        </div>
        <div className="dashboard-filter">
          <div className="dashboard-filter-title">Category Filter</div>
          <div className="dashboard-filter-row">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="dashboard-filter-foot">
            {categoryFilter === 'all' ? 'All categories' : categoryFilter}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => exportReport('png')}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
        >
          Export PNG
        </button>
        <button
          onClick={() => exportReport('pdf')}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
        >
          Export PDF
        </button>
      </div>

      <div id="laxmi-item-report-export">
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th>Purchase Party</th>
                <th>Category</th>
                <th>Item</th>
                <th style={{ textAlign: 'center' }}>Date</th>
                <th style={{ textAlign: 'center' }}>KG</th>
                <th style={{ textAlign: 'center' }}>PCS</th>
                <th>Remark</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={`${row.party}-${row.item}-${row.remark}-${row.date}-${idx}`} className="row-anim">
                  <td>
                    {editingEntry === row.originalIndex ? (
                      <input
                        value={draftEntry.purchasedFrom || ''}
                        onChange={(e) => setDraftEntry({ ...draftEntry, purchasedFrom: e.target.value })}
                      />
                    ) : (
                      row.purchasedFrom || '—'
                    )}
                  </td>
                  <td>{row.category || '—'}</td>
                  <td>
                    {editingEntry === row.originalIndex ? (
                      <input
                        value={draftEntry.item || ''}
                        onChange={(e) => setDraftEntry({ ...draftEntry, item: e.target.value })}
                      />
                    ) : (
                      row.item || '—'
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingEntry === row.originalIndex ? (
                      <input
                        type="date"
                        value={draftEntry.date || ''}
                        onChange={(e) => setDraftEntry({ ...draftEntry, date: e.target.value })}
                      />
                    ) : (
                      row.date || '—'
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingEntry === row.originalIndex ? (
                      <input
                        type="number"
                        value={draftEntry.kg || ''}
                        onChange={(e) => setDraftEntry({ ...draftEntry, kg: e.target.value })}
                      />
                    ) : (
                      Number(row.kg || 0).toFixed(3)
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingEntry === row.originalIndex ? (
                      <input
                        type="number"
                        value={draftEntry.pcs || ''}
                        onChange={(e) => setDraftEntry({ ...draftEntry, pcs: e.target.value })}
                      />
                    ) : (
                      Math.round(Number(row.pcs || 0))
                    )}
                  </td>
                  <td>
                    {editingEntry === row.originalIndex ? (
                      <input
                        value={draftEntry.remark || ''}
                        onChange={(e) => setDraftEntry({ ...draftEntry, remark: e.target.value })}
                      />
                    ) : (
                      row.remark || '—'
                    )}
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {isStaff ? (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>View only</span>
                    ) : editingEntry === row.originalIndex ? (
                      <>
                        <button
                          onClick={() => saveEditEntry(row)}
                          style={{
                            background:'#16a34a',
                            color:'#fff',
                            border:'none',
                            padding:'6px 12px',
                            borderRadius:4,
                            cursor:'pointer',
                            fontSize:'12px',
                            marginRight:'8px'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditEntry}
                          style={{
                            background:'#9ca3af',
                            color:'#fff',
                            border:'none',
                            padding:'6px 12px',
                            borderRadius:4,
                            cursor:'pointer',
                            fontSize:'12px'
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditEntry(row, row.originalIndex)}
                          style={{
                            background:'#3b82f6',
                            color:'#fff',
                            border:'none',
                            padding:'6px 12px',
                            borderRadius:4,
                            cursor:'pointer',
                            fontSize:'12px',
                            marginRight:'8px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEntry(row)}
                          style={{
                            background:'#ef4444',
                            color:'#fff',
                            border:'none',
                            padding:'6px 12px',
                            borderRadius:4,
                            cursor:'pointer',
                            fontSize:'12px'
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8' }}>
                    No entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
