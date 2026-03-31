import React, { useEffect, useMemo, useState } from 'react'

export default function CompanyHub({
  companies,
  onSelectCompany,
  currentUser,
  onOpenUsers,
  onExportAllBackup,
  backupStatus,
  backupError,
  backupBusy
}) {
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin'
  const displayName = currentUser?.name || currentUser?.id || 'User'
  const roleLabel = isAdmin ? 'Administrator' : 'Staff'
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const todayLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  const timeLabel = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  const companyCards = useMemo(
    () =>
      (companies || []).map((company) => {
        const modules = company.stockEnabled
          ? ['Dashboard', 'Stock Entry', 'Stock Report', 'Item Master', 'Daily Transactions', 'Daybook', 'Daily Chart', 'Backup']
          : ['Dashboard', 'Sales Entry', 'Party Menu', 'Item Wise Report', 'Item Master', 'Daybook', 'Daily Chart', 'Backup']
        const summary = company.stockEnabled
          ? 'Full stock workflow with daily operations and reporting.'
          : 'Lightweight workspace for same-day sales tracking and reporting.'

        return {
          ...company,
          modules,
          summary
        }
      }),
    [companies]
  )

  const handleOpenCompany = (companyId) => {
    if (!companyId) return
    onSelectCompany(companyId)
  }

  return (
    <section className="page company-hub-page">
      <div className="company-hub-hero">
        <div className="company-hub-hero-text">
          <span className="company-hub-eyebrow">Welcome back, {displayName}</span>
          <h1>Company Hub</h1>
          <p>Select a company workspace. Each company keeps its data isolated locally.</p>
          <div className="company-hub-meta">
            <span className="company-hub-meta-chip">{roleLabel}</span>
            <span className="company-hub-meta-chip">{todayLabel}</span>
            <span className="company-hub-meta-chip">{timeLabel}</span>
          </div>
        </div>
        <div className="company-hub-hero-card">
          <div className="company-hub-hero-card-title">Quick Actions</div>
          <div className="company-hub-hero-actions">
            {companyCards.map((company) => (
              <button
                key={company.id}
                className="company-quick-btn"
                onClick={() => handleOpenCompany(company.id)}
              >
                Open {company.name}
              </button>
            ))}
          </div>
          <div className="company-hub-hero-footnote">
            Logged in as <strong>{displayName}</strong> ({roleLabel})
          </div>
        </div>
      </div>

      <div className="company-hub-grid">
        {companyCards.map((company) => (
          <article key={company.id} className={`company-card ${company.stockEnabled ? 'company-card-full' : 'company-card-lite'}`}>
            <div className="company-card-header">
              <div>
                <h3>{company.name}</h3>
                <p>{company.summary}</p>
              </div>
              <span className={`company-chip ${company.stockEnabled ? 'chip-full' : 'chip-lite'}`}>
                {company.stockEnabled ? 'Full Stock' : 'Lite Mode'}
              </span>
            </div>

            <div className="company-card-modules">
              {company.modules.map((mod) => (
                <span key={`${company.id}-${mod}`} className="company-module-chip">
                  {mod}
                </span>
              ))}
            </div>

            <div className="company-card-actions">
              <button className="company-open-btn" onClick={() => handleOpenCompany(company.id)}>
                Open Workspace
              </button>
              <button
                className="company-secondary-btn"
                onClick={() => handleOpenCompany(company.id)}
              >
                View Dashboard
              </button>
            </div>
          </article>
        ))}
      </div>

      {isAdmin && (
        <div className="company-admin-panel">
          <div>
            <h3>Admin Tools</h3>
            <p>User Management is shared across all companies.</p>
          </div>
          <button className="company-users-btn" onClick={onOpenUsers}>
            Open User Management
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="company-admin-panel company-backup-panel">
          <div>
            <h3>Manual Backup</h3>
            <p>Save local backups for all three companies.</p>
          </div>
          <div className="company-backup-actions">
            <button
              className="company-users-btn"
              onClick={onExportAllBackup}
              disabled={backupBusy}
            >
              Backup All Companies
            </button>
          </div>
          {backupStatus && <div className="company-backup-status">{backupStatus}</div>}
          {backupError && <div className="company-backup-error">{backupError}</div>}
        </div>
      )}
    </section>
  )
}
