import React, { useEffect, useRef, useState } from 'react'

const normalizeUnit = (value) => (value === 'pcs' ? 'pcs' : 'kg')

const buildEntry = ({
  id,
  item,
  qty,
  unit,
  kg,
  pcs,
  date,
  purchasedFrom,
  soldTo,
  purchaseKg,
  purchasePcs,
  remark
}) => {
  const numericQty = Number(qty || 0)
  const normalizedUnit = normalizeUnit(unit)
  const kgValue = Number(kg || 0)
  const pcsValue = Number(pcs || 0)

  return {
    id,
    item: item.trim(),
    qty: numericQty,
    unit: normalizedUnit,
    kg: kgValue,
    pcs: pcsValue,
    type: 'Sale',
    date,
    purchasedFrom: purchasedFrom.trim(),
    soldTo: soldTo.trim(),
    purchaseKg: Number(purchaseKg || 0),
    purchasePcs: Number(purchasePcs || 0),
    remark: String(remark || '').trim()
  }
}

export default function SalesEntry({
  entries,
  setEntries,
  dailyEntries,
  setDailyEntries,
  entryCounter,
  setEntryCounter,
  items = [],
  purchaseParties = [],
  saleParties = []
}) {
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [showPurchaseDropdown, setShowPurchaseDropdown] = useState(false)
  const [date, setDate] = useState(() => localStorage.getItem('rs_laxmi_last_date') || '')
  const [purchasedFrom, setPurchasedFrom] = useState('')
  const soldIdRef = useRef(1)
  const itemIdRef = useRef(1)
  const createSoldRow = (overrides = {}) => ({
    id: soldIdRef.current++,
    soldTo: '',
    search: '',
    show: false,
    kg: '',
    pcs: '',
    lastChanged: null,
    ...overrides
  })

  const createItemRow = (overrides = {}) => ({
    id: itemIdRef.current++,
    item: '',
    itemSearch: '',
    showItemDropdown: false,
    purchaseKg: '',
    purchasePcs: '',
    purchaseLastChanged: null,
    remark: '',
    soldRows: [createSoldRow()],
    ...overrides
  })

  const [itemRows, setItemRows] = useState(() => [createItemRow()])

  const filteredPurchaseParties = purchaseParties.filter((p) =>
    p.toLowerCase().includes(purchaseSearch.toLowerCase())
  )

  const getFilteredSaleParties = (value) =>
    saleParties.filter((p) => p.toLowerCase().includes(String(value || '').toLowerCase()))

  const updateItemRow = (id, patch) => {
    setItemRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addItemRow = () => {
    setItemRows((prev) => [...prev, createItemRow()])
  }

  const removeItemRow = (id) => {
    setItemRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev))
  }

  const updateSoldRow = (itemId, soldId, patch) => {
    setItemRows((prev) =>
      prev.map((row) => {
        if (row.id !== itemId) return row
        return {
          ...row,
          soldRows: row.soldRows.map((s) => (s.id === soldId ? { ...s, ...patch } : s))
        }
      })
    )
  }

  const addSoldRow = (itemId) => {
    setItemRows((prev) =>
      prev.map((row) =>
        row.id === itemId ? { ...row, soldRows: [...row.soldRows, createSoldRow()] } : row
      )
    )
  }

  const removeSoldRow = (itemId, soldId) => {
    setItemRows((prev) =>
      prev.map((row) => {
        if (row.id !== itemId) return row
        if (row.soldRows.length === 1) return row
        return { ...row, soldRows: row.soldRows.filter((s) => s.id !== soldId) }
      })
    )
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.form-group')) {
        setShowPurchaseDropdown(false)
        setItemRows((prev) =>
          prev.map((row) => ({
            ...row,
            showItemDropdown: false,
            soldRows: row.soldRows.map((s) => (s.show ? { ...s, show: false } : s))
          }))
        )
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    setItemRows((prev) => {
      let changed = false
      const next = prev.map((row) => {
        const selected = items.find((i) => i.name === row.item)
        if (!selected || selected.conversion <= 0) return row

        let nextRow = row
        if (row.purchaseLastChanged === 'kg') {
          const k = parseFloat(row.purchaseKg) || 0
          const nextP = k ? Math.round(k / selected.conversion) : ''
          if (String(nextP) !== String(row.purchasePcs)) {
            changed = true
            nextRow = { ...nextRow, purchasePcs: nextP }
          }
        } else if (row.purchaseLastChanged === 'pcs') {
          const p = parseFloat(row.purchasePcs) || 0
          const nextK = p ? (p * selected.conversion).toFixed(3) : ''
          if (String(nextK) !== String(row.purchaseKg)) {
            changed = true
            nextRow = { ...nextRow, purchaseKg: nextK }
          }
        }

        const nextSold = nextRow.soldRows.map((s) => {
          if (s.lastChanged === 'kg') {
            const k = parseFloat(s.kg) || 0
            const nextP = k ? Math.round(k / selected.conversion) : ''
            if (String(nextP) !== String(s.pcs)) {
              changed = true
              return { ...s, pcs: nextP }
            }
          } else if (s.lastChanged === 'pcs') {
            const p = parseFloat(s.pcs) || 0
            const nextK = p ? (p * selected.conversion).toFixed(3) : ''
            if (String(nextK) !== String(s.kg)) {
              changed = true
              return { ...s, kg: nextK }
            }
          }
          return s
        })

        if (nextSold !== nextRow.soldRows) {
          return { ...nextRow, soldRows: nextSold }
        }
        return nextRow
      })
      return changed ? next : prev
    })
  }, [items, itemRows])

  const handleSave = () => {
    if (!purchasedFrom.trim()) return alert('Enter Purchased From')
    if (!date) return alert('Select date')

    const usableItems = itemRows.filter((row) => {
      const hasItem = String(row.item || '').trim()
      const hasPurchase = Number(row.purchaseKg || 0) || Number(row.purchasePcs || 0)
      const hasSold = row.soldRows.some((s) => s.soldTo || Number(s.kg || 0) || Number(s.pcs || 0))
      return hasItem || hasPurchase || hasSold
    })

    if (usableItems.length === 0) return alert('Add at least one item')

    for (const row of usableItems) {
      if (!String(row.item || '').trim()) return alert('Enter item name for all item rows')
      const purchaseKgNum = Number(row.purchaseKg || 0)
      const purchasePcsNum = Number(row.purchasePcs || 0)
      if (!purchaseKgNum && !purchasePcsNum) return alert('Enter purchase quantity for all item rows')
      const validSoldRows = row.soldRows.filter((s) => {
        const qtyKg = Number(s.kg || 0)
        const qtyPcs = Number(s.pcs || 0)
        const name = String(s.soldTo || '').trim()
        if (!name && !qtyKg && !qtyPcs) return false
        if (!name) return false
        if (!qtyKg && !qtyPcs) return false
        return true
      })
      if (validSoldRows.length === 0) return alert('Enter Sold To and quantity for all items')
      if (validSoldRows.length !== row.soldRows.filter((s) => s.soldTo || s.kg || s.pcs).length) {
        return alert('Fill Sold To and quantity for all filled rows')
      }
    }

    let nextId = entryCounter
    const newEntries = []
    usableItems.forEach((itemRow) => {
      const selected = items.find((i) => i.name === itemRow.item)
      const purchaseKgNum = Number(itemRow.purchaseKg || 0)
      const purchasePcsNum = Number(itemRow.purchasePcs || 0)
      let finalPurchaseKg = purchaseKgNum
      let finalPurchasePcs = purchasePcsNum
      if (selected?.conversion > 0) {
        if (itemRow.purchaseLastChanged === 'kg' && purchaseKgNum && !purchasePcsNum) {
          finalPurchasePcs = Math.round(purchaseKgNum / selected.conversion)
        }
        if (itemRow.purchaseLastChanged === 'pcs' && purchasePcsNum && !purchaseKgNum) {
          finalPurchaseKg = Number((purchasePcsNum * selected.conversion).toFixed(3))
        }
      }

      const validSoldRows = itemRow.soldRows.filter((s) => {
        const qtyKg = Number(s.kg || 0)
        const qtyPcs = Number(s.pcs || 0)
        const name = String(s.soldTo || '').trim()
        if (!name && !qtyKg && !qtyPcs) return false
        if (!name || (!qtyKg && !qtyPcs)) return false
        return true
      })

      validSoldRows.forEach((row) => {
        const numericKg = Number(row.kg || 0)
        const numericPcs = Number(row.pcs || 0)
        let unit = row.lastChanged === 'pcs' ? 'pcs' : 'kg'
        let qtyValue = row.lastChanged === 'pcs' ? numericPcs : numericKg
        let finalKg = numericKg
        let finalPcs = numericPcs

        if (!row.lastChanged) {
          if (numericKg && !numericPcs) {
            unit = 'kg'
            qtyValue = numericKg
          } else if (numericPcs && !numericKg) {
            unit = 'pcs'
            qtyValue = numericPcs
          } else if (numericKg) {
            unit = 'kg'
            qtyValue = numericKg
          }
        }

        if (selected?.conversion > 0) {
          if (unit === 'kg' && numericKg && !numericPcs) {
            finalPcs = Math.round(numericKg / selected.conversion)
          }
          if (unit === 'pcs' && numericPcs && !numericKg) {
            finalKg = Number((numericPcs * selected.conversion).toFixed(3))
          }
        }

        newEntries.push(
          buildEntry({
            id: nextId++,
            item: itemRow.item,
            qty: qtyValue,
            unit,
            kg: finalKg,
            pcs: finalPcs,
            date,
            purchasedFrom,
            soldTo: row.soldTo,
            purchaseKg: finalPurchaseKg,
            purchasePcs: finalPurchasePcs,
            remark: itemRow.remark
          })
        )
      })
    })

    setEntryCounter((prev) => prev + newEntries.length)
    setEntries((prev) => [...prev, ...newEntries])
    setDailyEntries((prev) => [...prev, ...newEntries])

    localStorage.setItem('rs_laxmi_last_date', date)
    setPurchasedFrom('')
    setPurchaseSearch('')
    setItemRows([createItemRow()])
  }

  return (
    <section className="page sales-entry-page">
      <div className="sales-entry-hero">
        <div>
          <h1>Sales Entry</h1>
          <p>Quick single-line entry for same-day purchase and sale.</p>
        </div>
      </div>

      <div className="card sales-entry-card">
        <div className="form-grid">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
            <label>Purchased From</label>
            <input
              value={purchaseSearch}
              placeholder="Search purchase party..."
              onChange={(e) => {
                setPurchaseSearch(e.target.value)
                setPurchasedFrom(e.target.value)
                setShowPurchaseDropdown(true)
              }}
              onFocus={() => setShowPurchaseDropdown(true)}
            />
            {showPurchaseDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 6,
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 1000
              }}>
                {filteredPurchaseParties.length === 0 && (
                  <div style={{ padding: 8, fontSize: 12, color: '#999' }}>
                    No parties found
                  </div>
                )}
                {filteredPurchaseParties.map((name) => (
                  <div
                    key={name}
                    style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1' }}
                    onClick={() => {
                      setPurchasedFrom(name)
                      setPurchaseSearch(name)
                      setShowPurchaseDropdown(false)
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Items (Split by Item)</label>
            <div className="item-list">
              {itemRows.map((row, idx) => {
                const filteredItems = items.filter((i) =>
                  i.name.toLowerCase().includes(row.itemSearch.toLowerCase())
                )
                return (
                  <div key={row.id} className="item-block">
                    <div className="item-row-head">
                      <div className="item-row-title">Item {idx + 1}</div>
                      <button
                        type="button"
                        className="item-remove"
                        onClick={() => removeItemRow(row.id)}
                        disabled={itemRows.length === 1}
                      >
                        Remove Item
                      </button>
                    </div>

                    <div className="item-row-grid">
                      <div className="item-field" style={{ position: 'relative' }}>
                        <label className="mini">Item</label>
                        <input
                          value={row.itemSearch}
                          placeholder={items?.length ? 'Search item...' : 'Add items in Item Master'}
                          onChange={(e) =>
                            updateItemRow(row.id, { itemSearch: e.target.value, showItemDropdown: true })
                          }
                          onFocus={() => updateItemRow(row.id, { showItemDropdown: true })}
                        />
                        {row.showItemDropdown && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            maxHeight: 200,
                            overflowY: 'auto',
                            zIndex: 1000
                          }}>
                            {filteredItems.length === 0 && (
                              <div style={{ padding: 8, fontSize: 12, color: '#999' }}>No items found</div>
                            )}
                            {filteredItems.map((it) => (
                              <div
                                key={it.name}
                                style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1' }}
                                onClick={() => {
                                  updateItemRow(row.id, {
                                    item: it.name,
                                    itemSearch: it.name,
                                    showItemDropdown: false
                                  })
                                }}
                              >
                                {it.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="item-field">
                        <label className="mini">Purchase KG</label>
                        <input
                          type="number"
                          value={row.purchaseKg}
                          onChange={(e) =>
                            updateItemRow(row.id, { purchaseKg: e.target.value, purchaseLastChanged: 'kg' })
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="item-field">
                        <label className="mini">Purchase PCS</label>
                        <input
                          type="number"
                          value={row.purchasePcs}
                          onChange={(e) =>
                            updateItemRow(row.id, { purchasePcs: e.target.value, purchaseLastChanged: 'pcs' })
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="item-remark">
                      <label className="mini">Remark</label>
                      <input
                        value={row.remark}
                        onChange={(e) => updateItemRow(row.id, { remark: e.target.value })}
                        placeholder="Remark..."
                      />
                    </div>

                    <div className="soldto-list">
                      <div className="soldto-label">Sold To (Split Sales)</div>
                      {row.soldRows.map((sold) => {
                        const filteredSaleParties = getFilteredSaleParties(sold.search)
                        return (
                          <div key={sold.id} className="soldto-row">
                            <div className="soldto-field">
                              <label className="mini">KG</label>
                              <input
                                type="number"
                                value={sold.kg}
                                onChange={(e) =>
                                  updateSoldRow(row.id, sold.id, { kg: e.target.value, lastChanged: 'kg' })
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="soldto-field">
                              <label className="mini">PCS</label>
                              <input
                                type="number"
                                value={sold.pcs}
                                onChange={(e) =>
                                  updateSoldRow(row.id, sold.id, { pcs: e.target.value, lastChanged: 'pcs' })
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="soldto-field soldto-party" style={{ position: 'relative' }}>
                              <label className="mini">Sold To</label>
                              <input
                                value={sold.search}
                                placeholder="Search sale party..."
                                onChange={(e) =>
                                  updateSoldRow(row.id, sold.id, {
                                    search: e.target.value,
                                    soldTo: e.target.value,
                                    show: true
                                  })
                                }
                                onFocus={() => updateSoldRow(row.id, sold.id, { show: true })}
                              />
                              {sold.show && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  background: '#fff',
                                  border: '1px solid #ddd',
                                  borderRadius: 6,
                                  maxHeight: 200,
                                  overflowY: 'auto',
                                  zIndex: 1000
                                }}>
                                  {filteredSaleParties.length === 0 && (
                                    <div style={{ padding: 8, fontSize: 12, color: '#999' }}>
                                      No parties found
                                    </div>
                                  )}
                                  {filteredSaleParties.map((name) => (
                                    <div
                                      key={name}
                                      style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1' }}
                                      onClick={() => {
                                        updateSoldRow(row.id, sold.id, { soldTo: name, search: name, show: false })
                                      }}
                                    >
                                      {name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="soldto-remove"
                              onClick={() => removeSoldRow(row.id, sold.id)}
                              disabled={row.soldRows.length === 1}
                              title="Remove Sold To"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      })}
                      <button type="button" className="soldto-add" onClick={() => addSoldRow(row.id)}>
                        + Add Sold To
                      </button>
                    </div>
                  </div>
                )
              })}
              <button type="button" className="item-add" onClick={addItemRow}>
                + Add Item
              </button>
            </div>
          </div>
        </div>

        <div className="actions right">
          <button onClick={handleSave}>Save Entry</button>
        </div>
      </div>

    </section>
  )
}
