import React, { useMemo, useState } from 'react'
import { readCompanyState, readUsersState, writeCompanyState, writeUsersState } from '../utils/localStore'

export default function Backup({
  items,
  entries,
  dailyEntries,
  categories,
  entryCounter,
  purchaseParties = [],
  saleParties = [],
  distributorCompanies = [],
  sellingParties = [],
  users,
  daybookUploads,
  dailyChartUploads,
  setItems,
  setEntries,
  setDailyEntries,
  setCategories,
  setEntryCounter,
  setPurchaseParties,
  setSaleParties,
  setDistributorCompanies,
  setSellingParties,
  setUsers,
  setDaybookUploads,
  setDailyChartUploads,
  companyIds = [],
  activeCompanyId = ''
}) {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [status, setStatus] = useState('')

  const stats = useMemo(
    () => [
      { label: 'Items', value: items.length },
      { label: 'Entries', value: entries.length },
      { label: 'Daily', value: dailyEntries.length },
      { label: 'Purchase Parties', value: purchaseParties.length },
      { label: 'Sale Parties', value: saleParties.length },
      { label: 'Distributor Companies', value: distributorCompanies.length },
      { label: 'Selling Parties', value: sellingParties.length },
      { label: 'Users', value: users.length },
      { label: 'Daybook', value: daybookUploads.length },
      { label: 'Daily Chart', value: dailyChartUploads.length }
    ],
    [
      items.length,
      entries.length,
      dailyEntries.length,
      purchaseParties.length,
      saleParties.length,
      distributorCompanies.length,
      sellingParties.length,
      users.length,
      daybookUploads.length,
      dailyChartUploads.length
    ]
  )

  const exportBackup = () => {
    const data = {
      items,
      entries,
      dailyEntries,
      categories,
      entryCounter,
      purchaseParties,
      saleParties,
      distributorCompanies,
      sellingParties,
      users,
      daybookUploads,
      dailyChartUploads,
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

  const exportAllCompanies = async () => {
    try {
      const ids = Array.isArray(companyIds) ? companyIds.filter(Boolean) : []
      if (!ids.length) {
        alert('No companies configured for export')
        return
      }

      setStatus('Preparing all-companies backup...')

      const companies = {}
      for (const id of ids) {
        const stored = await readCompanyState(id)
        const data = stored && !stored.error ? stored : null
        companies[id] = data
      }

      const usersState = await readUsersState()
      const usersList = Array.isArray(usersState?.users) ? usersState.users : Array.isArray(usersState) ? usersState : users

      const payload = {
        kind: 'rs-stock-backup-all',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        companies,
        users: usersList
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rs-stock-backup-all-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('All-companies backup exported successfully.')
    } catch (err) {
      console.error('Export all-companies backup failed:', err)
      setStatus(`Export failed (${err.message || 'unknown error'})`)
      alert(`Export failed: ${err.message || 'unknown error'}`)
    }
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

        if (!window.confirm('Restore backup and overwrite current local data?')) return

        setItems(d.items)
        setEntries(d.entries)

        if (Array.isArray(d.dailyEntries)) setDailyEntries(d.dailyEntries)
        if (Array.isArray(d.categories)) setCategories(d.categories)
        if (Number.isFinite(Number(d.entryCounter))) setEntryCounter(Number(d.entryCounter))
        if (Array.isArray(d.purchaseParties) && setPurchaseParties) setPurchaseParties(d.purchaseParties)
        if (Array.isArray(d.saleParties) && setSaleParties) setSaleParties(d.saleParties)
        if (Array.isArray(d.distributorCompanies) && setDistributorCompanies) setDistributorCompanies(d.distributorCompanies)
        if (Array.isArray(d.sellingParties) && setSellingParties) setSellingParties(d.sellingParties)
        if (Array.isArray(d.users)) setUsers(d.users)
        if (Array.isArray(d.daybookUploads)) setDaybookUploads(d.daybookUploads)
        if (Array.isArray(d.dailyChartUploads)) setDailyChartUploads(d.dailyChartUploads)

        setStatus('Backup restored and saved locally.')
        alert('Backup restored and saved locally')
      } catch {
        setStatus('Invalid backup file.')
        alert('Invalid backup file')
      }
    }
    r.readAsText(f)
  }

  const importAllCompaniesBackup = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setSelectedFileName(f.name)
    const r = new FileReader()
    r.onload = async (ev) => {
      try {
        const d = JSON.parse(ev.target.result)
        if (d?.kind !== 'rs-stock-backup-all' || typeof d?.companies !== 'object' || !d.companies) {
          alert('Invalid all-companies backup file')
          return
        }

        if (!window.confirm('Restore ALL companies backup and overwrite current local data?')) return

        const ids = Array.isArray(companyIds) ? companyIds.filter(Boolean) : Object.keys(d.companies || {})
        for (const id of ids) {
          if (!Object.prototype.hasOwnProperty.call(d.companies, id)) continue
          const companyData = d.companies[id]
          if (companyData && typeof companyData === 'object') {
            await writeCompanyState(id, companyData)
          }
        }

        if (Array.isArray(d.users)) {
          await writeUsersState({ schemaVersion: 1, users: d.users })
          setUsers(d.users)
        }

        const active = activeCompanyId && d.companies[activeCompanyId] ? d.companies[activeCompanyId] : null
        if (active) {
          if (Array.isArray(active.items)) setItems(active.items)
          if (Array.isArray(active.entries)) setEntries(active.entries)
          if (Array.isArray(active.dailyEntries)) setDailyEntries(active.dailyEntries)
          if (Array.isArray(active.categories)) setCategories(active.categories)
          if (Number.isFinite(Number(active.entryCounter))) setEntryCounter(Number(active.entryCounter))
          if (Array.isArray(active.purchaseParties) && setPurchaseParties) setPurchaseParties(active.purchaseParties)
          if (Array.isArray(active.saleParties) && setSaleParties) setSaleParties(active.saleParties)
          if (Array.isArray(active.distributorCompanies) && setDistributorCompanies) setDistributorCompanies(active.distributorCompanies)
          if (Array.isArray(active.sellingParties) && setSellingParties) setSellingParties(active.sellingParties)
          if (Array.isArray(active.daybookUploads)) setDaybookUploads(active.daybookUploads)
          if (Array.isArray(active.dailyChartUploads)) setDailyChartUploads(active.dailyChartUploads)
        }

        setStatus('All-companies backup restored and saved locally.')
        alert('All-companies backup restored and saved locally')
      } catch (err) {
        console.error('Import all-companies backup failed:', err)
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

          <button onClick={exportAllCompanies} className="backup-export-btn" type="button">
            Export ALL Companies
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

          <label className="backup-file-label">
            <input
              type="file"
              accept="application/json"
              onChange={importAllCompaniesBackup}
              className="backup-file-input"
            />
            <span>Import ALL Companies</span>
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
