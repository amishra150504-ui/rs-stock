import React, { useState, useEffect } from 'react'
import { ROD_CONVERSIONS } from '../App.jsx'

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
  const [date, setDate] = useState(() => localStorage.getItem('rs_last_date') || '')
  const [remarks, setRemarks] = useState('')
  const [lastChanged, setLastChanged] = useState(null)
  const [bulk, setBulk] = useState('')
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
    if (!it || it.conversion <= 0) return
    if (lastChanged === 'kg') {
      const k = parseFloat(kg) || 0
      setPcs(Math.round(k / it.conversion))
    } else if (lastChanged === 'pcs') {
      const p = parseFloat(pcs) || 0
      setKg((p * it.conversion).toFixed(3))
    }
  }, [kg, pcs, item, lastChanged, items])

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  )
  const save = () => {
    if (!item || (!kg && !pcs)) return alert('Fill item & qty')
    const selected = items.find(i => i.name === item)
    let calculatedKg = Number(kg || 0)
    if (selected && selected.conversion > 0 && pcs) calculatedKg = Number((pcs * selected.conversion).toFixed(3))
    
    if (type === 'Stock Out') {
      const currentBalance = entries
        .filter(e => e.item === item)
        .reduce((acc, e) => {
          return e.type === 'Stock In'
            ? acc + Number(e.kg)
            : acc - Number(e.kg)
        }, 0)

      if (currentBalance - calculatedKg < 0) {
        return alert('Cannot stock out more than available quantity')
      }
    }

    const newEntry = {
      id: entryCounter,
      item,
      type,
      kg: calculatedKg,
      pcs: Number(pcs || 0),
      date,
      remarks
    }
    setEntryCounter(prev => prev + 1)
    setEntries(prev => [...prev, newEntry])
    setDailyEntries(prev => [...prev, newEntry])
    setItem(''); setKg(''); setPcs(''); setRemarks('')
  }

  const handleBulk = () => {
    if (!bulk.trim()) return alert('Paste bulk lines')
    const lines = bulk.split('\n')
    const parsed = []
    lines.forEach(l => {
      const p = l.split(',').map(x=>x.trim())
      if (p.length>=3) {
        parsed.push({
          id: entryCounter + parsed.length,
          item: p[0],
          type: p[1] || 'Stock In',
          kg: Number(p[2]) || 0,
          pcs: Number(p[3]) || 0,
          date: p[4] || date,
          remarks: p[5] || ''
        })
      }
    })
    if (!parsed.length) return alert('No valid lines')
    setEntries(prev => [...prev, ...parsed])
    setDailyEntries(prev => [...prev, ...parsed])
    setEntryCounter(prev => prev + parsed.length)
    setBulk('')
  }

  const handleBulkImport = () => {

    const newEntries = []

    for (let row of bulkRows) {

      if (!row.item.trim()) continue

      const matchedItem = items.find(i =>
        i.name.toLowerCase() === row.item.toLowerCase()
      )

      if (!matchedItem) {
        alert(`Item not found: ${row.item}`)
        return
      }

      let calculatedKg = Number(row.kg || 0)
      let pcsValue = Number(row.pcs || 0)

      // Smart bidirectional conversion
      if (matchedItem.conversion > 0) {

        if (pcsValue && !row.kg) {
          calculatedKg = Number((pcsValue * matchedItem.conversion).toFixed(3))
        }

        else if (calculatedKg && !row.pcs) {
          pcsValue = Math.round(calculatedKg / matchedItem.conversion)
        }

        else if (pcsValue && calculatedKg) {
          calculatedKg = Number((pcsValue * matchedItem.conversion).toFixed(3))
        }
      }

      // Negative validation
      if (row.type === 'Stock Out') {
        const currentBalance = entries
          .filter(e => e.item === matchedItem.name)
          .reduce((acc, e) => {
            return e.type === 'Stock In'
              ? acc + Number(e.kg)
              : acc - Number(e.kg)
          }, 0)

        if (currentBalance - calculatedKg < 0) {
          alert(`Stock Out exceeds balance for ${matchedItem.name}`)
          return
        }
      }

      newEntries.push({
        id: entryCounter + newEntries.length,
        item: matchedItem.name,
        type: row.type,
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
  return (
    <section className="page">
      <h1>Stock Entry</h1>
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
              <div key={s} className="chip" onClick={() => { setKg(c); setItem(`${s}mm Rod`); setLastChanged('kg') }}>{s}mm → {c} kg</div>
            ))}
          </div>
        </div>

      </div>

      <div className="actions right" style={{display:'flex',gap:12}}>
        <button onClick={save}>Save Entry</button>
        <button 
          style={{background:'#1d4ed8'}}
          onClick={()=>setShowBulkModal(true)}
        >
          Bulk Import
        </button>
      </div>

      {showBulkModal && (
        <div style={{
          position:'fixed',
          inset:0,
          background:'rgba(0,0,0,0.4)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:2000
        }}>
          <div style={{
            background:'#fff',
            width:'min(96vw, 800px)',
            maxWidth:800,
            borderRadius:12,
            padding:16,
            maxHeight:'80vh',
            overflowY:'auto'
          }}>
            <h2 style={{textAlign:'center'}}>Bulk Import</h2>

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
                  style={{
                    background:'#3b82f6',
                    color:'#fff',
                    border:'none',
                    padding:'6px 14px',
                    borderRadius:6,
                    cursor:'pointer'
                  }}
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
              <button
                onClick={()=>setShowBulkModal(false)}
                style={{
                  background:'#3b82f6',
                  color:'#fff',
                  border:'none',
                  padding:'8px 16px',
                  borderRadius:8,
                  cursor:'pointer',
                  fontWeight:500
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleBulkImport}
                style={{
                  background:'#16a34a',
                  color:'#fff',
                  border:'none',
                  padding:'8px 16px',
                  borderRadius:8,
                  cursor:'pointer',
                  fontWeight:600
                }}
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
