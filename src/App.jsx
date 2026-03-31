import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import StockEntry from './components/StockEntry.jsx'
import StockReport from './components/StockReport.jsx'
import ItemMaster from './components/ItemMaster.jsx'
import DailyTransactions from './components/DailyTransactions.jsx'
import SalesEntry from './components/SalesEntry.jsx'
import SalesReport from './components/SalesReport.jsx'
import LaxmiItemReport from './components/LaxmiItemReport.jsx'
import Backup from './components/Backup.jsx'
import Login from './components/Login.jsx'
import UserManagement from './components/UserManagement.jsx'
import DaybookUpload from './components/DaybookUpload.jsx'
import DailyChartUpload from './components/DailyChartUpload.jsx'
import CompanyHub from './components/CompanyHub.jsx'
import { mergeEntries, buildStockMap } from './utils/stockBalance'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  readCompanyState,
  writeCompanyState,
  readUsersState,
  writeUsersState,
  saveBackupFile,
  saveReportFile
} from './utils/localStore'

export const ROD_CONVERSIONS = {
  '5.5': 2.24,
  '6': 2.67,
  '8': 4.74,
  '10': 7.4,
  '12': 10.65,
  '16': 18.96,
  '20': 29.6
}

const COMPANIES = [
  { id: 'rs_traders', name: 'RS TRADERS', stateDocId: 'global', stockEnabled: true },
  { id: 'la_counter', name: 'LA COUNTER', stateDocId: 'la_counter', stockEnabled: true },
  { id: 'laxmi_agency', name: 'LAXMI AGENCY', stateDocId: 'laxmi_agency', stockEnabled: false }
]

const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map((company) => [company.id, company]))
const STOCK_PAGES = new Set(['stock', 'report', 'daily'])
const SHARED_PAGES = new Set(['item'])
const SALES_PAGES = new Set(['sales', 'salesreport'])

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

const readStoredUser = () => {
  try {
    const sessionValue = sessionStorage.getItem('rs_current_user')
    if (sessionValue) return JSON.parse(sessionValue)
    const localValue = localStorage.getItem('rs_current_user')
    if (localValue) {
      sessionStorage.setItem('rs_current_user', localValue)
      localStorage.removeItem('rs_current_user')
      return JSON.parse(localValue)
    }
  } catch {
    return null
  }
  return null
}

const STORAGE_VERSION = 1

const makeSeedState = (company) => ({
  schemaVersion: STORAGE_VERSION,
  companyId: company.id,
  items: company.stockEnabled ? DEFAULT_ITEMS : [],
  entries: [],
  dailyEntries: [],
  categories: company.stockEnabled ? DEFAULT_CATEGORIES : [],
  daybookUploads: [],
  dailyChartUploads: [],
  purchaseParties: [],
  saleParties: [],
  entryCounter: 1,
  updatedAt: new Date().toISOString()
})

export default function App() {
  const [page, setPage] = useState('companies')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => readStoredUser())
  const [currentCompanyId, setCurrentCompanyId] = useState('')
  const buildInfo = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : null
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)

  const [items, setItems] = useState([])
  const [entries, setEntries] = useState([])
  const [dailyEntries, setDailyEntries] = useState([])
  const [categories, setCategories] = useState([])
  const [daybookUploads, setDaybookUploads] = useState([])
  const [dailyChartUploads, setDailyChartUploads] = useState([])
  const [entryCounter, setEntryCounter] = useState(1)
  const [purchaseParties, setPurchaseParties] = useState([])
  const [saleParties, setSaleParties] = useState([])
  const [users, setUsers] = useState(DEFAULT_USERS)
  const [usersLoaded, setUsersLoaded] = useState(false)

  const [loading, setLoading] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [topbarTime, setTopbarTime] = useState('')
  const [globalBackupStatus, setGlobalBackupStatus] = useState('')
  const [globalBackupError, setGlobalBackupError] = useState('')
  const [globalBackupBusy, setGlobalBackupBusy] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportBusy, setExportBusy] = useState(false)

  const appStateRef = useRef({
    items: [],
    entries: [],
    dailyEntries: [],
    categories: [],
    daybookUploads: [],
    dailyChartUploads: [],
    entryCounter: 1,
    purchaseParties: [],
    saleParties: []
  })
  const usersRef = useRef([])
  const saveTimerRef = useRef(null)

  const company = COMPANY_BY_ID[currentCompanyId] || null
  const isAuthenticated = Boolean(currentUser)
  const isInCompany = isAuthenticated && Boolean(company)
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin'
  const userLabel = currentUser?.name || currentUser?.id || ''
  const userInitial = userLabel.trim().charAt(0).toUpperCase()

  useEffect(() => {
    appStateRef.current = {
      items,
      entries,
      dailyEntries,
      categories,
      daybookUploads,
      dailyChartUploads,
      entryCounter,
      purchaseParties,
      saleParties
    }
  }, [
    items,
    entries,
    dailyEntries,
    categories,
    daybookUploads,
    dailyChartUploads,
    entryCounter,
    purchaseParties,
    saleParties
  ])


  useEffect(() => {
    usersRef.current = users
  }, [users])

  useEffect(() => {
    const protocol = window.location.protocol
    const isWeb = protocol === 'http:' || protocol === 'https:'
    const isFile = protocol === 'file:'
    if (!buildInfo || (!isWeb && !isFile)) return

    let active = true
    const checkForUpdate = async () => {
      try {
        const res = await fetch(`version.json?ts=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const remoteId = data?.buildTime || data?.version
        const currentId = buildInfo?.buildTime || buildInfo?.version
        if (remoteId && currentId && remoteId !== currentId && active) {
          setUpdateAvailable(true)
          setUpdateInfo(data)
        }
      } catch {
        // ignore update check errors
      }
    }

    checkForUpdate()
    const timer = setInterval(checkForUpdate, 60 * 1000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [buildInfo])

  const applyAppState = useCallback((data, activeCompany) => {
    const defaultItems = activeCompany?.stockEnabled ? DEFAULT_ITEMS : []
    const defaultCategories = activeCompany?.stockEnabled ? DEFAULT_CATEGORIES : []
    const normalizedItems = normalizeArray(data?.items, defaultItems).map((item) => ({
      ...item,
      minStockUnit: item?.minStockUnit === 'pcs' ? 'pcs' : 'kg'
    }))
    const normalizedEntries = normalizeArray(data?.entries, [])
    const normalizedDaily = normalizeArray(data?.dailyEntries, [])
    const normalizedPurchaseParties = normalizeArray(data?.purchaseParties, [])
    const normalizedSaleParties = normalizeArray(data?.saleParties, [])
    const maxId = [...normalizedEntries, ...normalizedDaily].reduce((acc, entry) => {
      const id = Number(entry?.id)
      return Number.isFinite(id) && id > acc ? id : acc
    }, 0)
    const rawCounter = Number(data?.entryCounter || 1)
    const nextCounter = Math.max(1, rawCounter, maxId + 1)

    const inferCompanyIdFromRecord = (record) => {
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

      return ''
    }

    const normalizeUploadsForCompany = (uploads, companyId) => {
      const list = normalizeArray(uploads, [])
      let mutated = false
      const cleaned = list.reduce((acc, record) => {
        const explicitCompany = record?.companyId || ''
        const inferred = explicitCompany || inferCompanyIdFromRecord(record)
        if (inferred && inferred !== companyId) {
          mutated = true
          return acc
        }
        const nextCompanyId = inferred || companyId
        if (record?.companyId !== nextCompanyId) mutated = true
        acc.push({ ...record, companyId: nextCompanyId })
        return acc
      }, [])
      return { cleaned, mutated }
    }

    const companyId = activeCompany?.id || ''
    const daybookResult = normalizeUploadsForCompany(data?.daybookUploads, companyId)
    const dailyChartResult = normalizeUploadsForCompany(data?.dailyChartUploads, companyId)

    setItems(normalizedItems)
    setEntries(normalizedEntries)
    setDailyEntries(normalizedDaily)
    setCategories(normalizeArray(data?.categories, defaultCategories))
    setDaybookUploads(daybookResult.cleaned)
    setDailyChartUploads(dailyChartResult.cleaned)
    setEntryCounter(nextCounter)
    setPurchaseParties(normalizedPurchaseParties)
    setSaleParties(normalizedSaleParties)

    return {
      daybookUploads: daybookResult.cleaned,
      dailyChartUploads: dailyChartResult.cleaned,
      mutated: daybookResult.mutated || dailyChartResult.mutated,
      entryCounterNeedsUpdate: nextCounter !== rawCounter,
      entryCounterValue: nextCounter
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadUsers = async () => {
      try {
        const stored = await readUsersState()
        const list = Array.isArray(stored?.users) ? stored.users : Array.isArray(stored) ? stored : null
        if (list && list.length) {
          if (!active) return
          setUsers(list.sort((a, b) => String(a.id).localeCompare(String(b.id))))
        } else if (active) {
          setUsers(DEFAULT_USERS)
        }
        if (active) setUsersLoaded(true)
      } catch (err) {
        console.error('Users load error:', err)
        setSyncError(`Local users load failed (${err.message || 'unknown error'})`)
        if (active) {
          setUsers(DEFAULT_USERS)
          setUsersLoaded(true)
        }
      }
    }
    loadUsers()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!usersLoaded) return
    writeUsersState({ schemaVersion: STORAGE_VERSION, users }).catch((err) => {
      console.error('Users save error:', err)
      setSyncError(`Local users save failed (${err.message || 'unknown error'})`)
    })
  }, [users, usersLoaded])

  useEffect(() => {
    if (!isAuthenticated || !company) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    const loadCompany = async () => {
      try {
        const stored = await readCompanyState(company.id)
        const data = stored && !stored.error ? stored : null
        const next = data && data.items ? data : makeSeedState(company)
        applyAppState(next, company)
        await writeCompanyState(company.id, {
          schemaVersion: STORAGE_VERSION,
          companyId: company.id,
          ...next,
          updatedAt: new Date().toISOString()
        })
        if (active) setSyncError('')
      } catch (err) {
        console.error('Local state load error:', err)
        if (active) setSyncError(`Local data load failed (${err.message || 'unknown error'})`)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadCompany()
    return () => {
      active = false
    }
  }, [applyAppState, isAuthenticated, company?.id])

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('rs_current_user', JSON.stringify(currentUser))
      sessionStorage.removeItem('rs_active_company')
      setCurrentCompanyId('')
      setPage('companies')
    } else {
      sessionStorage.removeItem('rs_current_user')
      sessionStorage.removeItem('rs_active_company')
      setCurrentCompanyId('')
      setPage('companies')
      setSidebarOpen(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentCompanyId) {
      sessionStorage.removeItem('rs_active_company')
      return
    }
    sessionStorage.setItem('rs_active_company', currentCompanyId)
  }, [currentCompanyId])

  // Local storage is persisted via file writes; no extra localStorage sync needed.


  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const istTime = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      setTopbarTime(istTime)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!company) return
    if (SHARED_PAGES.has(page)) return
    if (company.stockEnabled && SALES_PAGES.has(page)) {
      setPage('dashboard')
      return
    }
    if (!company.stockEnabled && STOCK_PAGES.has(page)) {
      setPage('dashboard')
    }
  }, [company?.stockEnabled, company?.id, page])

  useEffect(() => {
    if (isInCompany && page === 'companies') {
      setPage('dashboard')
    }
  }, [isInCompany, page])

  const saveAppState = useCallback(
    (patch) => {
      if (!company) return
      const updatedAt = new Date().toISOString()
      appStateRef.current = { ...appStateRef.current, ...patch, updatedAt }
      const payload = {
        schemaVersion: STORAGE_VERSION,
        companyId: company.id,
        ...appStateRef.current,
        updatedAt
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        writeCompanyState(company.id, payload).catch((err) => {
          console.error('Local save failed:', err)
          setSyncError(`Local save failed (${err.message || 'unknown error'})`)
        })
      }, 150)
    },
    [company?.id]
  )


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

  useEffect(() => {
    if (!company?.stockEnabled) return
    if (!entries.length) return
    const merged = mergeEntries(entries, dailyEntries)
    if (merged.length === dailyEntries.length) return
    setDailyEntriesCloud(merged)
  }, [entries, dailyEntries, company?.stockEnabled, setDailyEntriesCloud])

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

  const setDaybookUploadsCloud = useCallback(
    (updater) => {
      setDaybookUploads((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ daybookUploads: next })
        return next
      })
    },
    [saveAppState]
  )

  const setDailyChartUploadsCloud = useCallback(
    (updater) => {
      setDailyChartUploads((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ dailyChartUploads: next })
        return next
      })
    },
    [saveAppState]
  )

  const setPurchasePartiesCloud = useCallback(
    (updater) => {
      setPurchaseParties((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ purchaseParties: next })
        return next
      })
    },
    [saveAppState]
  )

  const setSalePartiesCloud = useCallback(
    (updater) => {
      setSaleParties((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        void saveAppState({ saleParties: next })
        return next
      })
    },
    [saveAppState]
  )

  const setUsersCloud = useCallback((updater) => {
    const prevUsers = usersRef.current
    const nextUsers = typeof updater === 'function' ? updater(prevUsers) : updater
    setUsers(nextUsers)
    usersRef.current = nextUsers
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

  const handleSelectCompany = (companyId) => {
    setCurrentCompanyId(companyId)
    setPage('dashboard')
    setSidebarOpen(false)
  }

  const handleBackToCompanies = () => {
    setCurrentCompanyId('')
    setPage('companies')
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  const handleUpdateApp = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('updated', Date.now().toString())
    window.location.href = url.toString()
  }

  const handleDesktopUpdate = () => {
    window.location.reload()
  }

  const handleGoDashboard = () => {
    setPage('dashboard')
    setSidebarOpen(false)
  }

  const exportAllCompaniesBackup = useCallback(async () => {
    setGlobalBackupBusy(true)
    setGlobalBackupError('')
    setGlobalBackupStatus('')
    try {
      const dateKey = new Date().toISOString().slice(0, 10)
      const snapshots = await Promise.all(
        COMPANIES.map(async (c) => {
          if (c.id === company?.id) return { company: c, data: appStateRef.current }
          const stored = await readCompanyState(c.id)
          return { company: c, data: stored && stored.items ? stored : makeSeedState(c) }
        })
      )

      await Promise.all(
        snapshots.map((snap) =>
          saveBackupFile({
            companyName: snap.company.name,
            dateKey,
            data: {
              schemaVersion: STORAGE_VERSION,
              companyId: snap.company.id,
              ...snap.data,
              updatedAt: new Date().toISOString()
            }
          })
        )
      )

      setGlobalBackupStatus('Backup saved for all companies.')
    } catch (err) {
      console.error('Backup export failed:', err)
      setGlobalBackupError(`Backup export failed (${err.message || 'unknown error'})`)
    } finally {
      setGlobalBackupBusy(false)
    }
  }, [company?.id])

  const dataUrlToUint8 = (dataUrl) => {
    const [meta, base64Data] = String(dataUrl || '').split(',')
    if (!meta || !base64Data) return new Uint8Array()
    const binary = atob(base64Data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  const exportReportFiles = async ({ companyName, reportType, columns, rows, dateKey }) => {
    const wrapper = document.createElement('div')
    wrapper.style.position = 'fixed'
    wrapper.style.left = '-9999px'
    wrapper.style.top = '0'
    wrapper.style.background = '#ffffff'
    wrapper.style.color = '#0f172a'
    wrapper.style.padding = '24px'
    wrapper.style.width = '1100px'
    wrapper.style.fontFamily = 'Segoe UI, Arial, sans-serif'

    const title = document.createElement('div')
    title.style.fontSize = '20px'
    title.style.fontWeight = '700'
    title.style.marginBottom = '4px'
    title.textContent = `${companyName} — ${reportType}`

    const subtitle = document.createElement('div')
    subtitle.style.fontSize = '12px'
    subtitle.style.marginBottom = '16px'
    subtitle.textContent = `Date: ${dateKey}`

    const table = document.createElement('table')
    table.style.width = '100%'
    table.style.borderCollapse = 'collapse'
    table.style.fontSize = '12px'

    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    columns.forEach((col) => {
      const th = document.createElement('th')
      th.textContent = col
      th.style.textAlign = 'left'
      th.style.padding = '8px'
      th.style.border = '1px solid #cbd5f5'
      th.style.background = '#eef2ff'
      headRow.appendChild(th)
    })
    thead.appendChild(headRow)
    table.appendChild(thead)

    const tbody = document.createElement('tbody')
    rows.forEach((row) => {
      const tr = document.createElement('tr')
      row.forEach((cell) => {
        const td = document.createElement('td')
        td.textContent = cell
        td.style.padding = '6px 8px'
        td.style.border = '1px solid #e2e8f0'
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
    })
    table.appendChild(tbody)

    wrapper.appendChild(title)
    wrapper.appendChild(subtitle)
    wrapper.appendChild(table)
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff' })
    document.body.removeChild(wrapper)

    const pngDataUrl = canvas.toDataURL('image/png')
    const pngBytes = dataUrlToUint8(pngDataUrl)
    await saveReportFile({
      companyName,
      dateKey,
      reportType,
      ext: 'png',
      data: pngBytes
    })

    const pdf = new jsPDF('landscape', 'pt', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const maxWidth = pageWidth - 40
    const maxHeight = pageHeight - 40
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height)
    const renderWidth = canvas.width * ratio
    const renderHeight = canvas.height * ratio
    const x = (pageWidth - renderWidth) / 2
    const y = 20
    pdf.addImage(pngDataUrl, 'PNG', x, y, renderWidth, renderHeight)
    const pdfBytes = pdf.output('arraybuffer')
    await saveReportFile({
      companyName,
      dateKey,
      reportType,
      ext: 'pdf',
      data: pdfBytes
    })
  }

  const exportAllReports = useCallback(async () => {
    setExportBusy(true)
    setExportError('')
    setExportStatus('')
    try {
      const dateKey = new Date().toISOString().slice(0, 10)
      for (const c of COMPANIES) {
        const data =
          c.id === company?.id
            ? appStateRef.current
            : (await readCompanyState(c.id)) || makeSeedState(c)

        const itemsList = Array.isArray(data?.items) ? data.items : []
        const dailyList =
          Array.isArray(data?.dailyEntries) && data.dailyEntries.length
            ? data.dailyEntries
            : Array.isArray(data?.entries)
              ? data.entries
              : []

        const dailyRows = dailyList.map((entry) => {
          const itemMeta = itemsList.find((i) => i.name === entry.item)
          const remark = entry?.remarks || entry?.remark || '—'
          return [
            entry.item || '',
            itemMeta?.category || '',
            entry.type || '',
            Number(entry.kg || 0).toFixed(3),
            String(entry.pcs || 0),
            entry.date || '',
            remark
          ]
        })

        await exportReportFiles({
          companyName: c.name,
          reportType: 'Daily Transactions',
          columns: ['Item', 'Category', 'Type', 'KG', 'PCS', 'Date', 'Remarks'],
          rows: dailyRows.length ? dailyRows : [['—', '', '', '0.000', '0', '', '—']],
          dateKey
        })

        if (c.stockEnabled) {
          const merged = mergeEntries(data?.entries || [], data?.dailyEntries || [])
          const { map, displayNameByKey } = buildStockMap(merged, itemsList)
          const keys = Object.keys(map)
          const stockRows = keys.map((key) => {
            const stats = map[key]
            const itemName = displayNameByKey.get(key) || key
            const itemMeta = itemsList.find((i) => i.name === itemName)
            const balanceKg = Number(stats.inKg || 0) - Number(stats.outKg || 0)
            const balancePcs = Number(stats.inPcs || 0) - Number(stats.outPcs || 0)
            return [
              itemName,
              itemMeta?.category || '',
              Number(stats.inKg || 0).toFixed(3),
              Number(stats.outKg || 0).toFixed(3),
              balanceKg.toFixed(3),
              String(balancePcs)
            ]
          })

          await exportReportFiles({
            companyName: c.name,
            reportType: 'Stock Report',
            columns: ['Item', 'Category', 'In KG', 'Out KG', 'Balance KG', 'Balance PCS'],
            rows: stockRows.length ? stockRows : [['—', '', '0.000', '0.000', '0.000', '0']],
            dateKey
          })
        }
      }

      setExportStatus('PDF/PNG exports saved for all companies.')
    } catch (err) {
      console.error('Export failed:', err)
      setExportError(`Export failed (${err.message || 'unknown error'})`)
    } finally {
      setExportBusy(false)
    }
  }, [company?.id])

  const copyItemsCategoriesFromRsTraders = useCallback(async () => {
    try {
      const stored = await readCompanyState('rs_traders')
      const rsData = stored && stored.items ? stored : null
      if (!rsData) {
        setSyncError('RS Traders data not found in local storage.')
        return
      }
      const rsItems = normalizeArray(rsData.items, [])
      const rsCategories = normalizeArray(rsData.categories, [])
      const normalizedItems = rsItems.map((item) => ({
        ...item,
        minStockUnit: item?.minStockUnit === 'pcs' ? 'pcs' : 'kg'
      }))
      setItemsCloud(normalizedItems)
      setCategoriesCloud(rsCategories)
      setSyncError('')
    } catch (err) {
      console.error('RS Traders copy failed:', err)
      setSyncError(`Copy failed (${err.message || 'unknown error'})`)
    }
  }, [setItemsCloud, setCategoriesCloud])

  return (
    <div className="app">
      {isAuthenticated && isInCompany && (
        <>
          <div
            className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar
            page={page}
            setPage={setPage}
            open={sidebarOpen}
            setOpen={setSidebarOpen}
            company={company}
          />
        </>
      )}

      {isAuthenticated && (
        <header className="topbar">
          {isInCompany ? (
            <button className="hamburger" onClick={() => setSidebarOpen((s) => !s)} aria-label="Toggle menu">
              ☰
            </button>
          ) : (
            <div style={{ width: 38 }} />
          )}
          <div className="brand">{isInCompany ? company.name : 'COMPANY MANAGEMENT SYSTEM'}</div>
          <div className="topbar-right">
            {isInCompany && (
              <button className="chip" onClick={handleBackToCompanies}>
                Companies
              </button>
            )}
            {isInCompany && (
              <button className="chip chip-dashboard" onClick={handleGoDashboard}>
                Dashboard
              </button>
            )}
            {updateAvailable && (
              <button
                className="update-btn"
                onClick={window.location.protocol === 'file:' ? handleDesktopUpdate : handleUpdateApp}
                title={`Update available${updateInfo?.version ? ` (v${updateInfo.version})` : ''}`}
              >
                <span className="update-dot" />
                Update Available
              </button>
            )}
            {isInCompany && <div className="topbar-time">{topbarTime} IST</div>}
              {syncError && <span className="sync-note sync-error">{syncError}</span>}
            <div
              className={`profile-icon role-icon ${isAdmin ? 'role-admin' : 'role-staff'}`}
              title={userLabel}
              aria-label="User profile"
            >
              {userInitial || '?'}
            </div>
            <div className="topbar-user-badge">
              {currentUser.name || currentUser.id}
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>
      )}

        <main className={`main${isAuthenticated ? '' : ' main-login'}`}>
          {!currentUser ? (
            <Login setCurrentUser={setCurrentUser} users={users} />
          ) : loading && isInCompany ? (
            <div style={{ maxWidth: 540, margin: '40px auto', fontWeight: 600 }}>Loading local data...</div>
          ) : !isInCompany ? (
            <>
            {page === 'users' && isAdmin ? (
              <UserManagement
                users={users}
                setUsers={setUsersCloud}
                currentUser={currentUser}
                onBack={() => setPage('companies')}
              />
            ) : (
              <CompanyHub
                companies={COMPANIES}
                currentUser={currentUser}
                onSelectCompany={handleSelectCompany}
                onOpenUsers={() => setPage('users')}
                onExportAllBackup={exportAllCompaniesBackup}
                backupStatus={globalBackupStatus}
                backupError={globalBackupError}
                backupBusy={globalBackupBusy}
              />
            )}
          </>
        ) : (
          <>
            {page === 'dashboard' && (
                <Dashboard
                  entries={entries}
                  calculateStock={calculateStock}
                  items={items}
                  daybookUploads={daybookUploads}
                  dailyChartUploads={dailyChartUploads}
                  currentUser={currentUser}
                  companyId={company.id}
                  company={company}
                  companies={COMPANIES}
                  currentCompanyId={company.id}
                  onSwitchCompany={handleSelectCompany}
                  onManualBackup={exportAllCompaniesBackup}
                  onManualExport={exportAllReports}
                  backupBusy={globalBackupBusy}
                  backupStatus={globalBackupStatus}
                  backupError={globalBackupError}
                  exportBusy={exportBusy}
                  exportStatus={exportStatus}
                  exportError={exportError}
                />
            )}
            {page === 'stock' && company.stockEnabled && (
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
            {page === 'report' && company.stockEnabled && (
              <StockReport
                entries={entries}
                dailyEntries={dailyEntries}
                calculateStock={calculateStock}
                items={items}
                setItems={setItemsCloud}
                currentUser={currentUser}
                companyName={company.name}
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
                companyId={company?.id}
                onCopyFromRsTraders={copyItemsCategoriesFromRsTraders}
              />
            )}
            {page === 'daily' && company.stockEnabled && (
              <DailyTransactions
                dailyEntries={dailyEntries}
                setDailyEntries={setDailyEntriesCloud}
                entries={entries}
                setEntries={setEntriesCloud}
                currentUser={currentUser}
                items={items}
              />
            )}
            {!company.stockEnabled && page === 'sales' && (
              <SalesEntry
                entries={entries}
                setEntries={setEntriesCloud}
                dailyEntries={dailyEntries}
                setDailyEntries={setDailyEntriesCloud}
                entryCounter={entryCounter}
                setEntryCounter={setEntryCounterCloud}
                items={items}
                purchaseParties={purchaseParties}
                saleParties={saleParties}
              />
            )}
            {!company.stockEnabled && page === 'salesreport' && (
              <SalesReport
                entries={entries}
                setEntries={setEntriesCloud}
                dailyEntries={dailyEntries}
                setDailyEntries={setDailyEntriesCloud}
                currentUser={currentUser}
                purchaseParties={purchaseParties}
                saleParties={saleParties}
                setPurchaseParties={setPurchasePartiesCloud}
                setSaleParties={setSalePartiesCloud}
              />
            )}
            {!company.stockEnabled && page === 'salesitemreport' && (
              <LaxmiItemReport
                entries={entries}
                items={items}
                setEntries={setEntriesCloud}
                setDailyEntries={setDailyEntriesCloud}
                currentUser={currentUser}
              />
            )}
            {page === 'daybook' && (
              <DaybookUpload
                daybookUploads={daybookUploads}
                setDaybookUploads={setDaybookUploadsCloud}
                currentUser={currentUser}
                companyId={company.id}
              />
            )}
            {page === 'dailychart' && (
              <DailyChartUpload
                dailyChartUploads={dailyChartUploads}
                setDailyChartUploads={setDailyChartUploadsCloud}
                currentUser={currentUser}
                companyId={company.id}
              />
            )}
            {page === 'backup' && (
                <Backup
                  items={items}
                  entries={entries}
                  dailyEntries={dailyEntries}
                  categories={categories}
                  entryCounter={entryCounter}
                  purchaseParties={purchaseParties}
                  saleParties={saleParties}
                  users={users}
                  daybookUploads={daybookUploads}
                  dailyChartUploads={dailyChartUploads}
                  setItems={setItemsCloud}
                  setEntries={setEntriesCloud}
                  setDailyEntries={setDailyEntriesCloud}
                  setCategories={setCategoriesCloud}
                  setEntryCounter={setEntryCounterCloud}
                  setPurchaseParties={setPurchasePartiesCloud}
                  setSaleParties={setSalePartiesCloud}
                  setUsers={setUsersCloud}
                  setDaybookUploads={setDaybookUploadsCloud}
                  setDailyChartUploads={setDailyChartUploadsCloud}
                />
            )}
          </>
        )}
      </main>
    </div>
  )
}
