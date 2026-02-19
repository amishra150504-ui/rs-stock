import React, { useState, useEffect } from 'react'
import { ROD_CONVERSIONS } from '../App.jsx'

export default function StockEntry({ entries, setEntries, items, dailyEntries, setDailyEntries }) {
  const [item, setItem] = useState('')
  const [type, setType] = useState('Stock In')
  const [kg, setKg] = useState('')
  const [pcs, setPcs] = useState('')
  const [date, setDate] = useState(() => localStorage.getItem('rs_last_date') || '')
  const [remarks, setRemarks] = useState('')
  const [lastChanged, setLastChanged] = useState(null)
  const [bulk, setBulk] = useState('')

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

  const save = () => {
    if (!item || (!kg && !pcs)) return alert('Fill item & qty')
    const selected = items.find(i => i.name === item)
    let calculatedKg = Number(kg || 0)
    if (selected && selected.conversion > 0 && pcs) calculatedKg = Number((pcs * selected.conversion).toFixed(3))
    const newEntry = { item, type, kg: calculatedKg, pcs: Number(pcs||0), date, remarks }
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
        parsed.push({ item: p[0], type: p[1]||'Stock In', kg: Number(p[2])||0, pcs: Number(p[3])||0, date: p[4]||date, remarks: p[5]||'' })
      }
    })
    if (!parsed.length) return alert('No valid lines')
    setEntries(prev => [...prev, ...parsed])
    setDailyEntries(prev => [...prev, ...parsed])
    setBulk('')
  }

  return (
    <section className="page">
      <h1>Stock Entry</h1>
      <div className="form-grid">
        <div className="form-group">
          <label>Item</label>
          <select value={item} onChange={e=>setItem(e.target.value)}>
            <option value="">Select Item</option>
            {items.map((it,i)=>(<option key={i} value={it.name}>{it.name}</option>))}
          </select>
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

      <div className="actions right">
        <button onClick={save}>Save Entry</button>
      </div>

      <div style={{marginTop:20}}>
        <h3>Bulk Entry</h3>
        <textarea value={bulk} onChange={e=>setBulk(e.target.value)} placeholder="Item,Type,KG,PCS,Date,Remarks per line" />
        <div className="actions"><button onClick={handleBulk}>Add Bulk</button></div>
      </div>
    </section>
  )
}
