import React, { useMemo, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const normalizeUnit = (value) => (value === 'pcs' ? 'pcs' : 'kg')

const sameEntry = (a, b) => {
  if (!a || !b) return false
  return (
    (a.item || '') === (b.item || '') &&
    Number(a.kg || 0) === Number(b.kg || 0) &&
    Number(a.pcs || 0) === Number(b.pcs || 0) &&
    (a.date || '') === (b.date || '') &&
    (a.purchasedFrom || '') === (b.purchasedFrom || '') &&
    (a.soldTo || '') === (b.soldTo || '') &&
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

const getDisplayQty = (entry) => {
  if (entry?.qty !== undefined && entry?.qty !== null && entry?.qty !== '') {
    return { qty: Number(entry.qty || 0), unit: normalizeUnit(entry.unit) }
  }
  const kg = Number(entry?.kg || 0)
  const pcs = Number(entry?.pcs || 0)
  if (kg > 0) return { qty: kg, unit: 'kg' }
  if (pcs > 0) return { qty: pcs, unit: 'pcs' }
  return { qty: 0, unit: 'kg' }
}

const buildPartyRows = (entries, field) => {
  const counts = new Map()
  entries.forEach((e) => {
    const name = String(e?.[field] || '').trim()
    if (!name) return
    counts.set(name, (counts.get(name) || 0) + 1)
  })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export default function SalesReport({
  entries,
  setEntries,
  dailyEntries,
  setDailyEntries,
  currentUser,
  purchaseParties = [],
  saleParties = [],
  setPurchaseParties,
  setSaleParties
}) {
  const [activeTab, setActiveTab] = useState('purchase')
  const [selectedParty, setSelectedParty] = useState('')
  const [newPurchaseParty, setNewPurchaseParty] = useState('')
  const [newSaleParty, setNewSaleParty] = useState('')
  const [editingParty, setEditingParty] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingEntry, setEditingEntry] = useState(null)
  const [draftEntry, setDraftEntry] = useState({})

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('all')
  const [purchaseFilter, setPurchaseFilter] = useState('')
  const [saleFilter, setSaleFilter] = useState('')

  const normalizedEntries = useMemo(
    () =>
      (entries || []).map((entry) => {
        const display = getDisplayQty(entry)
        return {
          ...entry,
          qty: display.qty,
          unit: display.unit,
          soldTo: entry?.soldTo || '',
          purchasedFrom: entry?.purchasedFrom || '',
          remark: entry?.remark || ''
        }
      }),
    [entries]
  )

  const purchasePartyCounts = useMemo(
    () => buildPartyRows(normalizedEntries, 'purchasedFrom'),
    [normalizedEntries]
  )
  const salePartyCounts = useMemo(
    () => buildPartyRows(normalizedEntries, 'soldTo'),
    [normalizedEntries]
  )

  const combinedPurchaseParties = useMemo(() => {
    const names = new Set(purchaseParties.map((p) => String(p || '').trim()).filter(Boolean))
    purchasePartyCounts.forEach((row) => names.add(row.name))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [purchaseParties, purchasePartyCounts])

  const combinedSaleParties = useMemo(() => {
    const names = new Set(saleParties.map((p) => String(p || '').trim()).filter(Boolean))
    salePartyCounts.forEach((row) => names.add(row.name))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [saleParties, salePartyCounts])

  const mergedPurchaseRows = useMemo(() => {
    const countMap = new Map(purchasePartyCounts.map((r) => [r.name, r.count]))
    const masterSet = new Set(purchaseParties.map((p) => String(p || '').trim()))
    return combinedPurchaseParties.map((name) => ({
      name,
      count: countMap.get(name) || 0,
      isMaster: masterSet.has(name)
    }))
  }, [combinedPurchaseParties, purchasePartyCounts, purchaseParties])

  const mergedSaleRows = useMemo(() => {
    const countMap = new Map(salePartyCounts.map((r) => [r.name, r.count]))
    const masterSet = new Set(saleParties.map((p) => String(p || '').trim()))
    return combinedSaleParties.map((name) => ({
      name,
      count: countMap.get(name) || 0,
      isMaster: masterSet.has(name)
    }))
  }, [combinedSaleParties, salePartyCounts, saleParties])

  const partyEntries = useMemo(() => {
    if (!selectedParty) return []
    return normalizedEntries.filter((e) => {
      const purchase = String(e.purchasedFrom || '').trim()
      const sale = String(e.soldTo || '').trim()
      return purchase === selectedParty || sale === selectedParty
    })
  }, [normalizedEntries, selectedParty])

  const filteredAllEntries = normalizedEntries
    .map((entry, originalIndex) => ({ ...entry, originalIndex, entryRef: entry }))
    .filter((entry) => {
    if (search && !String(entry.item || '').toLowerCase().includes(search.toLowerCase())) return false
    if (purchaseFilter && String(entry.purchasedFrom || '') !== purchaseFilter) return false
    if (saleFilter && String(entry.soldTo || '') !== saleFilter) return false
    if (dateFilter && entry.date !== dateFilter) return false
    if (unitFilter !== 'all' && normalizeUnit(entry.unit) !== unitFilter) return false
    return true
  })

  const isStaff = String(currentUser?.role || '').toLowerCase() === 'staff'

  const getConverted = (draft) => {
    const qty = Number(draft.qty || 0)
    const unit = normalizeUnit(draft.unit)
    const itemObj = items.find((i) => i.name === draft.item)
    const conv = itemObj?.conversion > 0 ? itemObj.conversion : 0
    let kg = Number(draft.kg || 0)
    let pcs = Number(draft.pcs || 0)
    if (unit === 'kg') {
      kg = qty
      if (conv > 0) pcs = Math.round(qty / conv)
    } else {
      pcs = qty
      if (conv > 0) kg = Number((qty * conv).toFixed(3))
    }
    return { kg, pcs, qty, unit }
  }

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
    const normalized = getConverted(draftEntry)
    const updated = {
      ...entryRef,
      ...draftEntry,
      kg: normalized.kg,
      pcs: normalized.pcs,
      qty: normalized.qty,
      unit: normalized.unit
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


  const addPurchaseParty = () => {
    const name = newPurchaseParty.trim()
    if (!name) return
    if (combinedPurchaseParties.some((p) => p.toLowerCase() === name.toLowerCase())) {
      return
    }
    if (setPurchaseParties) {
      setPurchaseParties((prev) => [...prev, name])
    }
    setNewPurchaseParty('')
  }

  const addSaleParty = () => {
    const name = newSaleParty.trim()
    if (!name) return
    if (combinedSaleParties.some((p) => p.toLowerCase() === name.toLowerCase())) {
      return
    }
    if (setSaleParties) {
      setSaleParties((prev) => [...prev, name])
    }
    setNewSaleParty('')
  }

  const startEditParty = (type, name) => {
    if (isStaff) return
    setEditingParty({ type, name })
    setEditingValue(name)
  }

  const saveEditParty = () => {
    if (!editingParty) return
    const nextName = editingValue.trim()
    if (!nextName) return
    if (editingParty.type === 'purchase') {
      if (setPurchaseParties) {
        setPurchaseParties((prev) =>
          prev.map((p) => (p === editingParty.name ? nextName : p))
        )
      }
      if (setEntries) {
        setEntries((prev) =>
          prev.map((e) =>
            String(e?.purchasedFrom || '').trim() === editingParty.name
              ? { ...e, purchasedFrom: nextName }
              : e
          )
        )
      }
      if (setDailyEntries) {
        setDailyEntries((prev) =>
          prev.map((e) =>
            String(e?.purchasedFrom || '').trim() === editingParty.name
              ? { ...e, purchasedFrom: nextName }
              : e
          )
        )
      }
    } else {
      if (setSaleParties) {
        setSaleParties((prev) =>
          prev.map((p) => (p === editingParty.name ? nextName : p))
        )
      }
      if (setEntries) {
        setEntries((prev) =>
          prev.map((e) =>
            String(e?.soldTo || '').trim() === editingParty.name
              ? { ...e, soldTo: nextName }
              : e
          )
        )
      }
      if (setDailyEntries) {
        setDailyEntries((prev) =>
          prev.map((e) =>
            String(e?.soldTo || '').trim() === editingParty.name
              ? { ...e, soldTo: nextName }
              : e
          )
        )
      }
    }
    setEditingParty(null)
    setEditingValue('')
  }

  const deleteParty = (type, name) => {
    if (isStaff) return
    if (!window.confirm('Delete this party name?')) return
    if (type === 'purchase') {
      if (setPurchaseParties) {
        setPurchaseParties((prev) => prev.filter((p) => p !== name))
      }
    } else {
      if (setSaleParties) {
        setSaleParties((prev) => prev.filter((p) => p !== name))
      }
    }
  }

  const exportReport = async (format) => {
    const el = document.getElementById('sales-report-export')
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
      link.download = `sales-report-${new Date().toLocaleDateString().replace(/\//g, '_')}.png`
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
    pdf.save(`sales-report-${new Date().toLocaleDateString().replace(/\//g, '_')}.pdf`)
  }

  return (
    <section className="page">
      <div className="party-menu-hero">
        <div>
          <h1>Party Menu</h1>
          <p>Manage purchase parties, sale parties, and all entries in one place.</p>
        </div>
      </div>

      <div className="party-tabs">
        <button
          className={`party-tab ${activeTab === 'purchase' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('purchase')
            setSelectedParty('')
          }}
        >
          Purchase Party
        </button>
        <button
          className={`party-tab ${activeTab === 'sale' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('sale')
            setSelectedParty('')
          }}
        >
          Sale Party
        </button>
        <button
          className={`party-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('all')
            setSelectedParty('')
          }}
        >
          All Entries
        </button>
      </div>

      {activeTab !== 'all' && (
        <div className="party-grid">
          <div className="party-list-card">
            <div className="party-list-header">
              <h3>{activeTab === 'purchase' ? 'Purchase Parties' : 'Sale Parties'}</h3>
              <span className="party-count">
                {activeTab === 'purchase' ? mergedPurchaseRows.length : mergedSaleRows.length} parties
              </span>
            </div>

            <div className="party-add-row">
              <input
                value={activeTab === 'purchase' ? newPurchaseParty : newSaleParty}
                onChange={(e) =>
                  activeTab === 'purchase'
                    ? setNewPurchaseParty(e.target.value)
                    : setNewSaleParty(e.target.value)
                }
                placeholder={activeTab === 'purchase' ? 'Add purchase party' : 'Add sale party'}
                disabled={isStaff}
              />
              <button
                onClick={activeTab === 'purchase' ? addPurchaseParty : addSaleParty}
                disabled={isStaff}
              >
                Add
              </button>
            </div>

            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Sl.No</th>
                    <th>Party Name</th>
                    <th style={{ width: 140, textAlign: 'center' }}>Entries</th>
                    <th style={{ width: 160, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'purchase' ? mergedPurchaseRows : mergedSaleRows).map((row, idx) => (
                    <tr key={`${row.name}-${idx}`} className="row-anim">
                      <td>{idx + 1}</td>
                      <td>
                        {editingParty?.type === (activeTab === 'purchase' ? 'purchase' : 'sale') &&
                        editingParty?.name === row.name ? (
                          <div className="party-edit-row">
                            <input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                            />
                            <button onClick={saveEditParty}>Save</button>
                            <button
                              onClick={() => {
                                setEditingParty(null)
                                setEditingValue('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="party-link"
                            onClick={() => setSelectedParty(row.name)}
                          >
                            {row.name}
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.count}</td>
                      <td style={{ textAlign: 'center' }}>
                        {row.isMaster ? (
                          <>
                            <button
                              className="party-mini-btn"
                              onClick={() => startEditParty(activeTab === 'purchase' ? 'purchase' : 'sale', row.name)}
                              disabled={isStaff}
                            >
                              Edit
                            </button>
                            <button
                              className="party-mini-btn party-mini-danger"
                              onClick={() => deleteParty(activeTab === 'purchase' ? 'purchase' : 'sale', row.name)}
                              disabled={isStaff}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="party-auto">Auto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(activeTab === 'purchase' ? mergedPurchaseRows : mergedSaleRows).length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>
                        No parties found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="party-detail-card">
            <div className="party-list-header">
              <h3>{selectedParty ? `Entries for ${selectedParty}` : 'Select a Party'}</h3>
              <span className="party-count">{selectedParty ? partyEntries.length : 0} entries</span>
            </div>
            {selectedParty ? (
              <div id="sales-report-export" className="table-wrap">
                <table className="sheet">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th>Purchased From</th>
                      <th>Sold To</th>
                      <th>Remark</th>
                      <th style={{ textAlign: 'center' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partyEntries.map((row, idx) => (
                      <tr key={`${row.id || idx}-${row.date || ''}`} className="row-anim">
                        <td>{row.item}</td>
                        <td style={{ textAlign: 'center' }}>{`${row.qty} ${normalizeUnit(row.unit)}`}</td>
                        <td>{row.purchasedFrom || '—'}</td>
                        <td>{row.soldTo || '—'}</td>
                        <td>{row.remark || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{row.date || '—'}</td>
                      </tr>
                    ))}
                    {partyEntries.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>
                          No entries for this party.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="party-empty">Click a party name to view entries.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'all' && (
        <>
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

          <div id="sales-report-export">
            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th>
                      Item
                      <div className="no-export">
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search..."
                          style={{ width: '100%', marginTop: 4, padding: '4px 6px', borderRadius: 6, fontSize: '12px' }}
                        />
                      </div>
                    </th>
                    <th style={{ textAlign: 'center' }}>
                      Qty
                      <div className="no-export">
                        <select
                          value={unitFilter}
                          onChange={(e) => setUnitFilter(e.target.value)}
                          style={{ width: '100%', marginTop: 4, padding: '4px', borderRadius: 6, fontSize: '12px' }}
                        >
                          <option value="all">All</option>
                          <option value="kg">Kg</option>
                          <option value="pcs">Pcs</option>
                        </select>
                      </div>
                    </th>
                    <th style={{ textAlign: 'center' }}>
                      Purchased From
                      <div className="no-export">
                        <select
                          value={purchaseFilter}
                          onChange={(e) => setPurchaseFilter(e.target.value)}
                          style={{ width: '100%', marginTop: 4, padding: '4px', borderRadius: 6, fontSize: '12px' }}
                        >
                          <option value="">All</option>
                          {combinedPurchaseParties.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th style={{ textAlign: 'center' }}>
                      Sold To
                      <div className="no-export">
                        <select
                          value={saleFilter}
                          onChange={(e) => setSaleFilter(e.target.value)}
                          style={{ width: '100%', marginTop: 4, padding: '4px', borderRadius: 6, fontSize: '12px' }}
                        >
                          <option value="">All</option>
                          {combinedSaleParties.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th>Remark</th>
                    <th style={{ textAlign: 'center' }}>
                      Date
                      <div className="no-export">
                        <input
                          type="date"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          style={{ width: '100%', marginTop: 4, padding: '4px', borderRadius: 6, fontSize: '12px' }}
                        />
                      </div>
                    </th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllEntries.map((row, idx) => (
                    <tr key={`${row.id || idx}-${row.date || ''}`} className="row-anim">
                      <td>
                        {editingEntry === row.originalIndex ? (
                          <input
                            value={draftEntry.item || ''}
                            onChange={(e) => setDraftEntry({ ...draftEntry, item: e.target.value })}
                          />
                        ) : (
                          row.item
                        )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {editingEntry === row.originalIndex ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <input
                              type="number"
                              value={draftEntry.qty || ''}
                              onChange={(e) => setDraftEntry({ ...draftEntry, qty: e.target.value })}
                              style={{ width: 90 }}
                            />
                            <select
                              value={normalizeUnit(draftEntry.unit)}
                              onChange={(e) => setDraftEntry({ ...draftEntry, unit: e.target.value })}
                            >
                              <option value="kg">kg</option>
                              <option value="pcs">pcs</option>
                            </select>
                          </div>
                        ) : (
                          `${row.qty} ${normalizeUnit(row.unit)}`
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {editingEntry === row.originalIndex ? (
                          <input
                            value={draftEntry.purchasedFrom || ''}
                            onChange={(e) => setDraftEntry({ ...draftEntry, purchasedFrom: e.target.value })}
                          />
                        ) : (
                          row.purchasedFrom || '???'
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {editingEntry === row.originalIndex ? (
                          <input
                            value={draftEntry.soldTo || ''}
                            onChange={(e) => setDraftEntry({ ...draftEntry, soldTo: e.target.value })}
                          />
                        ) : (
                          row.soldTo || '???'
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
                      <td style={{ textAlign: 'center' }}>
                        {editingEntry === row.originalIndex ? (
                          <input
                            type="date"
                            value={draftEntry.date || ''}
                            onChange={(e) => setDraftEntry({ ...draftEntry, date: e.target.value })}
                          />
                        ) : (
                          row.date || '???'
                        )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {isStaff ? (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>View only</span>
                        ) : editingEntry === row.originalIndex ? (
                          <>
                            <button
                              onClick={() => saveEditEntry(row.entryRef)}
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
                              onClick={() => startEditEntry(row.entryRef, row.originalIndex)}
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
                              onClick={() => deleteEntry(row.entryRef)}
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
                  {filteredAllEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>
                        No entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
