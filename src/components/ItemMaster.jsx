import React, { useState } from 'react'

const emptyEditForm = {
  name: '',
  category: 'Rod',
  conversion: '',
  minStock: '',
  minStockUnit: 'kg'
}

export default function ItemMaster({
  items,
  setItems,
  entries,
  setEntries,
  currentUser,
  categories,
  setCategories,
  companyId,
  onCopyFromRsTraders
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(categories && categories.length > 0 ? categories[0] : 'Rod')
  const [conversion, setConversion] = useState('')
  const [minStock, setMinStock] = useState('')
  const [minStockUnit, setMinStockUnit] = useState('kg')

  const [bulkText, setBulkText] = useState('')
  const [bulkRows, setBulkRows] = useState([])
  const [bulkMessage, setBulkMessage] = useState('')

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  const [editingIndex, setEditingIndex] = useState(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [itemFilter, setItemFilter] = useState('')
  const [categoryTableFilter, setCategoryTableFilter] = useState('all')
  const isStaff = String(currentUser?.role || '').toLowerCase() === 'staff'
  const isLaxmiAgency = companyId === 'laxmi_agency'

  const filteredItems = items
    .map((it, originalIndex) => ({ ...it, originalIndex }))
    .filter((it) => {
      if (itemFilter && !it.name.toLowerCase().includes(itemFilter.toLowerCase())) return false
      if (categoryTableFilter !== 'all' && it.category !== categoryTableFilter) return false
      return true
    })

  const add = () => {
    const n = name.trim()
    if (!n) return alert('Enter item name')
    if (items.some((i) => i.name.toLowerCase() === n.toLowerCase())) return alert('Item already exists')

    setItems((prev) => [
      ...prev,
      {
        name: n,
        category,
        conversion: category === 'Rod' ? Number(conversion || 0) : 0,
        minStock: Number(minStock) || 0,
        minStockUnit
      }
    ])

    setName('')
    setConversion('')
    setMinStock('')
  }

  const normalizeUnit = (value) => {
    const raw = String(value || '').trim().toLowerCase()
    if (!raw) return 'kg'
    if (raw === 'kg' || raw === 'kgs') return 'kg'
    if (raw === 'pcs' || raw === 'pc' || raw === 'piece' || raw === 'pieces') return 'pcs'
    return 'kg'
  }

  const parseBulkText = (text) => {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const rows = []
    lines.forEach((line, index) => {
      const delimiter = line.includes('\t') ? '\t' : line.includes('|') ? '|' : ','
      const parts = line.split(delimiter).map((part) => part.trim())
      if (parts.length < 2) return

      const lower = parts.map((p) => p.toLowerCase())
      if (
        index === 0 &&
        lower.some((p) => p.includes('item')) &&
        lower.some((p) => p.includes('category'))
      ) {
        return
      }

      const [rawName, rawCategory, rawConversion, rawMinStock, rawUnit] = parts
      const nameValue = String(rawName || '').trim()
      const categoryValue = String(rawCategory || '').trim() || 'Rod'
      const conversionValue = Number(rawConversion || 0)
      const minStockValue = Number(rawMinStock || 0)
      const unitValue = normalizeUnit(rawUnit)

      if (!nameValue) return

      rows.push({
        name: nameValue,
        category: categoryValue,
        conversion: Number.isFinite(conversionValue) ? conversionValue : 0,
        minStock: Number.isFinite(minStockValue) ? minStockValue : 0,
        minStockUnit: unitValue
      })
    })

    return rows
  }

  const handleParseBulk = () => {
    const parsed = parseBulkText(bulkText)
    setBulkRows(parsed)
    setBulkMessage(parsed.length ? `${parsed.length} rows ready.` : 'No valid rows found.')
  }

  const handleBulkFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setBulkText(text)
      const parsed = parseBulkText(text)
      setBulkRows(parsed)
      setBulkMessage(parsed.length ? `${parsed.length} rows ready.` : 'No valid rows found.')
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleApplyBulk = () => {
    if (isStaff) return alert('Staff cannot add items')
    if (!bulkRows.length) return alert('No bulk rows to add')

    const existingMap = new Map(items.map((it, idx) => [it.name.toLowerCase(), idx]))
    const duplicates = bulkRows.filter((row) => existingMap.has(row.name.toLowerCase()))
    let updateDuplicates = false
    if (duplicates.length > 0) {
      updateDuplicates = window.confirm(
        `${duplicates.length} items already exist. Click OK to update them, or Cancel to skip duplicates.`
      )
    }

    const nextItems = [...items]
    const newCategories = new Set(categories)
    let added = 0
    let updated = 0
    bulkRows.forEach((row) => {
      const key = row.name.toLowerCase()
      const existingIndex = existingMap.get(key)
      const resolvedCategory = row.category || 'Rod'
      if (resolvedCategory && !newCategories.has(resolvedCategory)) {
        newCategories.add(resolvedCategory)
      }

      const normalizedRow = {
        name: row.name.trim(),
        category: resolvedCategory,
        conversion: resolvedCategory === 'Rod' ? Number(row.conversion || 0) : 0,
        minStock: Number(row.minStock || 0),
        minStockUnit: row.minStockUnit === 'pcs' ? 'pcs' : 'kg'
      }

      if (existingIndex === undefined) {
        nextItems.push(normalizedRow)
        added += 1
      } else if (updateDuplicates) {
        nextItems[existingIndex] = { ...nextItems[existingIndex], ...normalizedRow }
        updated += 1
      }
    })

    setItems(nextItems)
    if (newCategories.size !== categories.length) {
      setCategories(Array.from(newCategories))
    }
    setBulkMessage(`Bulk saved. Added ${added}, updated ${updated}.`)
  }

  const remove = (i) => {
    const targetName = items[i].name
    if (entries.some((e) => e.item === targetName) && !window.confirm('Delete item and its transactions?')) return
    setEntries((prev) => prev.filter((e) => e.item !== targetName))
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  const startEdit = (i) => {
    if (currentUser?.role === 'staff') return alert('Staff cannot edit items')
    const it = items[i]
    setEditingIndex(i)
    setEditForm({
      name: it.name || '',
      category: it.category || (categories[0] || 'Rod'),
      conversion: String(it.conversion ?? ''),
      minStock: String(it.minStock ?? ''),
      minStockUnit: it.minStockUnit === 'pcs' ? 'pcs' : 'kg'
    })
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditForm(emptyEditForm)
  }

  const saveEdit = () => {
    if (editingIndex === null) return

    const updatedName = editForm.name.trim()
    if (!updatedName) return alert('Enter item name')

    const duplicate = items.find((it, idx) => idx !== editingIndex && it.name.toLowerCase() === updatedName.toLowerCase())
    if (duplicate) return alert('Item name already exists')

    const oldName = items[editingIndex].name
    const updatedCategory = editForm.category
    const updatedConversion = updatedCategory === 'Rod' ? Number(editForm.conversion || 0) : 0
    const updatedMinStock = Number(editForm.minStock) || 0
    const updatedMinStockUnit = editForm.minStockUnit === 'pcs' ? 'pcs' : 'kg'

    setItems((prev) =>
      prev.map((it, idx) =>
        idx === editingIndex
          ? {
              ...it,
              name: updatedName,
              category: updatedCategory,
              conversion: updatedConversion,
              minStock: updatedMinStock,
              minStockUnit: updatedMinStockUnit
            }
          : it
      )
    )

    if (oldName !== updatedName) {
      setEntries((prev) => prev.map((e) => (e.item === oldName ? { ...e, item: updatedName } : e)))
    }

    cancelEdit()
  }

  const addCategory = () => {
    const cat = newCategory.trim().toLowerCase()
    if (!cat) return alert('Enter category name')
    if (categories.some((c) => c.toLowerCase() === cat)) return alert('Category exists')
    setCategories((prev) => [...prev, newCategory.trim()])
    setNewCategory('')
    setShowCategoryForm(false)
  }

  const deleteCategory = (cat) => {
    if (
      items.some((i) => i.category === cat) &&
      !window.confirm(`Delete category? ${items.filter((i) => i.category === cat).length} items use this.`)
    ) {
      return
    }
    setCategories((prev) => prev.filter((c) => c !== cat))
    if (category === cat) setCategory(categories[0] || 'Rod')
  }

  return (
    <section className="page">
      <div className="page-hero">
        <div>
          <h1>Item Master</h1>
          <p>Build your item library with categories, stock limits, and conversions.</p>
        </div>
      </div>

      <div
        className="form-grid item-add-grid"
        style={{
          gap: 16,
          marginBottom: 24,
          padding: 20,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          animation: 'slideDown .3s ease'
        }}
      >
        <div className="form-group">
          <label>Item Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter item name" />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Conversion (kg)</label>
          <input value={conversion} onChange={(e) => setConversion(e.target.value)} placeholder="e.g., 2.67" type="number" />
        </div>
        <div className="form-group">
          <label>Min Stock</label>
          <input value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="e.g., 100" type="number" />
        </div>
        <div className="form-group">
          <label>Min Stock Unit</label>
          <select value={minStockUnit} onChange={(e) => setMinStockUnit(e.target.value)}>
            <option value="kg">KG</option>
            <option value="pcs">PCS</option>
          </select>
        </div>
        <div className="actions" style={{ gridColumn: '1/-1' }}>
          <button
            onClick={add}
            disabled={isStaff}
            title={isStaff ? 'Staff cannot add items' : ''}
            style={{
              background: isStaff ? '#d1d5db' : 'linear-gradient(135deg,#16a34a,#15803d)',
              opacity: isStaff ? 0.6 : 1
            }}
          >
            + Add Item
          </button>
          {isLaxmiAgency && (
            <button
              onClick={() => {
                if (isStaff) return
                if (!window.confirm('Copy items and categories from RS TRADERS and replace current list?')) return
                onCopyFromRsTraders?.()
              }}
              disabled={isStaff}
              title={isStaff ? 'Staff cannot copy items' : 'Copy items & categories from RS TRADERS'}
              style={{
                background: isStaff ? '#d1d5db' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                opacity: isStaff ? 0.6 : 1
              }}
            >
              Copy From RS TRADERS
            </button>
          )}
        </div>
      </div>

      <div className="bulk-entry-card">
        <div className="bulk-entry-header">
          <div>
            <h2>Bulk Entry</h2>
            <p>Paste rows or upload a CSV to add multiple items at once.</p>
          </div>
          <div className="bulk-entry-meta">
            <span className="bulk-chip">Auto-create categories</span>
            <span className="bulk-chip">Ask on duplicates</span>
          </div>
        </div>

        <div className="bulk-entry-grid">
          <div className="bulk-entry-panel">
            <label className="bulk-label">Paste Grid</label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Item Name, Category, Conversion, Min Stock, Unit"
              rows={7}
              className="bulk-textarea"
            />
            <div className="bulk-help">
              Supported delimiters: comma, tab, or pipe. Header row allowed.
            </div>
          </div>

          <div className="bulk-entry-panel">
            <label className="bulk-label">CSV Upload</label>
            <label className={`bulk-upload ${isStaff ? 'disabled' : ''}`}>
              <input type="file" accept=".csv" onChange={handleBulkFile} disabled={isStaff} />
              <div>
                <div className="bulk-upload-title">Choose CSV File</div>
                <div className="bulk-upload-subtitle">Columns: Item Name, Category, Conversion, Min Stock, Unit</div>
              </div>
            </label>
          </div>
        </div>

        <div className="bulk-actions">
          <div className="bulk-actions-left">
            <button onClick={handleParseBulk} className="bulk-btn bulk-btn-parse">
              Parse Bulk
            </button>
            <button
              onClick={handleApplyBulk}
              disabled={isStaff}
              className={`bulk-btn bulk-btn-save ${isStaff ? 'disabled' : ''}`}
            >
              Save Bulk
            </button>
          </div>
          {bulkMessage && <div className="bulk-status">{bulkMessage}</div>}
        </div>
      </div>

      <h2 style={{ marginTop: 28, marginBottom: 12, color: '#1e293b' }}>Categories</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {categories.map((cat) => (
          <div
            key={cat}
            style={{
              background: '#f0f9ff',
              border: '1px solid #bfdbfe',
              padding: '8px 14px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              animation: 'fadeIn .25s ease'
            }}
          >
            <span style={{ fontWeight: 600, color: '#0369a1' }}>{cat}</span>
            <button
              onClick={() => deleteCategory(cat)}
              disabled={currentUser?.role === 'staff'}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '2px 8px',
                borderRadius: 4,
                cursor: currentUser?.role === 'staff' ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                opacity: currentUser?.role === 'staff' ? 0.6 : 1
              }}
            >
              x
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowCategoryForm(!showCategoryForm)}
          disabled={currentUser?.role === 'staff'}
          style={{
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 8,
            cursor: currentUser?.role === 'staff' ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: currentUser?.role === 'staff' ? 0.6 : 1
          }}
        >
          + Add Category
        </button>
      </div>

      {showCategoryForm && (
        <div
          style={{
            background: '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            border: '2px solid #7c3aed',
            animation: 'slideDown .3s ease',
            display: 'flex',
            gap: 8
          }}
        >
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e6eef6' }}
          />
          <button
            onClick={addCategory}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowCategoryForm(false)
              setNewCategory('')
            }}
            style={{ background: '#9ca3af', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
        </div>
      )}

      <h2 style={{ marginTop: 24, marginBottom: 16, color: '#1e293b' }}>Items Library</h2>

      {editingIndex !== null && (
        <div
          style={{
            background: '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
            border: '2px solid #3b82f6',
            animation: 'slideDown .3s ease'
          }}
        >
          <h3 style={{ marginTop: 0 }}>Edit Item</h3>
          <div className="form-grid item-edit-grid" style={{ gap: 12 }}>
            <div className="form-group">
              <label>Item Name</label>
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Conversion (kg)</label>
              <input
                type="number"
                value={editForm.conversion}
                onChange={(e) => setEditForm((f) => ({ ...f, conversion: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Min Stock</label>
              <input
                type="number"
                value={editForm.minStock}
                onChange={(e) => setEditForm((f) => ({ ...f, minStock: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Min Stock Unit</label>
              <select
                value={editForm.minStockUnit}
                onChange={(e) => setEditForm((f) => ({ ...f, minStockUnit: e.target.value }))}
              >
                <option value="kg">KG</option>
                <option value="pcs">PCS</option>
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button onClick={saveEdit} style={{ background: '#16a34a' }}>
              Save Changes
            </button>
            <button onClick={cancelEdit} style={{ background: '#94a3b8' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>
                Item Name
                <div>
                  <input
                    value={itemFilter}
                    onChange={(e) => setItemFilter(e.target.value)}
                    placeholder="Search item..."
                    style={{ width: '100%', marginTop: 4, padding: '4px 6px', borderRadius: 6, fontSize: '12px' }}
                  />
                </div>
              </th>
              <th style={{ textAlign: 'center' }}>
                Category
                <div>
                  <select
                    value={categoryTableFilter}
                    onChange={(e) => setCategoryTableFilter(e.target.value)}
                    style={{ width: '100%', marginTop: 4, padding: '4px', borderRadius: 6, fontSize: '12px' }}
                  >
                    <option value="all">All</option>
                    {[...new Set(items.map((i) => i.category))].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </th>
              <th style={{ textAlign: 'center' }}>Conversion</th>
              <th style={{ textAlign: 'center' }}>Min Stock</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((it) => (
              <tr key={`${it.name}-${it.originalIndex}`} className="row-anim" style={{ animation: 'fadeIn .25s ease' }}>
                <td style={{ fontWeight: 600, textAlign: 'left' }}>{it.name}</td>
                <td style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      background: it.category === 'Rod' ? '#dbeafe' : '#fef3c7',
                      color: it.category === 'Rod' ? '#0369a1' : '#92400e',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    {it.category}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>{Number(it.conversion).toFixed(2)} kg</td>
                <td style={{ textAlign: 'center' }}>
                  {it.minStock} {(it.minStockUnit === 'pcs' ? 'pcs' : 'kg').toUpperCase()}
                </td>
                <td style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button
                    onClick={() => startEdit(it.originalIndex)}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: currentUser?.role === 'staff' ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: '.2s',
                      opacity: currentUser?.role === 'staff' ? 0.6 : 1
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(it.originalIndex)}
                    disabled={currentUser?.role === 'staff'}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: currentUser?.role === 'staff' ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: '.2s',
                      opacity: currentUser?.role === 'staff' ? 0.6 : 1
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
