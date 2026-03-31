import React, { useState, useEffect } from 'react'
import { ROD_CONVERSIONS } from '../App.jsx'
import { mergeEntries } from '../utils/stockBalance'

export default function StockEntry({
  entries,
  setEntries,
  items,
  dailyEntries,
  setDailyEntries,
  currentUser,
  entryCounter,
  setEntryCounter
}) {

  console.log("ENTRY COUNTER:", entryCounter)
  const [item, setItem] = useState('')
  const [type, setType] = useState('Stock In')
  const [kg, setKg] = useState('')
  const [pcs, setPcs] = useState('')
  const [inKg, setInKg] = useState('')
  const [inPcs, setInPcs] = useState('')
  const [outKg, setOutKg] = useState('')
  const [outPcs, setOutPcs] = useState('')
  const [date, setDate] = useState(() => localStorage.getItem('rs_last_date') || '')
  const [remarks, setRemarks] = useState('')
  const [lastChanged, setLastChanged] = useState(null)
  const [lastChangedIn, setLastChangedIn] = useState(null)
  const [lastChangedOut, setLastChangedOut] = useState(null)
  const [bothMode, setBothMode] = useState(false)
  const [bulk, setBulk] = useState('')
  const [bulkPaste, setBulkPaste] = useState('')
  const [bulkPasteInfo, setBulkPasteInfo] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [bulkTextInfo, setBulkTextInfo] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkRows, setBulkRows] = useState([
    { item:'', type:'Stock In', kg:'', pcs:'', date:date, remarks:'' }
  ])

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.form-group')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])  

  useEffect(() => { if (date) localStorage.setItem('rs_last_date', date) }, [date])

  useEffect(() => {
    const it = items.find(i => i.name === item)
    const conv = getConversionForItem(it)
    if (!it || conv <= 0) return
    if (lastChanged === 'kg') {
      const k = parseFloat(kg) || 0
      setPcs(Math.round(k / conv))
    } else if (lastChanged === 'pcs') {
      const p = parseFloat(pcs) || 0
      setKg((p * conv).toFixed(3))
    }
  }, [kg, pcs, item, lastChanged, items])

  useEffect(() => {
    const it = items.find(i => i.name === item)
    const conv = getConversionForItem(it)
    if (!it || conv <= 0) return
    if (lastChangedIn === 'kg') {
      const k = parseFloat(inKg) || 0
      setInPcs(Math.round(k / conv))
    } else if (lastChangedIn === 'pcs') {
      const p = parseFloat(inPcs) || 0
      setInKg((p * conv).toFixed(3))
    }
  }, [inKg, inPcs, item, lastChangedIn, items])

  useEffect(() => {
    const it = items.find(i => i.name === item)
    const conv = getConversionForItem(it)
    if (!it || conv <= 0) return
    if (lastChangedOut === 'kg') {
      const k = parseFloat(outKg) || 0
      setOutPcs(Math.round(k / conv))
    } else if (lastChangedOut === 'pcs') {
      const p = parseFloat(outPcs) || 0
      setOutKg((p * conv).toFixed(3))
    }
  }, [outKg, outPcs, item, lastChangedOut, items])

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  )

  const getConversionForItem = (it, fallbackName = '') => {
    if (it && Number(it.conversion || 0) > 0) return Number(it.conversion)
    const name = String(it?.name || fallbackName || '').toLowerCase()
    const match = name.match(/(\d+(?:\.\d+)?)\s*mm/)
    if (!match) return 0
    const key = match[1]
    return Number(ROD_CONVERSIONS[key] || 0)
  }

  const findItemByName = (value) => {
    const needle = String(value || '').trim().toLowerCase()
    if (!needle) return null
    return items.find((i) => i.name.trim().toLowerCase() === needle) || null
  }

  useEffect(() => {
    if (!itemSearch) {
      setItem('')
      return
    }
    const exact = findItemByName(itemSearch)
    if (exact) setItem(exact.name)
  }, [itemSearch, items])

  const normalizeName = (value) =>
    String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')

  const getConversionForName = (itemName) => {
    const normalized = normalizeName(itemName)
    const itemMeta = items.find((it) => normalizeName(it.name) === normalized)
    const conv = getConversionForItem(itemMeta, itemName)
    return conv
  }

  const getBalancesForItem = (itemName, extraEntries = []) => {
    const base = { kg: 0, pcs: 0 }
    const merged = mergeEntries(entries, dailyEntries)
    const all = [...merged, ...extraEntries]
    const targetKey = normalizeName(itemName)
    const conv = getConversionForName(itemName)
    return all
      .filter(e => normalizeName(e.item) === targetKey)
      .reduce((acc, e) => {
        const kgVal = Number(e.kg || 0)
        let pcsVal = Number(e.pcs || 0)
        if (!pcsVal && kgVal && conv > 0) {
          pcsVal = Math.round(kgVal / conv)
        }
        if (e.type === 'Stock In') {
          acc.kg += kgVal
          acc.pcs += pcsVal
        } else {
          acc.kg -= kgVal
          acc.pcs -= pcsVal
        }
        return acc
      }, base)
  }

  const guardNegativeStock = (itemName, outKg, outPcs, extraEntries = []) => {
    const balances = getBalancesForItem(itemName, extraEntries)
    const nextKg = balances.kg - Number(outKg || 0)
    const nextPcs = balances.pcs - Number(outPcs || 0)
    if (nextKg < 0 || nextPcs < 0) {
      alert(
        `Warning: Stock will go negative for "${itemName}".\n` +
        `Current: ${balances.kg.toFixed(3)} KG, ${balances.pcs} PCS\n` +
        `After entry: ${nextKg.toFixed(3)} KG, ${nextPcs} PCS\n` +
        `Entry was not saved.`
      )
      return false
    }
    return true
  }

  const save = () => {
    const selected = item ? items.find(i => i.name === item) : findItemByName(itemSearch)
    if (!selected) return alert('Select a valid item')
    if ((!kg && !pcs)) return alert('Fill item & qty')
    const conv = getConversionForItem(selected)
    let calculatedKg = Number(kg || 0)
    if (conv > 0 && pcs) calculatedKg = Number((pcs * conv).toFixed(3))
    let calculatedPcs = Number(pcs || 0)
    if (!calculatedPcs && conv > 0 && calculatedKg) {
      calculatedPcs = Math.round(calculatedKg / conv)
    }
    
    if (type === 'Stock Out') {
      if (!guardNegativeStock(selected.name, calculatedKg, calculatedPcs)) return
    }

    const newEntry = {
      id: entryCounter,
      item: selected.name,
      type,
      kg: calculatedKg,
      pcs: calculatedPcs,
      date,
      remarks
    }
    setEntryCounter(prev => prev + 1)
    setEntries(prev => [...prev, newEntry])
    setDailyEntries(prev => [...prev, newEntry])
    setItem(''); setItemSearch(''); setKg(''); setPcs(''); setRemarks('')
  }

  const saveBoth = () => {
    const selected = item ? items.find(i => i.name === item) : findItemByName(itemSearch)
    if (!selected) return alert('Select a valid item')
    if (!inKg && !inPcs && !outKg && !outPcs) return alert('Fill in/out qty')

    const conv = getConversionForItem(selected)
    const hasConv = conv > 0

    let calcInKg = Number(inKg || 0)
    let calcInPcs = Number(inPcs || 0)
    if (hasConv && calcInPcs) calcInKg = Number((calcInPcs * conv).toFixed(3))
    if (hasConv && !calcInPcs && calcInKg) calcInPcs = Math.round(calcInKg / conv)

    let calcOutKg = Number(outKg || 0)
    let calcOutPcs = Number(outPcs || 0)
    if (hasConv && calcOutPcs) calcOutKg = Number((calcOutPcs * conv).toFixed(3))
    if (hasConv && !calcOutPcs && calcOutKg) calcOutPcs = Math.round(calcOutKg / conv)

    const newEntries = []
    const inEntry = (calcInKg || calcInPcs) ? {
      id: entryCounter + newEntries.length,
      item: selected.name,
      type: 'Stock In',
      kg: calcInKg,
      pcs: calcInPcs,
      date,
      remarks
    } : null
    if (inEntry) newEntries.push(inEntry)

    if (calcOutKg || calcOutPcs) {
      if (!guardNegativeStock(selected.name, calcOutKg, calcOutPcs, inEntry ? [inEntry] : [])) return
      newEntries.push({
        id: entryCounter + newEntries.length,
        item: selected.name,
        type: 'Stock Out',
        kg: calcOutKg,
        pcs: calcOutPcs,
        date,
        remarks
      })
    }

    if (!newEntries.length) return alert('Fill in/out qty')

    setEntryCounter(prev => prev + newEntries.length)
    setEntries(prev => [...prev, ...newEntries])
    setDailyEntries(prev => [...prev, ...newEntries])
    setItem(''); setItemSearch(''); setInKg(''); setInPcs(''); setOutKg(''); setOutPcs(''); setRemarks('')
  }

  const handleBulk = () => {
    if (!bulk.trim()) return alert('Paste bulk lines')
    const lines = bulk.split('\n')
    const parsed = []
    const tempEntries = []
    lines.forEach(l => {
      const p = l.split(',').map(x=>x.trim())
      if (p.length>=3) {
        const itemName = p[0]
        const typeValue = p[1] || 'Stock In'
        const kgValue = Number(p[2]) || 0
        const pcsValue = Number(p[3]) || 0
        if (typeValue === 'Stock Out') {
          const balances = getBalancesForItem(itemName, tempEntries)
          const nextKg = balances.kg - kgValue
          const nextPcs = balances.pcs - pcsValue
          if (nextKg < 0 || nextPcs < 0) {
            alert(
              `Warning: Stock will go negative for "${itemName}".\n` +
              `Current: ${balances.kg.toFixed(3)} KG, ${balances.pcs} PCS\n` +
              `After entry: ${nextKg.toFixed(3)} KG, ${nextPcs} PCS\n` +
              `Bulk import stopped.`
            )
            return
          }
        }

        const nextEntry = {
          id: entryCounter + parsed.length,
          item: itemName,
          type: typeValue,
          kg: kgValue,
          pcs: pcsValue,
          date: p[4] || date,
          remarks: p[5] || ''
        }
        parsed.push(nextEntry)
        tempEntries.push(nextEntry)
      }
    })
    if (!parsed.length) return alert('No valid lines')
    setEntries(prev => [...prev, ...parsed])
    setDailyEntries(prev => [...prev, ...parsed])
    setEntryCounter(prev => prev + parsed.length)
    setBulk('')
  }

  const handleBulkImport = () => {
    importRows(bulkRows)
  }

  const parseBulkTextRows = (text) => {
    const normalizeTypeValue = (value) => {
      const raw = String(value || '').trim().toLowerCase()
      if (!raw) return ''
      if (raw === 'stock in' || raw === 'stockin' || raw === 'in') return 'Stock In'
      if (raw === 'stock out' || raw === 'stockout' || raw === 'out') return 'Stock Out'
      return ''
    }

    const normalizeDateInput = (value) => {
      const raw = String(value || '').trim()
      if (!raw) return ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
      if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split('-')
        return `${yyyy}-${mm}-${dd}`
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split('/')
        return `${yyyy}-${mm}-${dd}`
      }
      return raw
    }

    const lines = String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const rows = []
    const warnings = []
    lines.forEach((line, index) => {
      const delimiter = line.includes('\t') ? '\t' : line.includes('|') ? '|' : ','
      const parts = line.split(delimiter).map((p) => p.trim())
      if (parts.length < 2) return

      const lower = parts.map((p) => p.toLowerCase())
      if (index === 0 && lower.some((p) => p.includes('item')) && lower.some((p) => p.includes('type'))) {
        return
      }

      const [rawItem, rawType, rawKg, rawPcs, rawDate, rawRemarks] = parts
      const itemValue = rawItem || ''
      const normalizedType = normalizeTypeValue(rawType)
      if (!normalizedType) {
        warnings.push(`Row ${index + 1}: Invalid type "${rawType || ''}"`)
      }
      rows.push({
        item: itemValue,
        type: normalizedType,
        kg: rawKg || '',
        pcs: rawPcs || '',
        date: normalizeDateInput(rawDate || date),
        remarks: rawRemarks || ''
      })
    })

    return { rows, warnings }
  }

  const handleBulkTextParse = () => {
    const parsed = parseBulkTextRows(bulkText)
    setBulkRows(parsed.rows.length ? parsed.rows : [{ item:'', type:'Stock In', kg:'', pcs:'', date:date, remarks:'' }])
    if (parsed.rows.length) {
      const warnText = parsed.warnings.length ? ` Warnings: ${parsed.warnings.join(' | ')}` : ''
      setBulkTextInfo(`${parsed.rows.length} rows ready.${warnText}`)
    } else {
      setBulkTextInfo('No valid rows found.')
    }
  }

  const handleBulkFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setBulkText(text)
      const parsed = parseBulkTextRows(text)
      setBulkRows(parsed.rows.length ? parsed.rows : [{ item:'', type:'Stock In', kg:'', pcs:'', date:date, remarks:'' }])
      if (parsed.rows.length) {
        const warnText = parsed.warnings.length ? ` Warnings: ${parsed.warnings.join(' | ')}` : ''
        setBulkTextInfo(`${parsed.rows.length} rows ready.${warnText}`)
      } else {
        setBulkTextInfo('No valid rows found.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const importRows = (rows) => {
    const normalizeItemName = (value) =>
      String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
    const getRowConversion = (matchedItem, rowItemName) => getConversionForItem(matchedItem, rowItemName)
    const itemIndex = new Map(items.map((it) => [normalizeItemName(it.name), it]))
    const normalizeTypeValue = (value) => {
      const raw = String(value || '').trim().toLowerCase()
      if (raw === 'stock in' || raw === 'stockin' || raw === 'in') return 'Stock In'
      if (raw === 'stock out' || raw === 'stockout' || raw === 'out') return 'Stock Out'
      return ''
    }
    const options = arguments.length > 1 ? arguments[1] : {}
    const skipNegative = Boolean(options?.skipNegative)
    const newEntries = []
    for (let row of rows) {

      if (!row.item.trim()) continue
      const normalizedType = normalizeTypeValue(row.type)
      if (!normalizedType) {
        alert(`Missing or invalid Type for item "${row.item}". Please fix it before importing.`)
        return
      }

      const matchedItem = itemIndex.get(normalizeItemName(row.item))

      if (!matchedItem) {
        alert(`Item not found: ${row.item}`)
        return
      }

      let calculatedKg = Number(row.kg || 0)
      let pcsValue = Number(row.pcs || 0)

      // Smart bidirectional conversion
      const rowConv = getRowConversion(matchedItem, row.item)
      if (rowConv > 0) {

        if (pcsValue && !row.kg) {
          calculatedKg = Number((pcsValue * rowConv).toFixed(3))
        }

        else if (calculatedKg && !row.pcs) {
          pcsValue = Math.round(calculatedKg / rowConv)
        }

        else if (pcsValue && calculatedKg) {
          calculatedKg = Number((pcsValue * rowConv).toFixed(3))
        }
      }

      // Negative validation
      if (normalizedType === 'Stock Out' && !skipNegative) {
        const balances = getBalancesForItem(matchedItem.name, newEntries)
        const nextKg = balances.kg - calculatedKg
        const nextPcs = balances.pcs - pcsValue
        if (nextKg < 0 || nextPcs < 0) {
          alert(
            `Warning: Stock will go negative for "${matchedItem.name}".\n` +
            `Current: ${balances.kg.toFixed(3)} KG, ${balances.pcs} PCS\n` +
            `After entry: ${nextKg.toFixed(3)} KG, ${nextPcs} PCS\n` +
            `Bulk import stopped.`
          )
          return
        }
      }

      newEntries.push({
        id: entryCounter + newEntries.length,
        item: matchedItem.name,
        type: normalizedType,
        kg: calculatedKg,
        pcs: pcsValue,
        date: row.date || date,
        remarks: row.remarks || ''
      })
    }

    if (!newEntries.length) return alert('No valid rows')

    setEntries(prev => [...prev, ...newEntries])
    setDailyEntries(prev => [...prev, ...newEntries])
    setEntryCounter(prev => prev + newEntries.length)

    setBulkRows([
      { item:'', type:'Stock In', kg:'', pcs:'', date:date, remarks:'' }
    ])
    setBulkPaste('')
    setShowBulkModal(false)
  }

  const handleGridPaste = (e) => {
    const paste = e.clipboardData.getData('text')

    if (!paste.includes('\t')) return

    e.preventDefault()

    const rows = paste.split('\n').filter(r => r.trim() !== '')

    const parsed = rows.map(r => {
      const cols = r.split('\t')
      return {
        item: cols[0] || '',
        type: cols[1] || 'Stock In',
        kg: cols[2] || '',
        pcs: cols[3] || '',
        date: cols[4] || date,
        remarks: cols[5] || ''
      }
    })

    setBulkRows(parsed)
  }

  const parseStockReportPaste = () => {
    if (!bulkPaste.trim()) return alert('Paste data first')
    const lines = bulkPaste
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    const headerLine = lines.find(l => /item/i.test(l) && /category/i.test(l)) || ''
    let detectedColumns = []
    let ignoredColumns = []
    if (headerLine) {
      const headerParts = headerLine.includes('\t')
        ? headerLine.split('\t').map(p => p.trim())
        : headerLine.split(/\s{2,}/).map(p => p.trim())
      const known = new Set(['item', 'category', 'in kg', 'out kg', 'balance kg', 'balance pcs'])
      detectedColumns = headerParts.filter(Boolean)
      ignoredColumns = headerParts.filter(c => !known.has(c.toLowerCase()))
      setBulkPasteInfo(
        `Detected columns: ${detectedColumns.join(', ')}.` +
        (ignoredColumns.length ? ` Ignored: ${ignoredColumns.join(', ')}.` : '')
      )
    } else {
      setBulkPasteInfo('No header detected. Assuming: Item, Category, In KG, Out KG, Balance KG, Balance PCS.')
    }

    const rows = []
    for (const line of lines) {
      if (/^item\s+/i.test(line) || /category/i.test(line)) continue
      const parts = line.includes('|')
        ? line.split('|').map(p => p.trim()).filter(Boolean)
        : line.includes('\t')
          ? line.split('\t').map(p => p.trim())
          : line.split(/\s{2,}/).map(p => p.trim())

      if (parts.length < 6) continue
      const itemName = parts[0]
      const inKg = Number(parts[2] || 0)
      const outKg = Number(parts[3] || 0)
      const balancePcs = Number(parts[5] || 0)

      if (inKg > 0) {
        rows.push({ item: itemName, type: 'Stock In', kg: inKg, pcs: '', date, remarks: '' })
      }
      if (outKg > 0) {
        rows.push({ item: itemName, type: 'Stock Out', kg: outKg, pcs: '', date, remarks: '' })
      }
      if (inKg === 0 && outKg === 0 && balancePcs !== 0) {
        rows.push({
          item: itemName,
          type: balancePcs < 0 ? 'Stock Out' : 'Stock In',
          kg: '',
          pcs: Math.abs(balancePcs),
          date,
          remarks: ''
        })
      }
    }

    if (!rows.length) return alert('No valid rows found')
    importRows(rows, { skipNegative: true })
  }
  return (
    <section className="page stock-entry-page">
      <div className="page-hero stock-entry-hero">
        <div>
          <h1>Stock Entry</h1>
          <p>Fast, accurate entries with smart conversions and live validation.</p>
        </div>
      </div>

      <div className="stock-entry-toggle">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={bothMode}
            onChange={(e) => setBothMode(e.target.checked)}
          />
          Add Stock In and Stock Out together
        </label>
      </div>

      <div className="card stock-entry-card">
        <div className="form-grid">
        <div className="form-group" style={{position:'relative'}}>
          <label>Item</label>

          <input
            value={itemSearch}
            placeholder="Search item..."
            onChange={e => {
              setItemSearch(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
          />

          {showDropdown && (
            <div style={{
              position:'absolute',
              top:'100%',
              left:0,
              right:0,
              background:'#fff',
              border:'1px solid #ddd',
              borderRadius:6,
              maxHeight:200,
              overflowY:'auto',
              zIndex:1000
            }}>
              {filteredItems.length === 0 && (
                <div style={{padding:8,fontSize:12,color:'#999'}}>
                  No items found
                </div>
              )}

              {filteredItems.map((it,i)=>(
                <div
                  key={i}
                  style={{
                    padding:'8px 10px',
                    cursor:'pointer',
                    borderBottom:'1px solid #f1f1f1'
                  }}
                  onClick={()=>{
                    setItem(it.name)
                    setItemSearch(it.name)
                    setShowDropdown(false)
                  }}
                >
                  {it.name}
                </div>
              ))}
            </div>
          )}
        </div>
        {!bothMode && (
          <>
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={e=>setType(e.target.value)}><option>Stock In</option><option>Stock Out</option></select>
            </div>
            <div className="form-group">
              <label>KG</label>
              <input type="number" value={kg} onChange={e=>{setKg(e.target.value); setLastChanged('kg')}} />
            </div>
            <div className="form-group">
              <label>Pieces</label>
              <input type="number" value={pcs} onChange={e=>{setPcs(e.target.value); setLastChanged('pcs')}} />
            </div>
          </>
        )}

        {bothMode && (
          <>
            <div className="form-section-label" style={{gridColumn:'1 / -1'}}>Stock In</div>
            <div className="form-group">
              <label>In KG</label>
              <input type="number" value={inKg} onChange={e=>{setInKg(e.target.value); setLastChangedIn('kg')}} />
            </div>
            <div className="form-group">
              <label>In PCS</label>
              <input type="number" value={inPcs} onChange={e=>{setInPcs(e.target.value); setLastChangedIn('pcs')}} />
            </div>
            <div className="form-section-label" style={{gridColumn:'1 / -1'}}>Stock Out</div>
            <div className="form-group">
              <label>Out KG</label>
              <input type="number" value={outKg} onChange={e=>{setOutKg(e.target.value); setLastChangedOut('kg')}} />
            </div>
            <div className="form-group">
              <label>Out PCS</label>
              <input type="number" value={outPcs} onChange={e=>{setOutPcs(e.target.value); setLastChangedOut('pcs')}} />
            </div>
          </>
        )}
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Remarks</label>
          <input value={remarks} onChange={e=>setRemarks(e.target.value)} />
        </div>

        <div className="form-group" style={{gridColumn: '1 / -1'}}>
          <label>Rod conversions</label>
          <div className="chip-row">
            {Object.entries(ROD_CONVERSIONS).map(([s,c])=> (
              <div
                key={s}
                className="chip"
                onClick={() => {
                  if (bothMode) {
                    setInKg(c)
                    setLastChangedIn('kg')
                  } else {
                    setKg(c)
                    setLastChanged('kg')
                  }
                  setItem(`${s}mm Rod`)
                }}
              >
                {s}mm → {c} kg
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="actions right" style={{display:'flex',gap:12}}>
        <button className="btn btn-green" onClick={bothMode ? saveBoth : save}>Save Entry</button>
        <button className="btn btn-blue" onClick={()=>setShowBulkModal(true)}>
          Bulk Import
        </button>
      </div>
      </div>

      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Bulk Import</h2>
                <p>Paste rows or upload a CSV to add multiple transactions.</p>
              </div>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}>×</button>
            </div>

            <div className="modal-bulk-grid">
              <div className="bulk-entry-panel">
                <label className="bulk-label">Paste Grid</label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Item, Type, KG, PCS, Date, Remarks"
                  rows={6}
                  className="bulk-textarea"
                />
                <div className="bulk-help">Supported delimiters: comma, tab, or pipe. Header row allowed.</div>
                <div className="bulk-actions-left" style={{ marginTop: 10 }}>
                  <button onClick={handleBulkTextParse} className="bulk-btn bulk-btn-parse">Parse Bulk</button>
                  {bulkTextInfo && <span className="bulk-status">{bulkTextInfo}</span>}
                </div>
              </div>

              <div className="bulk-entry-panel">
                <label className="bulk-label">CSV Upload</label>
                <label className={`bulk-upload ${currentUser?.role === 'staff' ? 'disabled' : ''}`}>
                  <input type="file" accept=".csv" onChange={handleBulkFile} disabled={currentUser?.role === 'staff'} />
                  <div>
                    <div className="bulk-upload-title">Choose CSV File</div>
                    <div className="bulk-upload-subtitle">Columns: Item, Type, KG, PCS, Date, Remarks</div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{
              display:'grid',
              gridTemplateColumns:'2fr 1fr 1fr 1fr 1.5fr 2fr',
              gap:4,
              marginTop:15,
              background:'#f1f5f9',
              padding:'8px 10px',
              borderRadius:6,
              fontWeight:600,
              fontSize:13,
              textAlign:'center'
            }}>
              <div>Item</div>
              <div>Type</div>
              <div>KG</div>
              <div>PCS</div>
              <div>Date</div>
              <div>Remarks</div>
            </div>

            <div style={{marginTop:15,overflowX:'auto'}}>
              <table
                onPaste={handleGridPaste}
                style={{
                  width:'100%',
                  borderCollapse:'collapse',
                  fontSize:13
                }}
              >
                <thead>
                  <tr style={{background:'#f1f5f9',textAlign:'center'}}>
                    <th>Item</th>
                    <th>Type</th>
                    <th>KG</th>
                    <th>PCS</th>
                    <th>Date</th>
                    <th>Remarks</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {bulkRows.map((row,index)=>(
                    <tr key={index} style={{textAlign:'center'}}>
                      <td>
                        <input
                          value={row.item}
                          onPaste={handleGridPaste}
                          onChange={e=>{
                            const copy=[...bulkRows]
                            copy[index].item=e.target.value
                            setBulkRows(copy)
                          }}
                        />
                      </td>

                      <td>
                        <select
                          value={row.type}
                          onChange={e=>{
                            const copy=[...bulkRows]
                            copy[index].type=e.target.value
                            setBulkRows(copy)
                          }}
                        >
                          <option>Stock In</option>
                          <option>Stock Out</option>
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          value={row.kg}
                          onChange={e=>{
                            const copy=[...bulkRows]
                            copy[index].kg=e.target.value

                            const matchedItem = items.find(i =>
                              i.name.toLowerCase() === copy[index].item.toLowerCase()
                            )

                            if (matchedItem && matchedItem.conversion > 0) {
                              copy[index].pcs = Math.round(
                                Number(e.target.value || 0) / matchedItem.conversion
                              )
                            }

                            setBulkRows(copy)
                          }}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={row.pcs}
                          onChange={e=>{
                            const copy=[...bulkRows]
                            copy[index].pcs=e.target.value

                            const matchedItem = items.find(i =>
                              i.name.toLowerCase() === copy[index].item.toLowerCase()
                            )

                            if (matchedItem && matchedItem.conversion > 0) {
                              copy[index].kg = (
                                Number(e.target.value || 0) * matchedItem.conversion
                              ).toFixed(3)
                            }

                            setBulkRows(copy)
                          }}
                        />
                      </td>

                      <td>
                        <input
                          type="date"
                          value={row.date}
                          onChange={e=>{
                            const copy=[...bulkRows]
                            copy[index].date=e.target.value
                            setBulkRows(copy)
                          }}
                        />
                      </td>

                      <td>
                        <input
                          value={row.remarks}
                          onChange={e=>{
                            const copy=[...bulkRows]
                            copy[index].remarks=e.target.value
                            setBulkRows(copy)
                          }}
                        />
                      </td>

                      <td>
                        <button
                          onClick={()=>{
                            setBulkRows(prev=>prev.filter((_,i)=>i!==index))
                          }}
                          style={{
                            background:'#ef4444',
                            color:'#fff',
                            border:'none',
                            padding:'4px 8px',
                            borderRadius:4,
                            cursor:'pointer'
                          }}
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              
             <div style={{marginTop:10}}>
                <button
                  onClick={()=>setBulkRows(prev=>[
                    ...prev,
                    { item:'', type:'Stock In', kg:'', pcs:'', date:date, remarks:'' }
                  ])}
                  className="btn btn-blue"
                >
                  + Add Row
                </button>
              </div> 
            <div style={{
              display:'flex',
              justifyContent:'flex-end',
              gap:12,
              marginTop:20
            }}>
              <button onClick={()=>setShowBulkModal(false)} className="btn btn-blue">
                Cancel
              </button>

              <button onClick={handleBulkImport} className="btn btn-green">
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
