import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProductos: 0,
    totalClientes: 0,
    stockBajo: 0,
  })
  const [topProductos, setTopProductos] = useState([])
  const [ultimosClientes, setUltimosClientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)

    // Total productos
    const { count: totalProductos } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true })

    // Total clientes
    const { count: totalClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })

    // Stock bajo (menos de 5 unidades)
    const { count: stockBajo } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true })
      .lte('stock', 5)

    // Top productos por stock
    const { data: productos } = await supabase
      .from('productos')
      .select('nombre, stock')
      .order('stock', { ascending: false })
      .limit(5)

    // Últimos clientes
    const { data: clientes } = await supabase
      .from('clientes')
      .select('nombre, email')
      .order('created_at', { ascending: false })
      .limit(4)

    setStats({
      totalProductos: totalProductos || 0,
      totalClientes: totalClientes || 0,
      stockBajo: stockBajo || 0,
    })
    setTopProductos(productos || [])
    setUltimosClientes(clientes || [])
    setLoading(false)
  }

  const maxStock = topProductos[0]?.stock || 1
  const colors = ['#6c63ff', '#ff6584', '#4caf87', '#f5a623', '#60b8e0']

  if (loading) return <div className="loading">Cargando datos...</div>

  return (
    <div>
      {/* Tarjetas métricas */}
      <div className="cards-grid">
        <div className="metric-card">
          <div className="metric-label">Ventas hoy</div>
          <div className="metric-value">$0</div>
          <div className="metric-sub neutral">sin datos aún</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Productos</div>
          <div className="metric-value">{stats.totalProductos}</div>
          <div className="metric-sub neutral">en inventario</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Clientes</div>
          <div className="metric-value">{stats.totalClientes}</div>
          <div className="metric-sub up">registrados</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Stock bajo</div>
          <div className="metric-value down">{stats.stockBajo}</div>
          <div className="metric-sub down">requieren atención</div>
        </div>
      </div>

      {/* Gráficas y listas */}
      <div className="two-col">
        <div className="panel">
          <div className="panel-title">Productos con más stock</div>
          {topProductos.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>Sin datos</div>
          ) : (
            topProductos.map((p, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-label">{p.nombre}</span>
                <div className="bar-bg">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(5, (p.stock / maxStock) * 100)}%` }}
                  />
                </div>
                <span className="bar-val">{p.stock}</span>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <div className="panel-title">Últimos clientes</div>
          <div className="recent-list">
            {ultimosClientes.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: 13 }}>Sin clientes aún</div>
            ) : (
              ultimosClientes.map((c, i) => (
                <div className="recent-item" key={i}>
                  <div
                    className="ri-icon"
                    style={{
                      background: colors[i % colors.length] + '22',
                      color: colors[i % colors.length],
                    }}
                  >
                    👤
                  </div>
                  <span className="ri-name">{c.nombre}</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{c.email}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}