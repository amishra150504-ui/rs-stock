import React from 'react'

export default function Sidebar({ page, setPage, open, setOpen, company, isDistributorWorkspace }) {
  const stockEnabled = Boolean(company?.stockEnabled)

  const navItem = (key, label) => (
    <button
      className={`nav-item ${page===key? 'active':''}`}
      onClick={() => { setPage(key); setOpen(false); }}
      title={label}
    >
      <span className="nav-label">{label}</span>
    </button>
  )

  return (
    <aside className={`sidebar sidebar-overlay ${open? 'open':''}`}>
      <div className="logo">{company?.name || 'RS TRADERS'}</div>
      <nav>
        {isDistributorWorkspace && (
          <div className="nav-group">
            <div className="nav-group-title">Company</div>
            {navItem('distributorCompanies','Distributor')}
            {navItem('sellingParties','Parties')}
          </div>
        )}
        {navItem('dashboard','Dashboard')}
        {stockEnabled ? (
          <>
            {navItem('stock','Stock Entry')}
            {navItem('report','Stock Report')}
            {navItem('item','Item Master')}
            {navItem('daily','Daily Transactions')}
          </>
        ) : (
          <>
            {navItem('sales','Sales Entry')}
            {navItem('salesreport','Party Menu')}
            {navItem('salesitemreport','Item Wise Report')}
            {navItem('item','Item Master')}
          </>
        )}
        {navItem('daybook','Daybook Upload')}
        {navItem('dailychart','Daily Chart')}
        {navItem('backup','Backup')}
      </nav>
    </aside>
  )
}
