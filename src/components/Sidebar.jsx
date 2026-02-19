import React from 'react'

export default function Sidebar({ page, setPage, open, setOpen, currentUser }) {
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
    <aside className={`sidebar ${open? 'open':''}`}>
      <div className="logo">RS Stock</div>
      <nav>
        {navItem('dashboard','Dashboard')}
        {navItem('stock','Stock Entry')}
        {navItem('report','Stock Report')}
        {navItem('item','Item Master')}
        {navItem('daily','Daily Transactions')}
        {navItem('backup','Backup')}
        {currentUser?.role==='admin' && navItem('users','User Management')}
      </nav>
    </aside>
  )
}
