import React, { useState } from 'react'

export default function ItemMaster({ items, setItems, entries, setEntries, currentUser, categories, setCategories }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(categories && categories.length > 0 ? categories[0] : 'Rod')
  const [conversion, setConversion] = useState('')
  const [minStock, setMinStock] = useState('')
  
  // Category management
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  const add = () => {
    const n = name.trim(); if (!n) return alert('name')
    if (items.some(i=>i.name.toLowerCase()===n.toLowerCase())) return alert('exists')
    setItems(prev=>[...prev, { name: n, category, conversion: category==='Rod'?Number(conversion||0):0, minStock: Number(minStock)||0 }])
    setName(''); setConversion(''); setMinStock('')
  }

  const bulkAdd = (text) => {
    const lines = text.split('\n'); const newItems = []
    lines.forEach(l=>{ const p=l.split(',').map(x=>x.trim()); if (p.length>=4) newItems.push({ name: p[0], category: p[1], conversion: Number(p[2]), minStock: Number(p[3]) }) })
    if (!newItems.length) return alert('no items')
    setItems(prev=>[...prev, ...newItems])
  }

  const remove = (i) => {
    const name = items[i].name
    if (entries.some(e=>e.item===name) && !window.confirm('Delete item and its transactions?')) return
    setEntries(prev=>prev.filter(e=>e.item!==name))
    setItems(prev=>prev.filter((_,idx)=>idx!==i))
  }

  const addCategory = () => {
    const cat = newCategory.trim().toLowerCase()
    if (!cat) return alert('Enter category name')
    if (categories.some(c => c.toLowerCase() === cat)) return alert('Category exists')
    setCategories(prev => [...prev, newCategory.trim()])
    setNewCategory('')
    setShowCategoryForm(false)
  }

  const deleteCategory = (cat) => {
    if (items.some(i => i.category === cat) && !window.confirm(`Delete category? ${items.filter(i=>i.category===cat).length} items use this.`)) return
    setCategories(prev => prev.filter(c => c !== cat))
    if (category === cat) setCategory(categories[0] || 'Rod')
  }

  return (
    <section className="page">
      <h1>Item Master</h1>
      
      {/* Add Item Form */}
      <div className="form-grid" style={{gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:24,padding:20,background:'#fff',borderRadius:12,boxShadow:'0 4px 12px rgba(0,0,0,0.04)',animation:'slideDown .3s ease'}}>
        <div className="form-group"><label>Item Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter item name" /></div>
        <div className="form-group"><label>Category</label><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="form-group"><label>Conversion (kg)</label><input value={conversion} onChange={e=>setConversion(e.target.value)} placeholder="e.g., 2.67" type="number" /></div>
        <div className="form-group"><label>Min Stock (kg)</label><input value={minStock} onChange={e=>setMinStock(e.target.value)} placeholder="e.g., 100" type="number" /></div>
        <div className="actions" style={{gridColumn:'1/-1'}}><button onClick={add} disabled={currentUser?.role==='staff'} title={currentUser?.role==='staff'?'Staff cannot add items':''} style={{background:currentUser?.role==='staff'?'#d1d5db':'linear-gradient(135deg,#16a34a,#15803d)',opacity:currentUser?.role==='staff'?0.6:1}}>+ Add Item</button></div>
      </div>

      {/* Category Management */}
      <h2 style={{marginTop:28,marginBottom:12,color:'#1e293b'}}>📁 Categories</h2>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
        {categories.map(cat => (
          <div key={cat} style={{background:'#f0f9ff',border:'1px solid #bfdbfe',padding:'8px 14px',borderRadius:8,display:'flex',alignItems:'center',gap:8,animation:'fadeIn .25s ease'}}>
            <span style={{fontWeight:600,color:'#0369a1'}}>{cat}</span>
            <button onClick={() => deleteCategory(cat)} disabled={currentUser?.role==='staff'} style={{background:'#ef4444',color:'#fff',border:'none',padding:'2px 8px',borderRadius:4,cursor:currentUser?.role==='staff'?'not-allowed':'pointer',fontSize:'11px',opacity:currentUser?.role==='staff'?0.6:1}}>✕</button>
          </div>
        ))}
        <button onClick={() => setShowCategoryForm(!showCategoryForm)} disabled={currentUser?.role==='staff'} style={{background:'#7c3aed',color:'#fff',border:'none',padding:'8px 14px',borderRadius:8,cursor:currentUser?.role==='staff'?'not-allowed':'pointer',fontWeight:600,opacity:currentUser?.role==='staff'?0.6:1}}>+ Add Category</button>
      </div>

      {showCategoryForm && (
        <div style={{background:'#fff',padding:16,borderRadius:12,marginBottom:20,border:'2px solid #7c3aed',animation:'slideDown .3s ease',display:'flex',gap:8}}>
          <input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="New category name" style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid #e6eef6'}} />
          <button onClick={addCategory} style={{background:'#7c3aed',color:'#fff',border:'none',padding:'8px 14px',borderRadius:8,cursor:'pointer',fontWeight:600}}>Add</button>
          <button onClick={() => {setShowCategoryForm(false); setNewCategory('')}} style={{background:'#9ca3af',color:'#fff',border:'none',padding:'8px 14px',borderRadius:8,cursor:'pointer',fontWeight:600}}>Cancel</button>
        </div>
      )}

      <h2 style={{marginTop:24,marginBottom:16,color:'#1e293b'}}>Items Library</h2>
      <div className="table-wrap">
        <table className="sheet"><thead><tr><th>Item Name</th><th>Category</th><th>Conversion</th><th>Min Stock</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((it,i)=> (
            <tr key={i} className="row-anim" style={{animation:'fadeIn .25s ease'}}>
              <td style={{fontWeight:600}}>{it.name}</td>
              <td><span style={{background:it.category==='Rod'?'#dbeafe':'#fef3c7',color:it.category==='Rod'?'#0369a1':'#92400e',padding:'4px 10px',borderRadius:6,fontSize:'12px',fontWeight:600}}>{it.category}</span></td>
              <td style={{textAlign:'right'}}>{Number(it.conversion).toFixed(2)} kg</td>
              <td style={{textAlign:'right'}}>{it.minStock}</td>
              <td style={{display:'flex',gap:6}}>
                <button onClick={()=>{
                  if (currentUser?.role==='staff') return alert('Staff cannot edit items')
                  const newName = prompt('Edit item name', it.name)
                  if (!newName) return
                  setItems(prev => prev.map((p,idx) => idx===i ? {...p, name: newName} : p))
                }} style={{background:'#3b82f6',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:currentUser?.role==='staff'?'not-allowed':'pointer',fontSize:'13px',fontWeight:600,transition:'.2s',opacity:currentUser?.role==='staff'?0.6:1}}>Edit</button>
                <button onClick={()=>remove(i)} disabled={currentUser?.role==='staff'} style={{background:'#ef4444',color:'#fff',border:'none',padding:'6px 12px',borderRadius:6,cursor:currentUser?.role==='staff'?'not-allowed':'pointer',fontSize:'13px',fontWeight:600,transition:'.2s',opacity:currentUser?.role==='staff'?0.6:1}}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </section>
  )
}
