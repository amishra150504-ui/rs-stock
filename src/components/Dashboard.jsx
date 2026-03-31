import React, { useEffect, useMemo, useState } from 'react'

const toDateKey = (value) => {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

const dayDiffInclusive = (start, end) => {
  const ms = 24 * 60 * 60 * 1000
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  return Math.floor((e - s) / ms) + 1
}

const getUploadStatus = (uploads, dateField, todayKey) => {
  const uploadedDateSet = new Set(
    uploads.map((u) => toDateKey(u[dateField])).filter((d) => d && d <= todayKey)
  )
  const uploadedDates = [...uploadedDateSet].sort()
  const firstUploadedDate = uploadedDates.length ? uploadedDates[0] : null
  const lastUploadedDate = uploadedDates.length ? uploadedDates[uploadedDates.length - 1] : null
  const uploadedCount = firstUploadedDate
    ? uploadedDates.filter((d) => d >= firstUploadedDate && d <= todayKey).length
    : 0
  const notUploadedCount = firstUploadedDate
    ? Math.max(dayDiffInclusive(firstUploadedDate, todayKey) - uploadedCount, 0)
    : 0
  const uploadCoveragePct =
    uploadedCount + notUploadedCount > 0
      ? Math.round((uploadedCount / (uploadedCount + notUploadedCount)) * 100)
      : 0

  return { lastUploadedDate, uploadedCount, notUploadedCount, uploadCoveragePct }
}

const getRecordKey = (upload, dateField, companyId) =>
  String(
    upload?.id ||
      `${companyId || ''}|${upload?.storagePath || ''}|${upload?.fileName || ''}|${upload?.uploadedAt || ''}|${upload?.[dateField] || ''}`
  )

const getDisplayQty = (entry) => {
  if (entry?.qty !== undefined && entry?.qty !== null && entry?.qty !== '') {
    return { qty: Number(entry.qty || 0), unit: entry.unit === 'pcs' ? 'pcs' : 'kg' }
  }
  const kg = Number(entry?.kg || 0)
  const pcs = Number(entry?.pcs || 0)
  if (kg > 0) return { qty: kg, unit: 'kg' }
  if (pcs > 0) return { qty: pcs, unit: 'pcs' }
  return { qty: 0, unit: 'kg' }
}

export default function Dashboard({
  entries,
  calculateStock,
  items,
  daybookUploads = [],
  dailyChartUploads = [],
  companyId = '',
  company,
  companies = [],
  currentCompanyId = '',
  onSwitchCompany = () => {},
  currentUser = null,
  onManualBackup = () => {},
  onManualExport = () => {},
  backupBusy = false,
  exportBusy = false,
  backupStatus = '',
  backupError = '',
  exportStatus = '',
  exportError = ''
}) {
  const stockEnabled = Boolean(company?.stockEnabled)
  const stock = stockEnabled ? calculateStock() : {}
  const totalItems = stockEnabled ? Object.keys(stock).length : 0

  let inKg = 0, outKg = 0
  if (stockEnabled) {
    Object.values(stock).forEach(s => {
      inKg += s.inKg
      outKg += s.outKg
    })
  }

  const netStock = inKg - outKg

  const todayKey = toDateKey(new Date())
  const inferCompanyId = (record) => {
    const storagePath = String(record?.storagePath || '')
    const nameFromUrl = String(record?.downloadURL || '').split('/').pop() || ''
    const fileName = String(record?.fileName || nameFromUrl || '')
    const name = fileName.toLowerCase()

    if (name.includes('laxmi')) return 'laxmi_agency'
    if (/\bla\b/.test(name) || name.includes('la_') || name.includes('la-') || name.includes('la ')) return 'la_counter'
    if (name.includes('rs_') || name.includes('rs-') || name.includes('rs ')) return 'rs_traders'

    if (storagePath.includes('/companies/rs_traders/')) return 'rs_traders'
    if (storagePath.includes('/companies/la_counter/')) return 'la_counter'
    if (storagePath.includes('/companies/laxmi_agency/')) return 'laxmi_agency'

    return companyId
  }

  const isRecordForCompany = (record) => {
    if (!record) return false
    if (record.companyId) return record.companyId === companyId
    return inferCompanyId(record) === companyId
  }

  const filteredDaybook = daybookUploads.filter(isRecordForCompany)
  const filteredDailyChart = dailyChartUploads.filter(isRecordForCompany)

  const daybookStatus = getUploadStatus(filteredDaybook, 'daybookDate', todayKey)
  const dailyChartStatus = getUploadStatus(filteredDailyChart, 'chartDate', todayKey)
  const uploadedFilesToDate = filteredDaybook.filter((u) => {
    const d = toDateKey(u.daybookDate)
    return d && d <= todayKey
  })
  const checkedFilesCount = uploadedFilesToDate.filter((u) => Boolean(u.checked)).length
  const notCheckedFilesCount = Math.max(uploadedFilesToDate.length - checkedFilesCount, 0)
  const netStatus = netStock >= 0 ? 'Healthy Balance' : 'Negative Balance'
  const stockFlowPct = inKg > 0 ? Math.min((outKg / inKg) * 100, 100) : 0
  const checkedPct =
    uploadedFilesToDate.length > 0
      ? Math.round((checkedFilesCount / uploadedFilesToDate.length) * 100)
      : 0
  const [time, setTime] = useState("")
  const [date, setDate] = useState("")
  const [datePretty, setDatePretty] = useState("")
  const [dateMode, setDateMode] = useState('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {

      const now = new Date()

      const istTime = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false
      })

      const istDate = now.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      })

      setTime(istTime)
      setDate(istDate)
      setDatePretty(istDate)

    }, 1000)

    return () => clearInterval(timer)

  }, [])

  const dateRange = useMemo(() => {
    if (!todayKey) return { start: null, end: null }
    if (dateMode === 'all') return { start: null, end: null }

    const addDays = (key, days) => {
      const base = new Date(`${key}T00:00:00`)
      base.setDate(base.getDate() + days)
      return toDateKey(base)
    }

    if (dateMode === 'today') {
      return { start: todayKey, end: todayKey }
    }
    if (dateMode === 'last7') {
      return { start: addDays(todayKey, -6), end: todayKey }
    }
    if (dateMode === 'month') {
      const base = new Date(`${todayKey}T00:00:00`)
      const start = toDateKey(new Date(base.getFullYear(), base.getMonth(), 1))
      return { start, end: todayKey }
    }
    if (dateMode === 'custom') {
      const start = customStart || todayKey
      const end = customEnd || todayKey
      return { start, end }
    }
    return { start: todayKey, end: todayKey }
  }, [dateMode, customStart, customEnd, todayKey])

  const isWithinRange = (entryDate) => {
    if (!entryDate) return false
    if (!dateRange.start || !dateRange.end) return true
    return entryDate >= dateRange.start && entryDate <= dateRange.end
  }

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const key = toDateKey(entry?.date)
      return isWithinRange(key)
    })
  }, [entries, dateRange.start, dateRange.end])

  const stockSnapshot = useMemo(() => {
    if (!stockEnabled) return null
    let inKgSnap = 0
    let outKgSnap = 0
    let inPcsSnap = 0
    let outPcsSnap = 0
    filteredEntries.forEach((e) => {
      if (e.type === 'Stock In') {
        inKgSnap += Number(e.kg || 0)
        inPcsSnap += Number(e.pcs || 0)
      } else if (e.type === 'Stock Out') {
        outKgSnap += Number(e.kg || 0)
        outPcsSnap += Number(e.pcs || 0)
      }
    })
    return {
      inKg: inKgSnap,
      outKg: outKgSnap,
      netKg: inKgSnap - outKgSnap,
      inPcs: inPcsSnap,
      outPcs: outPcsSnap,
      netPcs: inPcsSnap - outPcsSnap,
      entries: filteredEntries.length
    }
  }, [filteredEntries, stockEnabled])

  const salesSnapshot = useMemo(() => {
    if (stockEnabled) return null
    let totalKg = 0
    let totalPcs = 0
    const parties = new Set()
    filteredEntries.forEach((entry) => {
      const kgVal = Number(entry?.kg || 0)
      const pcsVal = Number(entry?.pcs || 0)
      totalKg += kgVal
      totalPcs += pcsVal
      if (entry?.soldTo) parties.add(String(entry.soldTo).trim())

      if (!kgVal && pcsVal) {
        const item = items.find((i) => i.name === entry.item)
        if (item?.conversion > 0) {
          totalKg += pcsVal * item.conversion
        }
      }
      if (!pcsVal && kgVal) {
        const item = items.find((i) => i.name === entry.item)
        if (item?.conversion > 0) {
          totalPcs += Math.round(kgVal / item.conversion)
        }
      }
    })
    return {
      totalKg,
      totalPcs,
      entries: filteredEntries.length,
      parties: parties.size
    }
  }, [filteredEntries, items, stockEnabled])

  const salesSummary = (() => {
    if (stockEnabled) return null
    let totalKg = 0
    let missingConversions = 0
    const parties = new Set()
    const itemsSet = new Set()
    entries.forEach((entry) => {
      const display = getDisplayQty(entry)
      if (display.unit === 'kg') {
        totalKg += display.qty
      } else {
        const item = items.find((i) => i.name === entry.item)
        if (item?.conversion > 0) {
          totalKg += display.qty * item.conversion
        } else {
          missingConversions += 1
        }
      }
      if (entry?.soldTo) parties.add(String(entry.soldTo).trim())
      if (entry?.item) itemsSet.add(String(entry.item).trim())
    })

    const recent = entries.slice().reverse().slice(0, 6)
    return {
      totalKg,
      missingConversions,
      parties: parties.size,
      items: itemsSet.size,
      totalEntries: entries.length,
      recent
    }
  })()

  return (
    <section className="page dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-welcome">
            Welcome back, {currentUser?.name || currentUser?.id || 'User'}
          </div>
          <h1>Dashboard</h1>
          <p>
            {stockEnabled
              ? 'Live overview of stock movement and daybook progress.'
              : 'Quick view of same-day sales entries and party activity.'}
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-pill">{currentUser?.name || currentUser?.id || 'Administrator'}</span>
            <span className="dashboard-pill">{datePretty || date}</span>
            <span className="dashboard-pill">{time ? `${time} IST` : 'IST'}</span>
          </div>
        </div>
        <div className="dashboard-clock">
          <div className="time-date">{date}</div>
          <div className="time-main">{time}</div>
          <div className="time-zone">Indian Standard Time (IST)</div>
        </div>
        </div>

        <div className="dashboard-actions">
          <div className="dashboard-action-buttons">
            <button
              className="dashboard-action-btn"
              onClick={onManualBackup}
              disabled={backupBusy}
            >
              {backupBusy ? 'Backing Up...' : 'Backup'}
            </button>
            <button
              className="dashboard-action-btn secondary"
              onClick={onManualExport}
              disabled={exportBusy}
            >
              {exportBusy ? 'Exporting...' : 'Export PDF/PNG'}
            </button>
          </div>
          <div className="dashboard-action-status">
            {backupStatus && <span className="status-pill ok">{backupStatus}</span>}
            {backupError && <span className="status-pill error">{backupError}</span>}
            {exportStatus && <span className="status-pill ok">{exportStatus}</span>}
            {exportError && <span className="status-pill error">{exportError}</span>}
          </div>
        </div>

        <div className="dashboard-toolbar">
        <div className="dashboard-filter">
          <div className="dashboard-filter-title">Date Filter</div>
          <div className="dashboard-filter-row">
            <select value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
              <option value="today">Today</option>
              <option value="last7">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom</option>
              <option value="all">All</option>
            </select>
            {dateMode === 'custom' && (
              <>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </>
            )}
          </div>
          <div className="dashboard-filter-foot">
            {dateRange.start && dateRange.end
              ? `${dateRange.start} to ${dateRange.end}`
              : 'All dates'}
          </div>
        </div>

        <div className="dashboard-company-switch">
          <div className="dashboard-filter-title">Quick Switch</div>
          <div className="dashboard-company-row">
            {companies.map((c) => (
              <button
                key={c.id}
                className={`dashboard-company-btn ${currentCompanyId === c.id ? 'active' : ''}`}
                onClick={() => onSwitchCompany(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-snapshot-grid">
        {stockEnabled ? (
          <>
            <div className="dashboard-snapshot-card">
              <div className="title">Snapshot In</div>
              <div className="value">{(stockSnapshot?.inKg || 0).toFixed(3)} KG</div>
              <div className="dashboard-kpi-foot">{stockSnapshot?.inPcs || 0} PCS</div>
            </div>
            <div className="dashboard-snapshot-card">
              <div className="title">Snapshot Out</div>
              <div className="value">{(stockSnapshot?.outKg || 0).toFixed(3)} KG</div>
              <div className="dashboard-kpi-foot">{stockSnapshot?.outPcs || 0} PCS</div>
            </div>
            <div className="dashboard-snapshot-card">
              <div className="title">Snapshot Net</div>
              <div className="value">{(stockSnapshot?.netKg || 0).toFixed(3)} KG</div>
              <div className="dashboard-kpi-foot">{stockSnapshot?.netPcs || 0} PCS</div>
            </div>
            <div className="dashboard-snapshot-card">
              <div className="title">Snapshot Entries</div>
              <div className="value">{stockSnapshot?.entries || 0}</div>
              <div className="dashboard-kpi-foot">Filtered entries</div>
            </div>
          </>
        ) : (
          <>
            <div className="dashboard-snapshot-card">
              <div className="title">Snapshot Qty (KG)</div>
              <div className="value">{(salesSnapshot?.totalKg || 0).toFixed(3)} KG</div>
              <div className="dashboard-kpi-foot">Converted from items</div>
            </div>
            <div className="dashboard-snapshot-card">
              <div className="title">Snapshot Qty (PCS)</div>
              <div className="value">{Math.round(salesSnapshot?.totalPcs || 0)}</div>
              <div className="dashboard-kpi-foot">Total pieces</div>
            </div>
            <div className="dashboard-snapshot-card">
              <div className="title">Snapshot Entries</div>
              <div className="value">{salesSnapshot?.entries || 0}</div>
              <div className="dashboard-kpi-foot">Filtered entries</div>
            </div>
            <div className="dashboard-snapshot-card">
              <div className="title">Snapshot Parties</div>
              <div className="value">{salesSnapshot?.parties || 0}</div>
              <div className="dashboard-kpi-foot">Sold To count</div>
            </div>
          </>
        )}
      </div>

      {stockEnabled ? (
        <div className="dashboard-kpi-grid">
          <div className="dashboard-kpi-card dashboard-kpi-items">
            <div className="title">Total Items</div>
            <div className="value">{totalItems}</div>
            <div className="dashboard-kpi-foot">Tracked products in inventory</div>
          </div>

          <div className="dashboard-kpi-card dashboard-kpi-in">
            <div className="title">Stock In</div>
            <div className="value">{inKg.toFixed(3)} KG</div>
            <div className="dashboard-meter"><span style={{ width: '100%' }} /></div>
          </div>

          <div className="dashboard-kpi-card dashboard-kpi-out">
            <div className="title">Stock Out</div>
            <div className="value">{outKg.toFixed(3)} KG</div>
            <div className="dashboard-meter"><span style={{ width: `${stockFlowPct}%` }} /></div>
          </div>

          <div className="dashboard-kpi-card dashboard-kpi-net">
            <div className="title">Net Stock</div>
            <div className="value">{netStock.toFixed(3)} KG</div>
            <div className="dashboard-kpi-foot">{netStatus}</div>
          </div>
        </div>
      ) : (
        <div className="dashboard-kpi-grid">
          <div className="dashboard-kpi-card dashboard-kpi-items">
            <div className="title">Total Entries</div>
            <div className="value">{salesSummary?.totalEntries || 0}</div>
            <div className="dashboard-kpi-foot">Recorded sales rows</div>
          </div>

          <div className="dashboard-kpi-card dashboard-kpi-in">
            <div className="title">Total Qty (KG)</div>
            <div className="value">{(salesSummary?.totalKg || 0).toFixed(3)} KG</div>
            <div className="dashboard-meter"><span style={{ width: '100%' }} /></div>
            {salesSummary?.missingConversions ? (
              <div className="dashboard-kpi-foot">
                {salesSummary.missingConversions} entries missing conversion
              </div>
            ) : null}
          </div>

          <div className="dashboard-kpi-card dashboard-kpi-out">
            <div className="title">Active Parties</div>
            <div className="value">{salesSummary?.parties || 0}</div>
            <div className="dashboard-meter"><span style={{ width: '100%' }} /></div>
          </div>

          <div className="dashboard-kpi-card dashboard-kpi-net">
            <div className="title">Items Sold</div>
            <div className="value">{salesSummary?.items || 0}</div>
            <div className="dashboard-kpi-foot">{salesSummary?.totalEntries || 0} entries</div>
          </div>
        </div>
      )}

      <div className="dashboard-status-grid">
        <div className="card daybook-status-card dashboard-daybook-upload">
          <div className="title">Daybook Upload Status (Upto Today)</div>
          <div className="daybook-status-values">
            <div className="daybook-chip daybook-chip-uploaded">
              Uploaded: <strong>{daybookStatus.uploadedCount}</strong>
            </div>
            <div className="daybook-chip daybook-chip-missing">
              Not Uploaded: <strong>{daybookStatus.notUploadedCount}</strong>
            </div>
          </div>
          <div className="dashboard-meter dashboard-meter-lg">
            <span style={{ width: `${daybookStatus.uploadCoveragePct}%` }} />
          </div>
          <div className="daybook-last-upload">
            Coverage: {daybookStatus.uploadCoveragePct}% | Last Uploaded Date: {daybookStatus.lastUploadedDate || 'No uploads yet'}
          </div>
        </div>

        <div className="card daybook-status-card dashboard-daybook-check">
          <div className="title">Daybook Checked Status (Uploaded Files)</div>
          <div className="daybook-status-values">
            <div className="daybook-chip daybook-chip-uploaded">
              Checked: <strong>{checkedFilesCount}</strong>
            </div>
            <div className="daybook-chip daybook-chip-missing">
              Not Checked: <strong>{notCheckedFilesCount}</strong>
            </div>
          </div>
          <div className="dashboard-meter dashboard-meter-lg">
            <span style={{ width: `${checkedPct}%` }} />
          </div>
          <div className="daybook-last-upload">
            Checked Ratio: {checkedPct}% | Total Uploaded Files: {uploadedFilesToDate.length}
          </div>
        </div>

        <div className="card daybook-status-card dashboard-daily-chart-upload">
          <div className="title">Daily Chart Upload Status (Upto Today)</div>
          <div className="daybook-status-values">
            <div className="daybook-chip daybook-chip-uploaded">
              Uploaded: <strong>{dailyChartStatus.uploadedCount}</strong>
            </div>
            <div className="daybook-chip daybook-chip-missing">
              Not Uploaded: <strong>{dailyChartStatus.notUploadedCount}</strong>
            </div>
          </div>
          <div className="dashboard-meter dashboard-meter-lg">
            <span style={{ width: `${dailyChartStatus.uploadCoveragePct}%` }} />
          </div>
          <div className="daybook-last-upload">
            Coverage: {dailyChartStatus.uploadCoveragePct}% | Last Uploaded Date: {dailyChartStatus.lastUploadedDate || 'No uploads yet'}
          </div>
        </div>

        {!stockEnabled && (
          <div className="card dashboard-recent-card">
            <div className="title">Recent Sales</div>
            {salesSummary?.recent?.length ? (
              <div className="dashboard-recent-list">
                {salesSummary.recent.map((entry, index) => {
                  const display = getDisplayQty(entry)
                  return (
                    <div key={`${entry.id || index}-${entry.date || ''}`} className="dashboard-recent-item">
                      <div>
                        <strong>{entry.item || 'Item'}</strong>
                        <span>
                          {entry.date || '—'} · {entry.soldTo || '—'}
                        </span>
                      </div>
                      <div className="dashboard-recent-badge out">
                        {display.qty} {display.unit}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="dashboard-empty">No sales entries yet.</div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
