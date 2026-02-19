import React, { useState } from 'react'

export default function DailyTransactions({ dailyEntries, setDailyEntries, currentUser }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})

  const start = (i) => { if (currentUser?.role === 'staff') return; setEditing(i); setDraft({ ...dailyEntries[i] }) }
  const cancel = () => { setEditing(null); setDraft({}) }
  const save = () => { setDailyEntries(prev=>{ const c=[...prev]; c[editing]=draft; return c }); cancel() }
  const del = (i) => { if (currentUser?.role === 'staff') return alert('Staff cannot delete transactions'); if (!confirm('Delete?')) return; setDailyEntries(prev=>prev.filter((_,idx)=>idx!==i)) }

  return (
    <section className="page">
      <h1>Daily Transactions</h1>
      <div className="table-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>KG</th>
              <th>PCS</th>
              <th>Date</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dailyEntries.map((d,i)=> (
              <tr key={i} className="row-anim" style={{animation:'fadeIn .25s ease'}}>
                <td>
                  {editing===i? (
                    <input value={draft.item||''} onChange={e=>setDraft({...draft,item:e.target.value})} style={{width:'100%',padding:'6px',borderRadius:4,border:'1px solid #ddd'}} />
                  ) : (
                    d.item
                  )}
                </td>
                <td>
                  {editing===i? (
                    <select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})} style={{width:'100%',padding:'6px',borderRadius:4,border:'1px solid #ddd'}}>
                      <option>Stock In</option>
                      <option>Stock Out</option>
                    </select>
                  ) : (
                    <span style={{background:d.type==='Stock In'?'#d1fae5':'#fee2e2',color:d.type==='Stock In'?'#065f46':'#991b1b',padding:'2px 8px',borderRadius:4,fontSize:'12px'}}>
                      {d.type}
                    </span>
                  )}
                </td>
                <td>
                  {editing===i? (
                    <input type="number" value={draft.kg||''} onChange={e=>setDraft({...draft,kg:e.target.value})} style={{width:'100%',padding:'6px',borderRadius:4,border:'1px solid #ddd'}} />
                  ) : (
                    Number(d.kg).toFixed(3)
                  )}
                </td>
                <td>
                  {editing===i? (
                    <input type="number" value={draft.pcs||''} onChange={e=>setDraft({...draft,pcs:e.target.value})} style={{width:'100%',padding:'6px',borderRadius:4,border:'1px solid #ddd'}} />
                  ) : (
                    d.pcs
                  )}
                </td>
                <td>
                  {editing===i? (
                    <input type="date" value={draft.date||''} onChange={e=>setDraft({...draft,date:e.target.value})} style={{width:'100%',padding:'6px',borderRadius:4,border:'1px solid #ddd'}} />
                  ) : (
                    d.date
                  )}
                </td>
                <td>
                  {editing===i? (
                    <input value={draft.remarks||''} onChange={e=>setDraft({...draft,remarks:e.target.value})} style={{width:'100%',padding:'6px',borderRadius:4,border:'1px solid #ddd'}} />
                  ) : (
                    d.remarks || '—'
                  )}
                </td>
                <td style={{display:'flex',gap:4,whiteSpace:'nowrap'}}>
                  {editing===i? (
                    <>
                      <button onClick={save} style={{background:'#16a34a',color:'#fff',border:'none',padding:'6px 12px',borderRadius:4,cursor:'pointer',fontSize:'12px'}}>Save</button>
                      <button onClick={cancel} style={{background:'#9ca3af',color:'#fff',border:'none',padding:'6px 12px',borderRadius:4,cursor:'pointer',fontSize:'12px'}}>Cancel</button>
                    </>
                  ) : (
                    <>
                      {currentUser?.role==='staff' ? (
                        <span style={{color:'#94a3b8',fontSize:'12px'}}>View only</span>
                      ) : (
                        <>
                          <button onClick={()=>start(i)} style={{background:'#3b82f6',color:'#fff',border:'none',padding:'6px 12px',borderRadius:4,cursor:'pointer',fontSize:'12px'}}>Edit</button>
                          <button onClick={()=>del(i)} style={{background:'#ef4444',color:'#fff',border:'none',padding:'6px 12px',borderRadius:4,cursor:'pointer',fontSize:'12px'}}>Delete</button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
