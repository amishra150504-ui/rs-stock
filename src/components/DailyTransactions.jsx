import React, { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const normalizeType = (value) => (value || '').toLowerCase().replace(/\s+/g, ' ').trim()

const sameEntry = (a, b) => {
  if (!a || !b) return false
  return (
    (a.item || '') === (b.item || '') &&
    normalizeType(a.type) === normalizeType(b.type) &&
    Number(a.kg || 0) === Number(b.kg || 0) &&
    Number(a.pcs || 0) === Number(b.pcs || 0) &&
    (a.date || '') === (b.date || '') &&
    (a.remarks || '') === (b.remarks || '')
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

export default function DailyTransactions({
  dailyEntries,
  setDailyEntries,
  entries,
  setEntries,
  currentUser,
  items
}) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})

  // 🔍 Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const start = (entry) => {
    if (currentUser?.role === 'staff') return
    setEditing(entry.originalIndex)
    setDraft({ ...dailyEntries[entry.originalIndex] })
  }

  const cancel = () => {
    setEditing(null)
    setDraft({})
  }

  const save = () => {
    const original = dailyEntries[editing]
    const normalizedDraft = {
      ...draft,
      kg: Number(draft.kg || 0),
      pcs: Number(draft.pcs || 0)
    }

    setDailyEntries(prev => {
      const c = [...prev]
      c[editing] = normalizedDraft
      return c
    })

    setEntries((prev) => {
      const idx = findEntryIndex(prev, original)
      if (idx < 0) return prev
      const clone = [...prev]
      clone[idx] = { ...clone[idx], ...normalizedDraft }
      return clone
    })

    cancel()
  }

  const del = (entry) => {
    if (currentUser?.role === 'staff')
      return alert('Staff cannot delete transactions')
    if (!window.confirm('Delete?')) return
    const original = dailyEntries[entry.originalIndex]

    setDailyEntries(prev => prev.filter((_, idx) => idx !== entry.originalIndex))
    setEntries((prev) => {
      const idx = findEntryIndex(prev, original)
      if (idx < 0) return prev
      return prev.filter((_, i) => i !== idx)
    })
  }

  // Apply Filters
  const filteredEntries = dailyEntries
    .map((d, originalIndex) => ({ ...d, originalIndex }))
    .filter(d => {
    const itemObj = items?.find(i => i.name === d.item)
    if (search && !d.item.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && d.type !== typeFilter) return false
    if (dateFilter && d.date !== dateFilter) return false
    if (categoryFilter !== 'all' && itemObj?.category !== categoryFilter) return false

    return true
  })

  const exportReport = async (format) => {
    const el = document.getElementById('daily-export')

    const originalBg = el.style.backgroundColor
    const filters = el.querySelectorAll('.no-export')

    // Hide filters
    filters.forEach(f => f.style.display = 'none')

    // Force white container
    el.style.backgroundColor = '#ffffff'

    // Force white rows
    const rows = el.querySelectorAll('tr')
    rows.forEach(row => row.style.backgroundColor = '#ffffff')

    // Force dark text
    const cells = el.querySelectorAll('td')
    cells.forEach(cell => {
      cell.style.color = '#000000'
      cell.style.fontWeight = '600'
    })

    // Remove animation + opacity
    const animatedRows = el.querySelectorAll('.row-anim')
    animatedRows.forEach(row => {
      row.style.animation = 'none'
      row.style.opacity = '1'
    })

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    // Restore filters
    filters.forEach(f => f.style.display = '')

    // Restore animation
    animatedRows.forEach(row => {
      row.style.animation = ''
      row.style.opacity = ''
    })

    // Restore original styles
    el.style.backgroundColor = originalBg
    rows.forEach(row => row.style.backgroundColor = '')
    cells.forEach(cell => {
      cell.style.color = ''
      cell.style.fontWeight = ''
    })

    if (format === 'png') {
      const link = document.createElement('a')
      link.download = `daily-transactions-${new Date().toLocaleDateString().replace(/\//g,'_')}.png`
      link.href = canvas.toDataURL('image/png', 0.9)
      link.click()
    } else {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',10,20,imgWidth,imgHeight)
      pdf.save(`daily-transactions-${new Date().toLocaleDateString().replace(/\//g,'_')}.pdf`)
    }
  }

  return (
    <section className="page">
      <h1>Daily Transactions</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => exportReport('png')}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
        >
          📥 Export PNG
        </button>

        <button
          onClick={() => exportReport('pdf')}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
        >
          📄 Export PDF
        </button>
      </div>

      {/* EXPORT WRAPPER */}
      <div id="daily-export">
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th>
                  Item 🔍
                  <div className="no-export">
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search..."
                      style={{ width: '100%', marginTop: 4, padding: '4px 6px', borderRadius: 6, fontSize: '12px' }}
                    />
                  </div>
                </th>
                
                <th style={{ textAlign: 'center' }}>
                  Category 📁
                  <div className="no-export">
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      style={{ width: '100%', marginTop: 4, padding: '4px', borderRadius: 6, fontSize: '12px' }}
                    >
                      <option value="all">All</option>
                      {[...new Set(items?.map(i => i.category))].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </th> 

                <th style={{ textAlign: 'center' }}>
                  Type ⚙
                  <div className="no-export">
                    <select
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}
                      style={{ width: '100%', marginTop: 4, padding: '4px', borderRadius: 6, fontSize: '12px' }}
                    >
                      <option value="all">All</option>
                      <option>Stock In</option>
                      <option>Stock Out</option>
                    </select>
                  </div>
                </th>

                <th style={{ textAlign: 'center' }}>KG</th>
                <th style={{ textAlign: 'center' }}>PCS</th>

                <th style={{ textAlign: 'center' }}>
                  Date 📅
                  <div className="no-export">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={e => setDateFilter(e.target.value)}
                      style={{ width: '100%', marginTop: 4, padding: '4px', borderRadius: 6, fontSize: '12px' }}
                    />
                  </div>
                </th>

                <th style={{ textAlign: 'center' }}>Remarks</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredEntries.map((d, i) => (
                <tr key={d.originalIndex} className="row-anim" style={{ animation: 'fadeIn .25s ease' }}>
                  <td>
                    {editing === d.originalIndex ? (
                      <input value={draft.item || ''} onChange={e => setDraft({ ...draft, item: e.target.value })} />
                    ) : (
                      d.item
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {items?.find(it => it.name === d.item)?.category || '—'}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === d.originalIndex ? (
                      <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>
                        <option>Stock In</option>
                        <option>Stock Out</option>
                      </select>
                    ) : (
                      <span style={{
                        background: d.type === 'Stock In' ? '#d1fae5' : '#fee2e2',
                        color: d.type === 'Stock In' ? '#065f46' : '#991b1b',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '12px'
                      }}>
                        {d.type}
                      </span>
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === d.originalIndex ? (
                      <input type="number" value={draft.kg || ''} onChange={e => setDraft({ ...draft, kg: e.target.value })} />
                    ) : (
                      Number(d.kg).toFixed(3)
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === d.originalIndex ? (
                      <input type="number" value={draft.pcs || ''} onChange={e => setDraft({ ...draft, pcs: e.target.value })} />
                    ) : (
                      d.pcs
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === d.originalIndex ? (
                      <input type="date" value={draft.date || ''} onChange={e => setDraft({ ...draft, date: e.target.value })} />
                    ) : (
                      d.date
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === d.originalIndex ? (
                      <input value={draft.remarks || ''} onChange={e => setDraft({ ...draft, remarks: e.target.value })} />
                    ) : (
                      d.remarks || '—'
                    )}
                  </td>

                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {editing === d.originalIndex ? (
                      <>
                        <button
                          onClick={save}
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
                          onClick={cancel}
                          style={{
                            background:'#9ca3af',
                            color:'#fff',
                            border:'none',
                            padding:'6px 12px',
                            borderRadius:4,
                            cursor:'pointer',
                            fontSize:'12px',
                            marginRight:'8px'
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : currentUser?.role === 'staff' ? (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>View only</span>
                    ) : (
                      <>
                        <button
                          onClick={()=>start(d)}
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
                          onClick={()=>del(d)}
                          style={{
                            background:'#ef4444',
                            color:'#fff',
                            border:'none',
                            padding:'6px 12px',
                            borderRadius:4,
                            cursor:'pointer',
                            fontSize:'12px',
                            marginRight:'8px'
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
