import React from 'react'

export default function Dashboard({ entries, calculateStock, items }) {
  const stock = calculateStock()
  const totalItems = Object.keys(stock).length
  let inKg = 0, outKg = 0
  Object.values(stock).forEach(s => { inKg += s.inKg; outKg += s.outKg })

  return (
    <section className="page">
      <h1>Dashboard</h1>
      <div className="cards">
        <div className="card"> <h3>Total Items</h3> <strong>{totalItems}</strong></div>
        <div className="card"> <h3>Stock In</h3> <strong>{inKg.toFixed(3)} KG</strong></div>
        <div className="card"> <h3>Stock Out</h3> <strong>{outKg.toFixed(3)} KG</strong></div>
      </div>
    </section>
  )
}
