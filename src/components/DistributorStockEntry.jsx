import React, { useEffect, useState } from 'react'
import { ROD_CONVERSIONS } from '../App.jsx'

const blankLine = () => ({
  id: `line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  item: '',
  kg: '',
  pcs: '',
  lastChanged: null
})

export default function DistributorStockEntry({
  entries,
  setEntries,
  items,
  dailyEntries,
  setDailyEntries,
  distributorCompanies,
  sellingParties,
  entryCounter,
  setEntryCounter
}) {
  const [distributorCompany, setDistributorCompany] = useState('')
  const [sellingParty, setSellingParty] = useState('')
  const [date, setDate] = useState(() => localStorage.getItem('rs_traders_distributor_last_stock_date') || '')
  const [lines, setLines] = useState(() => [blankLine()])
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (date) localStorage.setItem('rs_traders_distributor_last_stock_date', date)
  }, [date])

  const itemConversion = (itemName) => {
    const selected = items.find((item) => item.name === itemName)
    const conversion = Number(selected?.conversion || 0)
    if (conversion > 0) return conversion
    const match = String(itemName || '').toLowerCase().match(/(\d+(?:\.\d+)?)\s*mm/)
    return match ? Number(ROD_CONVERSIONS[match[1]] || 0) : 0
  }

  const calculateLine = (line) => {
    const conversion = itemConversion(line.item)
    if (!conversion) return line

    if (line.lastChanged === 'kg') {
      const kg = parseFloat(line.kg) || 0
      return { ...line, pcs: kg ? String(Math.round(kg / conversion)) : '' }
    }

    if (line.lastChanged === 'pcs') {
      const pcs = parseFloat(line.pcs) || 0
      return { ...line, kg: pcs ? (pcs * conversion).toFixed(3) : '' }
    }

    return line
  }

  const updateLine = (id, changes) => {
    setLines((prev) => prev.map((line) => (
      line.id === id ? calculateLine({ ...line, ...changes }) : line
    )))
  }

  const addLine = () => setLines((prev) => [...prev, blankLine()])

  const removeLine = (id) => {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((line) => line.id !== id))
  }

  const save = () => {
    if (!distributorCompany) return alert('Select distributor company')
    if (!sellingParty) return alert('Select selling party')
    if (!date) return alert('Select date')

    const validLines = lines.filter((line) => line.item && (line.kg || line.pcs))
    if (!validLines.length) return alert('Add at least one item with quantity')

    const batchId = `dist-entry-${Date.now()}`
    const newEntries = validLines.map((line, index) => {
      const conversion = itemConversion(line.item)
      const calculatedKg = line.pcs && conversion
        ? Number((Number(line.pcs) * conversion).toFixed(3))
        : Number(line.kg || 0)
      const calculatedPcs = line.pcs
        ? Number(line.pcs || 0)
        : conversion && calculatedKg
          ? Math.round(calculatedKg / conversion)
          : 0

      return {
        id: Number(entryCounter || 1) + index,
        entryKind: 'distributor-sale',
        batchId,
        distributorCompany,
        sellingParty,
        item: line.item,
        type: 'Stock Out',
        kg: calculatedKg,
        pcs: calculatedPcs,
        date,
        remarks
      }
    })

    setEntryCounter((prev) => Number(prev || 1) + newEntries.length)
    setEntries((prev) => [...prev, ...newEntries])
    setDailyEntries((prev) => [...prev, ...newEntries])
    setLines([blankLine()])
    setRemarks('')
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
    const tagName = event.target.tagName
    if (['TEXTAREA', 'BUTTON', 'SELECT'].includes(tagName)) return
    event.preventDefault()
    save()
  }

  return (
    <section className="page distributor-stock-entry" onKeyDown={handleKeyDown}>
      <div className="page-hero">
        <div>
          <p className="eyebrow">RS Traders - Distributor</p>
          <h1>Stock Entry</h1>
          <p>Select distributor and party once, then enter multiple items in the same entry.</p>
        </div>
      </div>

      <div className="distributor-entry-card">
        <div className="form-grid distributor-entry-top">
          <div className="form-group">
            <label>Select Distributor Company</label>
            <select value={distributorCompany} onChange={(event) => setDistributorCompany(event.target.value)}>
              <option value="">Select distributor company</option>
              {distributorCompanies.map((company) => (
                <option key={company.id} value={company.name}>{company.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="form-group">
            <label>Select Selling Party</label>
            <select value={sellingParty} onChange={(event) => setSellingParty(event.target.value)}>
              <option value="">Select selling party</option>
              {sellingParties.map((party) => (
                <option key={party.id} value={party.name}>{party.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="multi-entry-list">
          <div className="multi-entry-header">
            <span>Item</span>
            <span>KG</span>
            <span>PCS</span>
            <span></span>
          </div>
          {lines.map((line, index) => (
            <div className="multi-entry-row" key={line.id}>
              <div className="form-group">
                <label>Item {index + 1}</label>
                <select value={line.item} onChange={(event) => updateLine(line.id, { item: event.target.value })}>
                  <option value="">Select item</option>
                  {items.map((item, itemIndex) => (
                    <option key={item.id || itemIndex} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity in KG</label>
                <input
                  type="number"
                  value={line.kg}
                  onChange={(event) => updateLine(line.id, { kg: event.target.value, lastChanged: 'kg' })}
                  placeholder="KG"
                />
              </div>
              <div className="form-group">
                <label>Quantity in PCS</label>
                <input
                  type="number"
                  value={line.pcs}
                  onChange={(event) => updateLine(line.id, { pcs: event.target.value, lastChanged: 'pcs' })}
                  placeholder="PCS"
                />
              </div>
              <button className="line-remove-btn" onClick={() => removeLine(line.id)} disabled={lines.length === 1}>
                Remove
              </button>
            </div>
          ))}
          <button className="add-line-btn" onClick={addLine}>+ Add Another Item</button>
        </div>

        <div className="form-group">
          <label>Remarks</label>
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Write remarks for this entry" />
        </div>

        <div className="actions right">
          <button onClick={save}>Save Entry</button>
        </div>
      </div>
    </section>
  )
}
