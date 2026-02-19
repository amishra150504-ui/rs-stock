import React, { useState, useEffect, useMemo } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import StockEntry from './components/StockEntry.jsx'
import StockReport from './components/StockReport.jsx'
import ItemMaster from './components/ItemMaster.jsx'
import DailyTransactions from './components/DailyTransactions.jsx'
import Backup from './components/Backup.jsx'
import Login from './components/Login.jsx'
import UserManagement from './components/UserManagement.jsx'

export const ROD_CONVERSIONS = {
  '5.5': 2.24,
  '6': 2.67,
  '8': 4.74,
  '10': 7.40,
  '12': 10.65,
  '16': 18.96,
  '20': 29.60
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 900)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rs_current_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('rs_items')
    if (saved) return JSON.parse(saved)
    // default Rod items
    return Object.entries(ROD_CONVERSIONS).map(([size, conv]) => ({
      name: `${size}mm Rod`,
      category: 'Rod',
      conversion: conv,
      minStock: 100
    }))
  })

  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('rs_entries')
    return saved ? JSON.parse(saved) : []
  })

  const [dailyEntries, setDailyEntries] = useState(() => {
    const saved = localStorage.getItem('rs_daily_entries')
    return saved ? JSON.parse(saved) : []
  })

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('rs_categories')
    if (saved) return JSON.parse(saved)
    return ['Rod', 'Cement']
  })

  useEffect(() => localStorage.setItem('rs_items', JSON.stringify(items)), [items])
  useEffect(() => localStorage.setItem('rs_categories', JSON.stringify(categories)), [categories])
  useEffect(() => localStorage.setItem('rs_entries', JSON.stringify(entries)), [entries])
  useEffect(() => localStorage.setItem('rs_daily_entries', JSON.stringify(dailyEntries)), [dailyEntries])
  useEffect(() => { if (currentUser) localStorage.setItem('rs_current_user', JSON.stringify(currentUser)); else localStorage.removeItem('rs_current_user') }, [currentUser])

  // ensure default users exist
  useEffect(() => {
    const saved = localStorage.getItem('rs_users')
    if (!saved) {
      const defaultUsers = [
        { id: 'admin', password: 'admin123', role: 'admin', name: 'Administrator', gender: '', phone: '', email: '', address: '' },
        { id: 'staff1', password: 'staff123', role: 'staff', name: 'Staff One', gender: '', phone: '', email: '', address: '' }
      ]
      localStorage.setItem('rs_users', JSON.stringify(defaultUsers))
    }
  }, [])

    // responsive sidebar on resize
    useEffect(() => {
      const onResize = () => {
        if (window.innerWidth >= 900) setSidebarOpen(true)
      }
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }, [])

  const calculateStock = useMemo(() => {
    return () => {
      const map = {}
      entries.forEach((e) => {
        const key = e.item
        if (!map[key]) map[key] = { inKg: 0, outKg: 0, inPcs: 0, outPcs: 0 }
        if (e.type === 'Stock In') {
          map[key].inKg += Number(e.kg || 0)
          map[key].inPcs += Number(e.pcs || 0)
        } else {
          map[key].outKg += Number(e.kg || 0)
          map[key].outPcs += Number(e.pcs || 0)
        }
      })
      return map
    }
  }, [entries])

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} currentUser={currentUser} />
      <header className="topbar">
        <button className="hamburger" onClick={()=>setSidebarOpen(s=>!s)}>☰</button>
        <div className="brand">RS Stock</div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
          {currentUser && (
            <>
              <div style={{color:'#0f172a',fontWeight:600}}>{currentUser.name || currentUser.id}</div>
              <button onClick={() => setCurrentUser(null)} style={{background:'#ef4444',color:'#fff',border:'none',padding:'8px 10px',borderRadius:8}}>Logout</button>
            </>
          )}
        </div>
      </header>
      <main className="main">
        {!currentUser ? (
          <div style={{maxWidth:540,margin:'40px auto'}}>
            <Login setCurrentUser={setCurrentUser} />
          </div>
        ) : (
          <>
          {page === 'dashboard' && (
            <Dashboard entries={entries} calculateStock={calculateStock} items={items} currentUser={currentUser} />
          )}
          {page === 'stock' && (
            <StockEntry entries={entries} setEntries={setEntries} items={items} dailyEntries={dailyEntries} setDailyEntries={setDailyEntries} currentUser={currentUser} />
          )}
          {page === 'report' && (
            <StockReport entries={entries} calculateStock={calculateStock} items={items} currentUser={currentUser} />
          )}
          {page === 'item' && (
            <ItemMaster items={items} setItems={setItems} entries={entries} setEntries={setEntries} currentUser={currentUser} categories={categories} setCategories={setCategories} />
          )}
          {page === 'daily' && (
            <DailyTransactions dailyEntries={dailyEntries} setDailyEntries={setDailyEntries} currentUser={currentUser} />
          )}
          {page === 'backup' && (
            <Backup items={items} entries={entries} setItems={setItems} setEntries={setEntries} />
          )}
          {page === 'users' && (
            <UserManagement />
          )}
        </>
        )}
      </main>
    </div>
  )
}
