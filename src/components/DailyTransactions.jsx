import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { normalizeType } from '../utils/stockBalance'

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

export default function DailyTransactions({
  dailyEntries,
  setDailyEntries,
  entries,
  setEntries,
  currentUser,
  items,
  companyId,
  onPurchase,
  onSale
}) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [selected, setSelected] = useState(new Set())
  const hasDistributorEntries = dailyEntries.some((entry) => entry.entryKind === 'distributor-sale')

  const isRsTraders = companyId === 'rs_traders'

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [dateFrom, setDateFrom] = useState('')

  const [dateTo, setDateTo] = useState('')

  // RS TRADERS: staged filters for Apply/Reset UX
  const [pendingSearch, setPendingSearch] = useState('')
  const [pendingTypeFilter, setPendingTypeFilter] = useState('all')
  const [pendingCategoryFilter, setPendingCategoryFilter] = useState('all')
  const [pendingDateFrom, setPendingDateFrom] = useState('')
  const [pendingDateTo, setPendingDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const datePickerWrapRef = useRef(null)

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [calendarStart, setCalendarStart] = useState('')
  const [calendarEnd, setCalendarEnd] = useState('')

  const isoToDate = (iso) => {
    if (!iso) return null
    const [yy, mm, dd] = String(iso).split('-').map(Number)
    if (!yy || !mm || !dd) return null
    return new Date(yy, mm - 1, dd, 12, 0, 0)
  }

  const dateToIso = (date) => {
    if (!(date instanceof Date)) return ''
    const yy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  const clampRange = (fromIso, toIso) => {
    if (!fromIso && !toIso) return { fromIso: '', toIso: '' }
    if (fromIso && !toIso) return { fromIso, toIso: fromIso }
    if (!fromIso && toIso) return { fromIso: toIso, toIso }
    if (fromIso > toIso) return { fromIso: toIso, toIso: fromIso }
    return { fromIso, toIso }
  }

  const applyFilters = (overrides = null) => {
    if (!isRsTraders) return
    setSearch(pendingSearch)
    setTypeFilter(pendingTypeFilter)
    setCategoryFilter(pendingCategoryFilter)

    const nextFrom = overrides?.dateFrom ?? pendingDateFrom
    const nextTo = overrides?.dateTo ?? pendingDateTo
    const clamped = clampRange(nextFrom, nextTo)

    setPendingDateFrom(clamped.fromIso)
    setPendingDateTo(clamped.toIso)
    setCalendarStart(clamped.fromIso)
    setCalendarEnd(clamped.toIso)
    setDateFrom(clamped.fromIso)
    setDateTo(clamped.toIso)
    setShowDatePicker(false)
  }

  const resetFilters = () => {
    if (!isRsTraders) {
      setSearch('')
      setTypeFilter('all')
      setDateFilter('')
      setCategoryFilter('all')
      return
    }
    setPendingSearch('')
    setPendingTypeFilter('all')
    setPendingCategoryFilter('all')
    setPendingDateFrom('')
    setPendingDateTo('')
    setSearch('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setDateFrom('')
    setDateTo('')
    setShowDatePicker(false)
  }

  const resetDateRange = () => {
    setPendingDateFrom('')
    setPendingDateTo('')
    setCalendarStart('')
    setCalendarEnd('')
  }

  const formatRangeLabel = (from, to) => {
    const fmt = (v) => {
      if (!v) return 'dd/mm/yyyy'
      const [yy, mm, dd] = String(v).split('-')
      if (!yy || !mm || !dd) return 'dd/mm/yyyy'
      return `${dd}/${mm}/${yy}`
    }
    return `${fmt(from)} - ${fmt(to)}`
  }

  const rangeSummaryLabel = (fromIso, toIso) => {
    if (!fromIso && !toIso) return 'Select dates'
    const clamped = clampRange(fromIso, toIso)
    return formatRangeLabel(clamped.fromIso, clamped.toIso)
  }

  const monthLabel = (date) => date.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  const calendarDays = useMemo(() => {
    const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
    const leading = (start.getDay() + 6) % 7 // Monday=0
    const totalDays = end.getDate()
    const cells = []
    for (let i = 0; i < leading; i++) cells.push(null)
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d, 12, 0, 0))
    }
    return cells
  }, [calendarMonth])

  const isSameDay = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const isWithin = (d, a, b) => {
    if (!d || !a || !b) return false
    const t = d.getTime()
    const lo = Math.min(a.getTime(), b.getTime())
    const hi = Math.max(a.getTime(), b.getTime())
    return t >= lo && t <= hi
  }

  const onCalendarPick = (pickedDate) => {
    if (!pickedDate) return
    const pickedIso = dateToIso(pickedDate)

    if (!calendarStart || (calendarStart && calendarEnd)) {
      setCalendarStart(pickedIso)
      setCalendarEnd('')
      return
    }

    if (!calendarEnd) {
      if (pickedIso < calendarStart) {
        setCalendarEnd(calendarStart)
        setCalendarStart(pickedIso)
        return
      }
      setCalendarEnd(pickedIso)
    }
  }

  const setPreset = (kind) => {
    const today = new Date()
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)

    if (kind === 'today') {
      const iso = dateToIso(t)
      setCalendarStart(iso)
      setCalendarEnd(iso)
      setCalendarMonth(new Date(t.getFullYear(), t.getMonth(), 1))
      return
    }

    if (kind === 'last7') {
      const end = t
      const start = new Date(end)
      start.setDate(end.getDate() - 6)
      setCalendarStart(dateToIso(start))
      setCalendarEnd(dateToIso(end))
      setCalendarMonth(new Date(end.getFullYear(), end.getMonth(), 1))
      return
    }

    if (kind === 'thisMonth') {
      const start = new Date(t.getFullYear(), t.getMonth(), 1, 12, 0, 0)
      const end = new Date(t.getFullYear(), t.getMonth() + 1, 0, 12, 0, 0)
      setCalendarStart(dateToIso(start))
      setCalendarEnd(dateToIso(end))
      setCalendarMonth(new Date(t.getFullYear(), t.getMonth(), 1))
      return
    }

    if (kind === 'lastMonth') {
      const start = new Date(t.getFullYear(), t.getMonth() - 1, 1, 12, 0, 0)
      const end = new Date(t.getFullYear(), t.getMonth(), 0, 12, 0, 0)
      setCalendarStart(dateToIso(start))
      setCalendarEnd(dateToIso(end))
      setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1))
    }
  }

  useEffect(() => {
    if (!isRsTraders) return
    if (!showDatePicker) return

    const base = isoToDate(pendingDateFrom) || isoToDate(pendingDateTo) || new Date()
    setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1))
    setCalendarStart(pendingDateFrom || '')
    setCalendarEnd(pendingDateTo || '')

    const onDoc = (e) => {
      const node = datePickerWrapRef.current
      if (!node) return
      if (node.contains(e.target)) return
      setShowDatePicker(false)
    }

    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [isRsTraders, showDatePicker, pendingDateFrom, pendingDateTo])

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
      return removeEntryByIdOrMatch(prev, original)
    })
    setSelected(prev => {
      const next = new Set(prev)
      next.delete(entry.originalIndex)
      return next
    })
  }

  const toggleSelect = (originalIndex) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(originalIndex)) next.delete(originalIndex)
      else next.add(originalIndex)
      return next
    })
  }

  const toggleSelectAll = (checked) => {
    if (!checked) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(filteredEntries.map(e => e.originalIndex)))
  }

  const deleteSelected = () => {
    if (currentUser?.role === 'staff')
      return alert('Staff cannot delete transactions')
    if (!selected.size) return alert('No rows selected')
    if (!window.confirm(`Delete ${selected.size} selected row(s)?`)) return

    const selectedIndexes = new Set(selected)
    const originals = dailyEntries.filter((_, idx) => selectedIndexes.has(idx))

    setDailyEntries(prev => prev.filter((_, idx) => !selectedIndexes.has(idx)))
    setEntries(prev => {
      let next = prev
      originals.forEach(o => {
        next = removeEntryByIdOrMatch(next, o)
      })
      return next
    })
    setSelected(new Set())
  }

  // Apply Filters
  const filteredEntries = dailyEntries
    .map((d, originalIndex) => ({ ...d, originalIndex, entryRef: d }))
    .filter(d => {
    const itemObj = items?.find(i => i.name === d.item)
    const searchText = `${d.item || ''} ${d.distributorCompany || ''} ${d.sellingParty || ''}`.toLowerCase()
    if (search && !searchText.includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && d.type !== typeFilter) return false
    if (!isRsTraders) {
      if (dateFilter && d.date !== dateFilter) return false
    } else {
      if (dateFrom && (d.date || '') < dateFrom) return false
      if (dateTo && (d.date || '') > dateTo) return false
    }
    if (categoryFilter !== 'all' && itemObj?.category !== categoryFilter) return false

    return true
  })
    .sort((a, b) => {
      const da = a.date || ''
      const db = b.date || ''
      if (da < db) return 1
      if (da > db) return -1
      return a.originalIndex - b.originalIndex
    })

  const rowsToRender = filteredEntries

  const getConversionForItem = (itemName) => {
    const item = items?.find((it) => it.name === itemName)
    const conv = Number(item?.conversion || 0)
    if (conv > 0) return conv
    const name = String(itemName || '').toLowerCase()
    const match = name.match(/(\d+(?:\.\d+)?)\s*mm/)
    if (!match) return 0
    const map = { '5.5': 2.24, '6': 2.67, '8': 4.74, '10': 7.4, '12': 10.65, '16': 18.96, '20': 29.6 }
    return Number(map[match[1]] || 0)
  }

  const getDisplayPcs = (entry) => {
    const pcsValue = Number(entry?.pcs || 0)
    if (pcsValue) return pcsValue
    const kgValue = Number(entry?.kg || 0)
    const conv = getConversionForItem(entry?.item)
    if (!kgValue || !conv) return 0
    return Math.round(kgValue / conv)
  }

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
      <div className="page-hero">
        <div>
          <h1>Daily Transactions</h1>
          <p>Review, filter, and export your daily stock movements.</p>
        </div>
      </div>

      <div className="toolbar daily-actions">
        {isRsTraders && (
          <>
            <button
              onClick={() => onPurchase?.()}
              className="btn btn-blue btn-action"
              type="button"
              title="Go to Stock Entry (Purchase)"
            >
              + Purchase
            </button>
            <button
              onClick={() => onSale?.()}
              className="btn btn-green btn-action"
              type="button"
              title="Go to Stock Entry (Sale)"
            >
              ↗ Sale
            </button>
          </>
        )}

        <button onClick={() => exportReport('png')} className={`btn ${isRsTraders ? 'btn-purple' : 'btn-blue'}`}>
          Export PNG
        </button>

        <button onClick={() => exportReport('pdf')} className="btn btn-red">
          Export PDF
        </button>

        <button onClick={deleteSelected} className="btn btn-orange">
          Delete Selected
        </button>

        {isRsTraders && (
          <div className="daily-actions-right no-export">
            <div className="daily-date-popover-wrap" ref={datePickerWrapRef}>
              <button
                className="daily-range-btn"
                type="button"
                title="Pick date range"
                onClick={() => setShowDatePicker((v) => !v)}
              >
                <span className="daily-range-ico" aria-hidden="true">Date</span>
                <span className="daily-range-text">{rangeSummaryLabel(pendingDateFrom, pendingDateTo)}</span>
                <span className="daily-range-caret" aria-hidden="true">v</span>
              </button>

              {showDatePicker && (
                <div className="daily-date-popover daily-date-popover-calendar" role="dialog" aria-label="Select date range">
                  <div className="daily-date-head">
                    <div className="daily-date-title">Date range</div>
                    <div className="daily-date-month">
                      <button
                        className="daily-cal-nav"
                        type="button"
                        aria-label="Previous month"
                        onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                      >
                        &lt;
                      </button>
                      <div className="daily-cal-month-label">{monthLabel(calendarMonth)}</div>
                      <button
                        className="daily-cal-nav"
                        type="button"
                        aria-label="Next month"
                        onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                      >
                        &gt;
                      </button>
                    </div>
                    <input
                      type="date"
                      value={pendingDateFrom}
                      onChange={(e) => setPendingDateFrom(e.target.value)}
                      aria-label="From date"
                    />
                    <span className="daily-date-sep">—</span>
                    <input
                      type="date"
                      value={pendingDateTo}
                      onChange={(e) => setPendingDateTo(e.target.value)}
                      aria-label="To date"
                    />
                  </div>
                  <div className="daily-date-presets" role="group" aria-label="Quick ranges">
                    <button className="daily-chip" type="button" onClick={() => setPreset('today')}>Today</button>
                    <button className="daily-chip" type="button" onClick={() => setPreset('last7')}>Last 7</button>
                    <button className="daily-chip" type="button" onClick={() => setPreset('thisMonth')}>This month</button>
                    <button className="daily-chip" type="button" onClick={() => setPreset('lastMonth')}>Last month</button>
                    <button className="daily-chip daily-chip-ghost" type="button" onClick={resetDateRange}>Clear</button>
                  </div>

                  <div className="daily-cal-grid" aria-label="Calendar">
                    <div className="daily-cal-week">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                        <div key={d} className="daily-cal-dow">{d}</div>
                      ))}
                    </div>
                    <div className="daily-cal-days">
                      {calendarDays.map((day, idx) => {
                        if (!day) return <div key={`b-${idx}`} className="daily-cal-cell daily-cal-blank" />

                        const s = isoToDate(calendarStart)
                        const e = isoToDate(calendarEnd)
                        const isStart = isSameDay(day, s)
                        const isEnd = isSameDay(day, e)
                        const inRange = isWithin(day, s, e)

                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            className={[
                              'daily-cal-cell',
                              inRange ? 'is-range' : '',
                              isStart ? 'is-start' : '',
                              isEnd ? 'is-end' : ''
                            ].filter(Boolean).join(' ')}
                            onClick={() => onCalendarPick(day)}
                            aria-label={day.toLocaleDateString()}
                          >
                            {day.getDate()}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="daily-date-selected" aria-label="Selected range">
                    <div className="daily-date-selected-pill">
                      <span className="daily-date-selected-label">Selected</span>
                      <span className="daily-date-selected-value">{rangeSummaryLabel(calendarStart, calendarEnd)}</span>
                    </div>
                  </div>

                  <div className="daily-date-actions">
                    <button className="daily-btn daily-btn-ghost" onClick={() => setShowDatePicker(false)} type="button">
                      Cancel
                    </button>
                    <button className="daily-btn daily-btn-primary" onClick={() => applyFilters({ dateFrom: calendarStart, dateTo: calendarEnd })} type="button">
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              className="daily-filters-toggle"
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              title="Toggle filters"
            >
              ⛭ Filters
            </button>
          </div>
        )}
      </div>

      {isRsTraders && showFilters && (
        <div className="daily-filters no-export" role="region" aria-label="Daily filters">
          <div className="daily-filters-left">
            <div className="daily-search">
              <input
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Search item..."
              />
            </div>

            <div className="daily-filter">
              <div className="daily-filter-label">Category</div>
              <select value={pendingCategoryFilter} onChange={(e) => setPendingCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {[...new Set(items?.map((i) => i.category))].filter(Boolean).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="daily-filter">
              <div className="daily-filter-label">Type</div>
              <select value={pendingTypeFilter} onChange={(e) => setPendingTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="Stock In">Stock In</option>
                <option value="Stock Out">Stock Out</option>
              </select>
            </div>
          </div>

          <div className="daily-filters-right">
            <button className="daily-btn daily-btn-ghost" onClick={resetFilters} type="button">
              Reset
            </button>
            <button className="daily-btn daily-btn-primary" onClick={applyFilters} type="button">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* EXPORT WRAPPER */}
      <div id="daily-export">
        <div className="table-wrap">
          <table className={`sheet${isRsTraders ? ' sheet-light' : ''}`}>
            <thead>
              <tr>
                <th className="no-export" style={{ width: 42, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredEntries.length > 0 && selected.size === filteredEntries.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                {isRsTraders ? (
                  <>
                    <th style={{ textAlign: 'center' }}>Date ⇅</th>
                    <th>Item ⇅</th>
                  </>
                ) : (
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
                )} 

                {hasDistributorEntries && <th style={{ textAlign: 'center' }}>Distributor Company</th>}
                {hasDistributorEntries && <th style={{ textAlign: 'center' }}>Selling Party</th>}

                <th style={{ textAlign: 'center' }}>
                  {isRsTraders ? 'Category ⇅' : 'Category 📁'}
                  {!isRsTraders && (
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
                  )}
                </th> 

                <th style={{ textAlign: 'center' }}>
                  {isRsTraders ? 'Type ⇅' : 'Type ⚙'}
                  {!isRsTraders && (
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
                  )}
                </th>

                <th style={{ textAlign: 'center' }}>{isRsTraders ? 'KG ⇅' : 'KG'}</th>
                <th style={{ textAlign: 'center' }}>{isRsTraders ? 'PCS ⇅' : 'PCS'}</th>

                {!isRsTraders && (
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
                )}

                <th style={{ textAlign: 'center' }}>Remarks</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rowsToRender.map((d, i) => (
                <tr key={d.originalIndex} className="row-anim" style={{ animation: 'fadeIn .25s ease' }}>
                  <td className="no-export" style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(d.originalIndex)}
                      onChange={() => toggleSelect(d.originalIndex)}
                    />
                  </td>

                  {isRsTraders && (
                    <td style={{ textAlign: 'center' }}>
                      {editing === d.originalIndex ? (
                        <input type="date" value={draft.date || ''} onChange={e => setDraft({ ...draft, date: e.target.value })} />
                      ) : (
                        d.date
                      )}
                    </td>
                  )}

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
                  {hasDistributorEntries && (
                    <td style={{ textAlign: 'center' }}>
                      {editing === d.originalIndex ? (
                        <input value={draft.distributorCompany || ''} onChange={e => setDraft({ ...draft, distributorCompany: e.target.value })} />
                      ) : (
                        d.distributorCompany || '—'
                      )}
                    </td>
                  )}

                  {hasDistributorEntries && (
                    <td style={{ textAlign: 'center' }}>
                      {editing === d.originalIndex ? (
                        <input value={draft.sellingParty || ''} onChange={e => setDraft({ ...draft, sellingParty: e.target.value })} />
                      ) : (
                        d.sellingParty || '—'
                      )}
                    </td>
                  )}


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
                      getDisplayPcs(d)
                    )}
                  </td>


                  {!isRsTraders && (
                    <td style={{ textAlign: 'center' }}>
                      {editing === d.originalIndex ? (
                        <input type="date" value={draft.date || ''} onChange={e => setDraft({ ...draft, date: e.target.value })} />
                      ) : (
                        d.date
                      )}
                    </td>
                  )}

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
