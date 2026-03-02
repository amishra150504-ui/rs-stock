import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import StockEntry from './components/StockEntry.jsx'
import StockReport from './components/StockReport.jsx'
import ItemMaster from './components/ItemMaster.jsx'
import DailyTransactions from './components/DailyTransactions.jsx'
import Backup from './components/Backup.jsx'
import Login from './components/Login.jsx'
import UserManagement from './components/UserManagement.jsx'
import { db, firebaseReady, missingFirebaseEnv } from './firebaseClient'

export const ROD_CONVERSIONS = {
  '5.5': 2.24,
  '6': 2.67,
  '8': 4.74,
  '10': 7.4,
  '12': 10.65,
  '16': 18.96,
  '20': 29.6
}

const APP_STATE_ID = 'global'

const DEFAULT_ITEMS = Object.entries(ROD_CONVERSIONS).map(([size, conv]) => ({
  name: `${size}mm Rod`,
  category: 'Rod',
  conversion: conv,
  minStock: 100,
  minStockUnit: 'kg'
}))

const DEFAULT_CATEGORIES = ['Rod', 'Cement']

const DEFAULT_USERS = [
  {
    id: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Administrator',
    gender: '',
    phone: '',
    email: '',
    address: ''
  },
  {
    id: 'staff1',
    password: 'staff123',
    role: 'staff',
    name: 'Staff One',
    gender: '',
    phone: '',
    email: '',
    address: ''
  }
]

const normalizeArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback)
const parseJsonSafe = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const getLegacyStateFromLocal = () => {
  const legacyItems = parseJsonSafe(localStorage.getItem('rs_items'), [])
  const legacyEntries = parseJsonSafe(localStorage.getItem('rs_entries'), [])
  const legacyDailyEntries = parseJsonSafe(localStorage.getItem('rs_daily_entries'), [])
  const legacyCategories = parseJsonSafe(localStorage.getItem('rs_categories'), [])
  const legacyCounter = Number(localStorage.getItem('rs_entry_counter') || 1)

  const hasLegacyData =
    legacyItems.length > 0 ||
    legacyEntries.length > 0 ||
    legacyDailyEntries.length > 0 ||
    legacyCategories.length > 0

  if (!hasLegacyData) return null

  return {
    items: normalizeArray(legacyItems, DEFAULT_ITEMS),
    entries: normalizeArray(legacyEntries, []),
    dailyEntries: normalizeArray(legacyDailyEntries, []),
    categories: normalizeArray(legacyCategories, DEFAULT_CATEGORIES),
    entryCounter: Number.isFinite(legacyCounter) && legacyCounter > 0 ? legacyCounter : 1,
    updatedAt: new Date().toISOString()
  }
}

const getLegacyUsersFromLocal = () => {
  const legacyUsers = parseJsonSafe(localStorage.getItem('rs_users'), [])
  if (!Array.isArray(legacyUsers) || legacyUsers.length === 0) return null
  return legacyUsers
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 900)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rs_current_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [items, setItems] = useState([])
  const [entries, setEntries] = useState([])
  const [dailyEntries, setDailyEntries] = useState([])
  const [categories, setCategories] = useState([])
  const [entryCounter, setEntryCounter] = useState(1)
  const [users, setUsers] = useState([])

  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState('')
  const [migrationNotice, setMigrationNotice] = useState('')

  const appStateRef = useRef({
    items: [],
    entries: [],
    dailyEntries: [],
    categories: [],
    entryCounter: 1
  })
  const usersRef = useRef([])

  useEffect(() => {
    appStateRef.current = {
      items,
      entries,
      dailyEntries,
      categories,
      entryCounter
    }
  }, [items, entries, dailyEntries, categories, entryCounter])

  useEffect(() => {
    usersRef.current = users
  }, [users])

  const applyAppState = useCallback((data) => {
    const normalizedItems = normalizeArray(data?.items, DEFAULT_ITEMS).map((item) => ({
      ...item,
      minStockUnit: item?.minStockUnit === 'pcs' ? 'pcs' : 'kg'
    }))
    setItems(normalizedItems)
    setEntries(normalizeArray(data?.entries, []))
    setDailyEntries(normalizeArray(data?.dailyEntries, []))
    setCategories(normalizeArray(data?.categories, DEFAULT_CATEGORIES))
    setEntryCounter(Number(data?.entryCounter || 1))
  }, [])

  useEffect(() => {
    if (!firebaseReady) {
      setSyncError(`Firebase setup missing: ${missingFirebaseEnv.join(', ')}`)
      setLoading(false)
      return
    }

    const appStateRefDoc = doc(db, 'app_state', APP_STATE_ID)
    const usersCollectionRef = collection(db, 'users')

    const unsubState = onSnapshot(
      appStateRefDoc,
      async (snapshot) => {
        setSyncError('')
        if (!snapshot.exists()) {
          const legacyState = getLegacyStateFromLocal()
          const seed = legacyState || {
            items: DEFAULT_ITEMS,
            entries: [],
            dailyEntries: [],
            categories: DEFAULT_CATEGORIES,
            entryCounter: 1,
            updatedAt: new Date().toISOString()
          }
          await setDoc(appStateRefDoc, seed)
          applyAppState(seed)
          if (legacyState) {
            setMigrationNotice('Legacy stock data migrated to cloud.')
          }
        } else {
          applyAppState(snapshot.data())
        }
        setLoading(false)
      },
      (err) => {
        console.error('App state sync error:', err)
        setSyncError(`Cloud sync failed (${err.message || 'unknown error'})`)
        setLoading(false)
      }
    )

    const unsubUsers = onSnapshot(
      usersCollectionRef,
      async (snapshot) => {
        const cloudUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

        if (cloudUsers.length === 0) {
          const legacyUsers = getLegacyUsersFromLocal()
          const initialUsers = legacyUsers || DEFAULT_USERS
          await Promise.all(
            initialUsers.map((u) => setDoc(doc(db, 'users', u.id), u, { merge: true }))
          )
          if (legacyUsers) {
            setMigrationNotice((prev) =>
              prev ? `${prev} Legacy users migrated to cloud.` : 'Legacy users migrated to cloud.'
            )
          }
          return
        }

        setUsers(cloudUsers.sort((a, b) => a.id.localeCompare(b.id)))
      },
      (err) => {
        console.error('Users sync error:', err)
        setSyncError(`Users sync failed (${err.message || 'unknown error'})`)
      }
    )

    return () => {
      unsubState()
      unsubUsers()
    }
  }, [applyAppState])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('rs_current_user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('rs_current_user')
    }
  }, [currentUser])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 900) setSidebarOpen(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const saveAppState = useCallback(async (patch) => {
    if (!firebaseReady) return

    const next = { ...appStateRef.current, ...patch }
    appStateRef.current = next

    try {
      await setDoc(
        doc(db, 'app_state', APP_STATE_ID),
        {
          items: next.items,
          entries: next.entries,
          dailyEntries: next.dailyEntries,
          categories: next.categories,
          entryCounter: next.entryCounter,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      )
      setSyncError('')
    } catch (err) {
      console.error('Cloud save failed:', err)
      setSyncError(`Save failed (${err.message || 'unknown error'})`)
    }
  }, [])

  const setItemsCloud = useCallback(
    (updater) => {
      setItems((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ items: next })
        return next
      })
    },
    [saveAppState]
  )

  const setEntriesCloud = useCallback(
    (updater) => {
      setEntries((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ entries: next })
        return next
      })
    },
    [saveAppState]
  )

  const setDailyEntriesCloud = useCallback(
    (updater) => {
      setDailyEntries((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ dailyEntries: next })
        return next
      })
    },
    [saveAppState]
  )

  const setCategoriesCloud = useCallback(
    (updater) => {
      setCategories((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ categories: next })
        return next
      })
    },
    [saveAppState]
  )

  const setEntryCounterCloud = useCallback(
    (updater) => {
      setEntryCounter((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ entryCounter: next })
        return next
      })
    },
    [saveAppState]
  )

  const setUsersCloud = useCallback((updater) => {
    if (!firebaseReady) return

    const prevUsers = usersRef.current
    const nextUsers = typeof updater === 'function' ? updater(prevUsers) : updater

    setUsers(nextUsers)
    usersRef.current = nextUsers

    void (async () => {
      try {
        const removedIds = prevUsers
          .filter((u) => !nextUsers.some((n) => n.id === u.id))
          .map((u) => u.id)

        if (removedIds.length) {
          await Promise.all(removedIds.map((id) => deleteDoc(doc(db, 'users', id))))
        }

        await Promise.all(
          nextUsers.map((u) => {
            const payload = { ...u }
            delete payload.id
            return setDoc(doc(db, 'users', u.id), payload, { merge: true })
          })
        )

        setSyncError('')
      } catch (err) {
        console.error('Users save failed:', err)
        setSyncError(`User save failed (${err.message || 'unknown error'})`)
      }
    })()
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

  const profileInitial = currentUser
    ? (currentUser.name || currentUser.id || 'U').trim().charAt(0).toUpperCase()
    : ''

  return (
    <div className="app">
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        currentUser={currentUser}
      />
      <header className="topbar">
        <button className="hamburger" onClick={() => setSidebarOpen((s) => !s)}>
          Menu
        </button>
        <div className="brand">RS Stock</div>
        <div className="topbar-right" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {migrationNotice && (
            <span style={{ color: '#166534', fontSize: 12, fontWeight: 600 }}>{migrationNotice}</span>
          )}
          {syncError && (
            <span style={{ color: '#b91c1c', fontSize: 12, fontWeight: 600 }}>{syncError}</span>
          )}
          {currentUser && (
            <>
              <div className="profile-icon" title={currentUser.name || currentUser.id} aria-label="User profile">
                {profileInitial}
              </div>
              <div style={{ color: '#0f172a', fontWeight: 600 }}>{currentUser.name || currentUser.id}</div>
              <button
                onClick={() => setCurrentUser(null)}
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8 }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      <main className="main">
        {loading ? (
          <div style={{ maxWidth: 540, margin: '40px auto', fontWeight: 600 }}>
            Connecting to cloud data...
          </div>
        ) : !firebaseReady ? (
          <div style={{ maxWidth: 680, margin: '40px auto', background: '#fff', padding: 20, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0, color: '#b91c1c' }}>Firebase Setup Required</h3>
            <p style={{ marginBottom: 8 }}>
              Add Firebase config values in your <code>.env</code> file.
            </p>
            <p style={{ margin: 0 }}>
              Missing: <code>{missingFirebaseEnv.join(', ')}</code>
            </p>
          </div>
        ) : !currentUser ? (
          <div style={{ maxWidth: 540, margin: '40px auto' }}>
            <Login setCurrentUser={setCurrentUser} />
          </div>
        ) : (
          <>
            {page === 'dashboard' && (
              <Dashboard
                entries={entries}
                calculateStock={calculateStock}
                items={items}
                currentUser={currentUser}
              />
            )}
            {page === 'stock' && (
              <StockEntry
                entries={entries}
                setEntries={setEntriesCloud}
                items={items}
                dailyEntries={dailyEntries}
                setDailyEntries={setDailyEntriesCloud}
                currentUser={currentUser}
                entryCounter={entryCounter}
                setEntryCounter={setEntryCounterCloud}
              />
            )}
            {page === 'report' && (
              <StockReport
                entries={entries}
                calculateStock={calculateStock}
                items={items}
                currentUser={currentUser}
              />
            )}
            {page === 'item' && (
              <ItemMaster
                items={items}
                setItems={setItemsCloud}
                entries={entries}
                setEntries={setEntriesCloud}
                currentUser={currentUser}
                categories={categories}
                setCategories={setCategoriesCloud}
              />
            )}
            {page === 'daily' && (
              <DailyTransactions
                dailyEntries={dailyEntries}
                setDailyEntries={setDailyEntriesCloud}
                entries={entries}
                setEntries={setEntriesCloud}
                currentUser={currentUser}
                items={items}
              />
            )}
            {page === 'backup' && (
              <Backup
                items={items}
                entries={entries}
                dailyEntries={dailyEntries}
                categories={categories}
                entryCounter={entryCounter}
                users={users}
                setItems={setItemsCloud}
                setEntries={setEntriesCloud}
                setDailyEntries={setDailyEntriesCloud}
                setCategories={setCategoriesCloud}
                setEntryCounter={setEntryCounterCloud}
                setUsers={setUsersCloud}
              />
            )}
            {page === 'users' && (
              <UserManagement users={users} setUsers={setUsersCloud} currentUser={currentUser} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
