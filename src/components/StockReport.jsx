import React, { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { buildStockMap, normalizeName, mergeEntries } from '../utils/stockBalance'

export default function StockReport({ entries, dailyEntries = [], calculateStock, items, setItems, currentUser }) {
  const [draftDateMode, setDraftDateMode] = useState('asof')
  const [draftAsOfPicker, setDraftAsOfPicker] = useState('')
  const [draftFromPicker, setDraftFromPicker] = useState('')
  const [draftToPicker, setDraftToPicker] = useState('')
  const [draftAsOfDate, setDraftAsOfDate] = useState('')
  const [draftFromDate, setDraftFromDate] = useState('')
  const [draftToDate, setDraftToDate] = useState('')
  const [dateMode, setDateMode] = useState('asof')
  const [asOfDate, setAsOfDate] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const mergedEntries = mergeEntries(entries, dailyEntries)

  const toDateKey = (value) => {
    if (!value) return ''
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return ''
      return value.toISOString().slice(0, 10)
    }
    const raw = String(value).trim()
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
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().slice(0, 10)
  }

  const isWithinRange = (entryDate, start, end) => {
    const entryKey = toDateKey(entryDate)
    if (!entryKey) return false
    if (start && entryKey < start) return false
    if (end && entryKey > end) return false
    return true
  }

  const filteredEntriesByDate = (() => {
    if (dateMode === 'asof') {
      const end = toDateKey(asOfDate)
      if (!end) return mergedEntries
      return mergedEntries.filter((e) => isWithinRange(e.date, '', end))
    }
    const start = toDateKey(fromDate)
    const end = toDateKey(toDate)
    if (!start && !end) return mergedEntries
    return mergedEntries.filter((e) => isWithinRange(e.date, start, end))
  })()

  const itemByName = new Map(items.map((it) => [normalizeName(it.name), it]))

  const { map: stock, displayNameByKey } = buildStockMap(
    dateMode === 'asof' || dateMode === 'range' ? filteredEntriesByDate : mergedEntries,
    items
  )
  // 🔍 Filters
  const [statusFilter, setStatusFilter] = useState('all') 
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  const allKeys = Object.keys(stock)
  const hasUnlisted = allKeys.some((key) => !itemByName.has(key))
  const canEditItems = String(currentUser?.role || '').toLowerCase() !== 'staff'

  const addMissingItem = (rawName) => {
    if (!setItems) return
    const cleaned = String(rawName || '')
      .normalize('NFKC')
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .replace(/\s+/g, ' ')
    if (!cleaned) return
    const exists = itemByName.has(normalizeName(cleaned))
    if (exists) return alert('Item already exists in Item Master')
    setItems((prev) => [
      ...prev,
      {
        name: cleaned,
        category: 'Rod',
        conversion: 0,
        minStock: 0,
        minStockUnit: 'kg'
      }
    ])
  }
  const getBalanceValue = (s, item) => {
    const unit = item?.minStockUnit === 'pcs' ? 'pcs' : 'kg'
    if (unit === 'pcs') return s.inPcs - s.outPcs
    return s.inKg - s.outKg
  }

  const filteredKeys = allKeys.filter(key => {
    const s = stock[key]
    const item = itemByName.get(key)

    const balanceValue = getBalanceValue(s, item)
    const minStockValue = Number(item?.minStock || 0)
    const isLow = balanceValue < minStockValue
    const isOk = balanceValue >= minStockValue
    const balKg = s.inKg - s.outKg
    const balPcs = s.inPcs - s.outPcs
    const isNegative = balKg < 0 || balPcs < 0
    const isZero = balKg === 0 && balPcs === 0

    // Status filter
    if (statusFilter === 'low' && !isLow) return false
    if (statusFilter === 'ok' && !isOk) return false
    if (statusFilter === 'negative' && !isNegative) return false
    if (statusFilter === 'zero' && !isZero) return false

    // Category filter
    const categoryValue = item?.category || 'Unlisted'
    if (categoryFilter !== 'all' && categoryValue !== categoryFilter) return false

    // Search filter
    const displayName = displayNameByKey.get(key) || key
    if (search && !displayName.toLowerCase().includes(search.toLowerCase())) return false

    return true
  }).sort((a, b) => {
    const nameA = displayNameByKey.get(a) || a
    const nameB = displayNameByKey.get(b) || b
    return nameA.localeCompare(nameB)
  })
  
  const exportReport = async (format) => {
    const el = document.getElementById('stock-table-export')
    
    // Use optimized canvas rendering
    // Save original styles
    const originalBg = el.style.backgroundColor

    const filters = el.querySelectorAll('.no-export')
    
    filters.forEach(f => f.style.display = 'none')
    // Force white background before capture
    el.style.backgroundColor = '#ffffff'

    // Force table rows white
    const rows = el.querySelectorAll('tr')
    rows.forEach(row => row.style.backgroundColor = '#ffffff')

    // Force dark text
    const cells = el.querySelectorAll('td')
    cells.forEach(cell => {
      cell.style.color = '#000000'
      cell.style.fontWeight = '600'   
    })

    // Remove animation class temporarily
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

    filters.forEach(f => f.style.display = '')
    // Restore animation
    animatedRows.forEach(row => {
      row.style.animation = ''
      row.style.opacity = ''
    })
    // Restore original styles after capture
    el.style.backgroundColor = originalBg
    rows.forEach(row => row.style.backgroundColor = '')
    cells.forEach(cell => {
      cell.style.color = ''
      cell.style.fontWeight = ''
    })

    if (format === 'png') {
      // Compress PNG by converting to JPEG with high quality
      const ctx = canvas.getContext('2d')
      const link = document.createElement('a')
      link.download = `stock-report-${new Date().toLocaleDateString().replace(/\//g, '_')}.png`
      // Use canvas.toDataURL with lower quality for smaller file size
      link.href = canvas.toDataURL('image/png', 0.9)
      link.click()
    } else if (format === 'pdf') {
      // A4 dimensions in mm
      const pdfWidth = 210
      const pdfHeight = 297
      const imgWidth = pdfWidth - 20 // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPosition = 10 // Start 10mm from top
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Add header
      pdf.setFontSize(16)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(15, 23, 42) // Dark blue
      pdf.text('RS Stock - Stock Report', 10, yPosition)
      yPosition += 8

      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(100, 116, 139) // Slate gray
      pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, 10, yPosition)
      yPosition += 6
      pdf.text(`Total Items: ${Object.keys(stock).length}`, 10, yPosition)
      yPosition += 10

      // Add image to PDF with color preservation
      const imgData = canvas.toDataURL('image/png')
      
      if (yPosition + imgHeight <= pageHeight - 10) {
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight)
      } else {
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight)
      }

      // Add footer with page numbers
      const totalPages = pdf.internal.pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setFont(undefined, 'normal')
        pdf.setTextColor(148, 163, 184) // Light slate
        pdf.text(`Page ${i} of ${totalPages}`, pdfWidth - 20, pageHeight - 5)
      }

      pdf.save(`stock-report-${new Date().toLocaleDateString().replace(/\//g, '_')}.pdf`)
    }
  }

  return (
    <section className="page">
      <div className="page-hero">
        <div>
          <h1>Stock Report</h1>
          <p>Live stock balance summary with filters, status, and exports.</p>
        </div>
      </div>
      <div className="stock-report-toolbar no-export">
        <div className="stock-export-actions">
          <button onClick={() => exportReport('png')} className="btn btn-blue">Export PNG (High Quality)</button>
          <button onClick={() => exportReport('pdf')} className="btn btn-red">Export PDF (A4)</button>
        </div>
        <div className="stock-date-controls">
          <div className="stock-date-controls-row">
            <div className="stock-date-group">
              <label>Date Mode</label>
              <select value={draftDateMode} onChange={(e) => setDraftDateMode(e.target.value)}>
                <option value="asof">As of Date</option>
                <option value="range">Date Range</option>
              </select>
            </div>

            {draftDateMode === 'asof' ? (
              <div className="stock-date-group">
                <label>As of</label>
                <div className="stock-date-input">
                  <input
                    type="text"
                    value={draftAsOfDate}
                    placeholder="dd-mm-yyyy"
                    onChange={(e) => setDraftAsOfDate(e.target.value)}
                  />
                  <input
                    type="date"
                    value={draftAsOfPicker}
                    onChange={(e) => {
                      const v = e.target.value
                      setDraftAsOfPicker(v)
                      if (v) {
                        const [yyyy, mm, dd] = v.split('-')
                        setDraftAsOfDate(`${dd}-${mm}-${yyyy}`)
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="stock-date-group">
                  <label>From</label>
                  <div className="stock-date-input">
                    <input
                      type="text"
                      value={draftFromDate}
                      placeholder="dd-mm-yyyy"
                      onChange={(e) => setDraftFromDate(e.target.value)}
                    />
                    <input
                      type="date"
                      value={draftFromPicker}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraftFromPicker(v)
                        if (v) {
                          const [yyyy, mm, dd] = v.split('-')
                          setDraftFromDate(`${dd}-${mm}-${yyyy}`)
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="stock-date-group">
                  <label>To</label>
                  <div className="stock-date-input">
                    <input
                      type="text"
                      value={draftToDate}
                      placeholder="dd-mm-yyyy"
                      onChange={(e) => setDraftToDate(e.target.value)}
                    />
                    <input
                      type="date"
                      value={draftToPicker}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraftToPicker(v)
                        if (v) {
                          const [yyyy, mm, dd] = v.split('-')
                          setDraftToDate(`${dd}-${mm}-${yyyy}`)
                        }
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              className="stock-date-apply"
              onClick={() => {
                setDateMode(draftDateMode)
                setAsOfDate(draftAsOfDate)
                setFromDate(draftFromDate)
                setToDate(draftToDate)
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
      <div id="stock-table-export" style={{background:'#fff',padding:20,borderRadius:12}}>
        <div style={{marginBottom:16}}>
          <h2 style={{margin:'0 0 8px 0',color:'#0f172a',fontSize:'18px'}}>RS Stock Report</h2>
          <p style={{margin:'0',fontSize:'12px',color:'#64748b'}}>Generated: {new Date().toLocaleString()}</p>
        </div>
        <div className="table-wrap">
          <table className="sheet">
            <thead>
            <tr>
              <th>
                Item 🔍
                <div className="no-export">
                  <input
                    value={search}
                    onChange={e=>setSearch(e.target.value)}
                    placeholder="Search..."
                    style={{    
                      width:'100%',   
                      marginTop:4,
                      padding:'4px 6px',
                      borderRadius:6,
                      fontSize:'12px'
                    }}
                  />
                </div>
              </th>

              <th style={{textAlign:'center'}}>
                Category 📁
                <div className="no-export">
                  <select 
                    value={categoryFilter}
                    onChange={e=>setCategoryFilter(e.target.value)}
                    style={{
                      width:'100%',
                      marginTop:4,
                      padding:'4px',
                      borderRadius:6,
                      fontSize:'12px'
                    }}
                  >
                    <option value="all">All</option>
                    {[...new Set([
                      ...items.map(i=>i.category),
                      ...(hasUnlisted ? ['Unlisted'] : [])
                    ])].map(cat=>(
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </th>

              <th style={{textAlign:'center'}}>In KG</th>
              <th style={{textAlign:'center'}}>Out KG</th>
              <th style={{textAlign:'center'}}>Balance KG</th>
              <th style={{textAlign:'center'}}>Balance PCS</th>

              <th>
                Status ⚙
                <div className="no-export">
                  <select
                    value={statusFilter}
                    onChange={e=>setStatusFilter(e.target.value)}
                    style={{
                      width:'100%',
                      marginTop:4,
                      padding:'4px',
                      borderRadius:6,
                      fontSize:'12px'
                    }}
                  >
                    <option value="all">All</option>
                    <option value="negative">Negative (KG or PCS)</option>
                    <option value="zero">Zero (KG and PCS)</option>
                    <option value="low">Low Only</option>
                    <option value="ok">OK Only</option>
                  </select>
                </div>  
              </th>
            </tr> 
            </thead>
            <tbody>
              {filteredKeys.map((key,i)=>{
                const s = stock[key]
                const balKg = s.inKg - s.outKg
                const balP = s.inPcs - s.outPcs
                const item = itemByName.get(key)
                const displayName = displayNameByKey.get(key) || key
                const balanceValue = getBalanceValue(s, item)
                const minStockValue = Number(item?.minStock || 0)
                const low = balanceValue < minStockValue
           
                return (
                  <tr 
                    key={i} 
                    className={`row-anim ${i % 2 === 0 ? 'zebra' : ''}`}
                    style={{animation:'fadeIn .25s ease'}}
                  >
                    <td style={{fontWeight:600}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span>{displayName}</span>
                        {!item && (
                          <span style={{background:'#fde68a',color:'#92400e',padding:'2px 8px',borderRadius:6,fontSize:'11px',fontWeight:700}}>
                            Unlisted
                          </span>
                        )}
                        {!item && (
                          <button
                            type="button"
                            onClick={() => addMissingItem(displayName)}
                            disabled={!canEditItems}
                            title={canEditItems ? 'Add to Item Master' : 'Staff cannot add items'}
                            style={{
                              background: canEditItems ? '#3b82f6' : '#cbd5f5',
                              color: '#fff',
                              border: 'none',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '11px',
                              cursor: canEditItems ? 'pointer' : 'not-allowed',
                              fontWeight: 700
                            }}
                          >
                            Add to Item Master
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{textAlign:'center',fontWeight:600}}>
                      {item?.category || 'Unlisted'}
                    </td>
                    <td style={{textAlign:'center'}}>{s.inKg.toFixed(3)}</td>
                    <td style={{textAlign:'center'}}>{s.outKg.toFixed(3)}</td>
                    <td style={{textAlign:'center'}}>{balKg.toFixed(3)}</td>
                    <td style={{textAlign:'center'}}>{balP}</td>
                    <td>{low ? <span style={{background:'#fecaca',color:'#991b1b',padding:'4px 10px',borderRadius:6,fontSize:'12px',fontWeight:600}}>⚠️ Low</span> : <span style={{background:'#bbf7d0',color:'#065f46',padding:'4px 10px',borderRadius:6,fontSize:'12px',fontWeight:600}}>✓ OK</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
