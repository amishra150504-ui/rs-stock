import React, { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function DailyTransactions({ dailyEntries, setDailyEntries, currentUser }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})

  // 🔍 Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  const start = (i) => {
    if (currentUser?.role === 'staff') return
    setEditing(i)
    setDraft({ ...dailyEntries[i] })
  }

  const cancel = () => {
    setEditing(null)
    setDraft({})
  }

  const save = () => {
    setDailyEntries(prev => {
      const c = [...prev]
      c[editing] = draft
      return c
    })
    cancel()
  }

  const del = (i) => {
    if (currentUser?.role === 'staff')
      return alert('Staff cannot delete transactions')
    if (!window.confirm('Delete?')) return
    setDailyEntries(prev => prev.filter((_, idx) => idx !== i))
  }

  // Apply Filters
  const filteredEntries = dailyEntries.filter(d => {
    if (search && !d.item.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && d.type !== typeFilter) return false
    if (dateFilter && d.date !== dateFilter) return false
    return true
  })

  const exportReport = async (format) => {
    const el = document.getElementById('daily-export')

    // Hide filters
    const filters = el.querySelectorAll('.no-export')
    filters.forEach(f => f.style.display = 'none')

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById('daily-export')

        if (clonedEl) {
          // Force correct styles in clone only
          const rows = clonedEl.querySelectorAll('tbody tr')
          rows.forEach((row, index) => {
            row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
          })

          const cells = clonedEl.querySelectorAll('td')
          cells.forEach(cell => {
            cell.style.color = '#000000'
            cell.style.fontWeight = '500'
          })
        }
      }
    })

    // Restore filters
    filters.forEach(f => f.style.display = '')

    if (format === 'png') {
      const link = document.createElement('a')
      link.download = `daily-transactions-${new Date().toLocaleDateString().replace(/\//g,'_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } else {
      const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'})
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
                <tr key={i} className="row-anim" style={{ animation: 'fadeIn .25s ease' }}>
                  <td>
                    {editing === i ? (
                      <input value={draft.item || ''} onChange={e => setDraft({ ...draft, item: e.target.value })} />
                    ) : (
                      d.item
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === i ? (
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
                    {editing === i ? (
                      <input type="number" value={draft.kg || ''} onChange={e => setDraft({ ...draft, kg: e.target.value })} />
                    ) : (
                      Number(d.kg).toFixed(3)
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === i ? (
                      <input type="number" value={draft.pcs || ''} onChange={e => setDraft({ ...draft, pcs: e.target.value })} />
                    ) : (
                      d.pcs
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === i ? (
                      <input type="date" value={draft.date || ''} onChange={e => setDraft({ ...draft, date: e.target.value })} />
                    ) : (
                      d.date
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {editing === i ? (
                      <input value={draft.remarks || ''} onChange={e => setDraft({ ...draft, remarks: e.target.value })} />
                    ) : (
                      d.remarks || '—'
                    )}
                  </td>

                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {editing === i ? (
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
                            fontSize:'12px'
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
                            fontSize:'12px'
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
                          onClick={()=>start(i)}
                          style={{
                            background:'#3b82f6',
                            color:'#fff',
                            border:'none',
                            padding:'6px 12px',
                            borderRadius:4,
                            cursor:'pointer',
                            fontSize:'12px'
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={()=>del(i)}
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
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}