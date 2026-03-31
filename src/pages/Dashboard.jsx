import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ID_EMPRESA = 1 // 👈 cambia esto por el IdEmpresa de tu empresa

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProductos: 0,
    totalClientes: 0,
    discontinuados: 0,
    totalVentas: 0,
  })
  const [topProductos, setTopProductos] = useState([])
  const [ultimasVentas, setUltimasVentas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    setLoading(true)

    const [
      { count: totalProductos },
      { count: totalClientes },
      { count: discontinuados },
      { count: totalVentas },
      { data: productos },
      { data: ventas },
    ] = await Promise.all([
      supabase.from('productos').select('*', { count: 'exact', head: true })
        .eq('idempresa', ID_EMPRESA).eq('discontinuado', false),

      supabase.from('clientes').select('*', { count: 'exact', head: true })
        .eq('idempresa', ID_EMPRESA),

      supabase.from('productos').select('*', { count: 'exact', head: true })
        .eq('idempresa', ID_EMPRESA).eq('discontinuado', true),

      supabase.from('ventas').select('*', { count: 'exact', head: true })
        .eq('idempresa', ID_EMPRESA),

      supabase.from('productos').select('nombre, cantidad')
        .eq('idempresa', ID_EMPRESA).eq('discontinuado', false)
        .order('cantidad', { ascending: false }).limit(5),

      supabase.from('ventas').select('total, fecha, clientes(nombre)')
        .eq('idempresa', ID_EMPRESA)
        .order('fecha', { ascending: false }).limit(4),
    ])

    setStats({
      totalProductos: totalProductos || 0,
      totalClientes:  totalClientes  || 0,
      discontinuados: discontinuados || 0,
      totalVentas:    totalVentas    || 0,
    })
    setTopProductos(productos || [])
    setUltimasVentas(ventas  || [])
    setLoading(false)
  }

  const maxCantidad = topProductos[0]?.cantidad || 1
  const colors = ['#6c63ff', '#ff6584', '#4caf87', '#f5a623', '#60b8e0']

  if (loading) return <div className="loading">Cargando datos...</div>

  return (
    <div>
      <div className="cards-grid">
        <div className="metric-card">
          <div className="metric-label">Productos activos</div>
          <div className="metric-value">{stats.totalProductos}</div>
          <div className="metric-sub neutral">en inventario</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Clientes</div>
          <div className="metric-value">{stats.totalClientes}</div>
          <div className="metric-sub up">registrados</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Ventas</div>
          <div className="metric-value">{stats.totalVentas}</div>
          <div className="metric-sub neutral">total realizadas</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Discontinuados</div>
          <div className="metric-value down">{stats.discontinuados}</div>
          <div className="metric-sub down">fuera de catálogo</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">Productos con más stock</div>
          {topProductos.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>Sin productos aún</div>
          ) : topProductos.map((p, i) => (
            <div className="bar-row" key={i}>
              <span className="bar-label">{p.nombre}</span>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${Math.max(5, (p.cantidad / maxCantidad) * 100)}%` }} />
              </div>
              <span className="bar-val">{p.cantidad}</span>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">Últimas ventas</div>
          <div className="recent-list">
            {ultimasVentas.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: 13 }}>Sin ventas aún</div>
            ) : ultimasVentas.map((v, i) => (
              <div className="recent-item" key={i}>
                <div className="ri-icon" style={{ background: colors[i % colors.length] + '22', color: colors[i % colors.length] }}>
                  🧾
                </div>
                <span className="ri-name">{v.Clientes?.nombre || 'Sin cliente'}</span>
                <span className="ri-val">${parseFloat(v.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}