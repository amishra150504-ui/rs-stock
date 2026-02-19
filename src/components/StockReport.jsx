import React, { useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function StockReport({ entries, calculateStock, items }) {
  const stock = calculateStock()
  const [lowOnly, setLowOnly] = useState(false)
  const keys = lowOnly ? Object.keys(stock).filter(key => {
    const s = stock[key]; const item = items.find(i=>i.name===key); const bal = (s.inKg - s.outKg); return item && bal < item.minStock
  }) : Object.keys(stock)

  const exportReport = async (format) => {
    const el = document.getElementById('stock-table-export')
    
    // Use optimized canvas rendering
    const canvas = await html2canvas(el, {
      scale: format === 'png' ? 2 : 2.5,
      logging: false,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      windowHeight: el.scrollHeight
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
      <h1>Stock Report</h1>
      <div style={{display:'flex',gap:12,marginTop:16,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <button onClick={() => exportReport('png')} style={{background:'linear-gradient(135deg,#3b82f6,#1e40af)',color:'#fff',border:'none',padding:'10px 16px',borderRadius:10,cursor:'pointer',fontWeight:600,transition:'all .2s'}}>📥 Export PNG (High Quality)</button>
        <button onClick={() => exportReport('pdf')} style={{background:'linear-gradient(135deg,#ef4444,#b91c1c)',color:'#fff',border:'none',padding:'10px 16px',borderRadius:10,cursor:'pointer',fontWeight:600,transition:'all .2s'}}>📄 Export PDF (A4)</button>
        <label style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto',fontSize:'14px',cursor:'pointer'}}><input type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} style={{width:18,height:18,cursor:'pointer'}} /> <span>Show low stock only</span></label>
      </div>
      <div id="stock-table-export" style={{background:'#fff',padding:20,borderRadius:12}}>
        <div style={{marginBottom:16}}>
          <h2 style={{margin:'0 0 8px 0',color:'#0f172a',fontSize:'18px'}}>RS Stock Report</h2>
          <p style={{margin:'0',fontSize:'12px',color:'#64748b'}}>Generated: {new Date().toLocaleString()}</p>
        </div>
        <div className="table-wrap">
          <table className="sheet">
            <thead><tr><th>Item</th><th>In KG</th><th>Out KG</th><th>Balance KG</th><th>Balance PCS</th><th>Status</th></tr></thead>
            <tbody>
              {keys.map((key,i)=>{
                const s = stock[key]; const balKg = s.inKg - s.outKg; const balP = s.inPcs - s.outPcs; const item = items.find(it=>it.name===key); const low = item && balKg < item.minStock
                return (
                  <tr key={i} className="row-anim" style={{animation:'fadeIn .25s ease'}}>
                    <td style={{fontWeight:600}}>{key}</td>
                    <td style={{textAlign:'right'}}>{s.inKg.toFixed(3)}</td>
                    <td style={{textAlign:'right'}}>{s.outKg.toFixed(3)}</td>
                    <td style={{textAlign:'right'}}>{balKg.toFixed(3)}</td>
                    <td style={{textAlign:'right'}}>{balP}</td>
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
